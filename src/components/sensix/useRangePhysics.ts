import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bound, responseDelay, rotationGain } from '@/lib/aim-physics';
import { RANGE_CAMERA, type SceneProps } from './range-types';

export const useRangePhysics = ({ runtime, config, onSnapshot, onShot }: SceneProps) => {
  const targets = useRef<THREE.Group>(null), player = useRef<THREE.Group>(null), muzzle = useRef<THREE.Mesh>(null);
  const tools = useMemo(() => ({ ray: new THREE.Raycaster(), center: new THREE.Vector2(),
    bullet: new THREE.Vector2(), point: new THREE.Vector3(),
    chest: new THREE.Vector3(), muzzle: new THREE.Vector3(),
    traces: new Float32Array(12 * 6), ages: new Float32Array(12), hitboxes: [] as THREE.Object3D[],
    index: 0, lastShot: 0, lastHud: 0, damage: 0, reset: -1, breakUntil: 0 }), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(tools.traces, 3)); return g;
  }, [tools]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const group = targets.current;
    if (!group) return;
    group.traverse(o => { if (o.userData['hitbox']) tools.hitboxes.push(o); });
    return () => { tools.hitboxes.length = 0; };
  }, [tools]);
  useFrame(({ camera, clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05), r = runtime.current, c = config.current;
    const now = performance.now();
    if (tools.reset !== r.reset) { tools.reset = r.reset; tools.lastShot = 0; tools.damage = 0; tools.breakUntil = 0; tools.ages.fill(0); tools.traces.fill(0); }
    if (targets.current) {
      targets.current.position.x = c.strafe ? Math.sin(clock.elapsedTime * 0.8) * 0.7 : 0;
      targets.current.updateWorldMatrix(true, true);
    }
    camera.position.set(...RANGE_CAMERA.position); camera.rotation.order = 'YXZ';
    camera.rotation.set(r.pitch, r.yaw, 0); camera.updateMatrixWorld();
    tools.ray.setFromCamera(tools.center, camera);
    const aimHit = tools.ray.intersectObjects(tools.hitboxes, false)[0];
    const torso = aimHit?.object.userData['hitbox'] === 'body';
    const delay = responseDelay(c), gain = rotationGain(c);
    while (r.queue.length && (r.queue[0]?.at ?? now) + delay <= now) {
      const input = r.queue.shift(); if (!input) break;
      r.speed = input.speed;
      const verticalSpeed = input.speed * Math.abs(input.dy) / Math.max(0.001, Math.hypot(input.dx, input.dy));
       if (input.dy < 0 && verticalSpeed >= 0.7) tools.breakUntil = now + 180;
       const friction = torso && now >= tools.breakUntil ? 0.16 : 1;
      r.yaw -= input.dx * gain * (c.stretched ? 1.28 : 1) * friction;
      r.pitch -= input.dy * gain * (1 + Math.min(0.45, input.speed * 0.2)) * (c.stretched ? 0.88 : 1) * friction;
    }
    if (torso && r.held && gain > 0 && now >= tools.breakUntil && aimHit) {
      aimHit.object.getWorldPosition(tools.chest);
      const yaw = Math.atan2(camera.position.x - tools.chest.x, camera.position.z - tools.chest.z);
      const pitch = Math.atan2(tools.chest.y - camera.position.y, Math.hypot(tools.chest.x - camera.position.x, tools.chest.z - camera.position.z));
      const magnet = 1 - Math.exp(-3.2 * dt);
      r.yaw += (yaw - r.yaw) * magnet; r.pitch += (pitch - r.pitch) * magnet;
    }
    r.yaw = bound(r.yaw, -0.65, 0.65); r.pitch = bound(r.pitch, -0.45, 0.5);
    camera.rotation.set(r.pitch, r.yaw, 0); camera.updateMatrixWorld();
    if (player.current) player.current.rotation.y = Math.PI + r.yaw;
    tools.ray.setFromCamera(tools.center, camera);
    const currentHit = tools.ray.intersectObjects(tools.hitboxes, false)[0];
    const lock = currentHit?.object.userData['hitbox'] === 'body' && now >= tools.breakUntil;
    if (r.held && currentHit?.object.userData['hitbox'] === 'head') r.trial.dwell += dt * 1000;
    r.speed *= Math.exp(-5 * dt);
    r.bloom = r.held ? Math.min(c.stock ? 0.009 : 0.019, r.bloom + dt * 0.005) : r.bloom * Math.exp(-7 * dt);
    if (r.held && now - tools.lastShot >= 98) {
      tools.lastShot = now;
      tools.bullet.set((Math.random() - 0.5) * r.bloom, (Math.random() - 0.5) * r.bloom);
      tools.ray.setFromCamera(tools.bullet, camera);
      const hit = tools.ray.intersectObjects(tools.hitboxes, false)[0];
      const head = hit?.object.userData['hitbox'] === 'head';
      if (hit) {
        if (head) r.trial.head++; else r.trial.body++;
        tools.damage = head ? 137 : 24;
        hit.object.getWorldPosition(tools.point);
        r.hits.push({ x: hit.point.x - tools.point.x, y: hit.point.y, head });
        if (r.hits.length > 100) r.hits.shift();
      } else {
        r.trial.miss++; tools.damage = 0;
        tools.ray.ray.at(11.7, tools.point);
        if (tools.point.y > 1.95) r.trial.overshoot++;
      }
      tools.ray.ray.at(hit?.distance ?? 16, tools.point);
      const start = muzzle.current?.getWorldPosition(tools.muzzle) ?? tools.muzzle.set(0.32, 1.15, 1.5);
      const offset = tools.index * 6;
      tools.traces.set([start.x, start.y, start.z, tools.point.x, tools.point.y, tools.point.z], offset);
      tools.ages[tools.index] = 0.13; tools.index = (tools.index + 1) % 12;
      onShot(head);
    }
    for (let i = 0; i < 12; i++) {
      tools.ages[i] = Math.max(0, (tools.ages[i] ?? 0) - dt);
      if (tools.ages[i] === 0) tools.traces.fill(0, i * 6, i * 6 + 6);
    }
    const attr = geometry.getAttribute('position'); attr.needsUpdate = true;
    if (muzzle.current) muzzle.current.visible = r.held && now - tools.lastShot < 35;
    if (now - tools.lastHud > 120) {
      tools.lastHud = now;
      onSnapshot({ shots: r.trial.head + r.trial.body + r.trial.miss, head: r.trial.head, body: r.trial.body,
        lock, bloom: r.bloom, speed: r.speed, damage: tools.damage });
    }
  });
  return { targets, player, muzzle, geometry };
};
