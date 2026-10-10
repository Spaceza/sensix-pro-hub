import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/** A single scoped scroll clock; native touch and reduced-motion stay untouched. */
export function useKineticInterface(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 0.85, anchors: true, prevent: node => !!node.closest('[data-lenis-prevent]') });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(tick);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.spatial-band').forEach(el => {
        gsap.fromTo(el, { opacity: 0.25, y: 45, rotationX: 3, scale: 0.98 }, {
          opacity: 1, y: 0, rotationX: 0, scale: 1, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 64%', scrub: 0.4 },
        });
      });
      gsap.to('.kinetic-title', { y: -28, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: '+=550', scrub: 0.5 } });
    }, root);
    const pointer = (e: PointerEvent) => {
      const title = root.querySelector<HTMLElement>('.kinetic-title');
      if (!title || e.pointerType !== 'mouse') return;
      const box = title.getBoundingClientRect();
      title.style.setProperty('--kinetic-x', `${(e.clientX - box.left - box.width / 2) * 0.007}px`);
    };
    root.addEventListener('pointermove', pointer);
    return () => { root.removeEventListener('pointermove', pointer); ctx.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, [rootRef]);
}