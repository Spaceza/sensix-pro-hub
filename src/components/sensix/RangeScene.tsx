import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import soldierAsset from '@/assets/range-soldier.glb.asset.json';
import gunAsset from '@/assets/range-smg.glb.asset.json';
import { bound, responseDelay, rotationGain } from '@/lib/aim-physics';
import type { SceneProps, RangePalette } from './range-types';

function Model({ url, height, armed = false }: { url: string; height: number; armed?: boolean }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const copy = clone(scene);
    const box = new THREE.Box3().setFromObject(copy);
    copy.scale.setScalar(height / Math.max(0.01, box.max.y - box.min.y));
    const scaled = new THREE.Box3().setFromObject(copy);
    const center = scaled.getCenter(new THREE.Vector3());
    copy.position.set(-center.x, -scaled.min.y, -center.z);
    copy.traverse(node => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    if (armed) {
      // Kenney articulated limb pivots: bring both forearms forward into the firing pose.
      const left = copy.getObjectByName('arm-left'), right = copy.getObjectByName('arm-right');
      if (left) left.rotation.x = -1.1;
      if (right) right.rotation.x = -1.1;
    }
    return copy;
  }, [scene, height, armed]);
  return <primitive object={object} />;
}

function Room({ p }: { p: RangePalette }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = p.floor; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = p.metal; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 254, 254);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 ? p.wall : p.metal; ctx.globalAlpha = 0.12;
        ctx.fillRect((i * 47) % 256, (i * 97) % 256, 1, 2);
      }
    }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 15); return tex;
  }, [p]);
  const sign = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = p.wall; ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = p.light; ctx.font = 'bold 95px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SENSIX / RANGE 01', 512, 120);
      ctx.fillStyle = p.accent; ctx.font = '30px monospace'; ctx.fillText('BIOMECHANICAL TRAINING DIVISION', 512, 188);
    }
    return new THREE.CanvasTexture(canvas);
  }, [p]);
  useEffect(() => () => { texture.dispose(); sign.dispose(); }, [texture, sign]);
  return <>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[20, 32]} /><meshStandardMaterial map={texture} roughness={0.8} metalness={0.2} /></mesh>
    <mesh position={[0, 3.5, -15]} receiveShadow><boxGeometry args={[20, 7, 0.25]} /><meshStandardMaterial map={texture} color={p.wall} roughness={0.8} /></mesh>
    {[-10, 10].map(x => <mesh key={x} position={[x, 3.5, 0]} receiveShadow><boxGeometry args={[0.25, 7, 32]} /><meshStandardMaterial map={texture} color={p.ceiling} roughness={0.7} /></mesh>)}
    <mesh position={[0, 7, 0]}><boxGeometry args={[20, 0.2, 32]} /><meshStandardMaterial color={p.ceiling} /></mesh>
    <mesh position={[0, 4.3, -14.82]}><planeGeometry args={[7, 1.75]} /><meshBasicMaterial map={sign} /></mesh>
    {[-6, 0, 6].map(x => <group key={x}>
      <mesh position={[x, 6.85, -3]} rotation-x={Math.PI / 2}><planeGeometry args={[0.22, 22]} /><meshBasicMaterial color={p.light} /></mesh>
      <mesh position={[x, 0.015, -4]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.035, 23]} /><meshBasicMaterial color={p.accent} /></mesh>
    </group>)}
    {[-9.7, 9.7].flatMap(x => [-10, -4, 2].map(z => <group key={`${x}${z}`}>
      <mesh position={[x, 3, z]}><boxGeometry args={[0.35, 6, 0.4]} /><meshStandardMaterial color={p.metal} metalness={0.75} roughness={0.45} /></mesh>
      <mesh position={[x * 0.998, 3, z + 0.21]}><boxGeometry args={[0.1, 3, 0.015]} /><meshBasicMaterial color={p.accent} /></mesh>
    </group>))}
    {[-3, 0, 3].map(x => <mesh key={x} position={[x, 0.06, x === 0 ? -8 : -11]}><cylinderGeometry args={[0.75, 0.8, 0.12, 24]} /><meshStandardMaterial color={p.metal} roughness={0.5} metalness={0.7} /></mesh>)}
  </>;
}

export function RangeScene({ runtime, config, palette: p, onSnapshot, onShot }: SceneProps) {
  const targets = useRef<THREE.Group>(null), player = useRef<THREE.Group>(null), muzzle = useRef<THREE.Mesh>(null);
  const trace = useRef<THREE.LineSegments>(null);
  const tools = useMemo(() => ({ ray: new THREE.Raycaster(), center: new THREE.Vector2(),
    bullet: new THREE.Vector2(), direction: new THREE.Vector3(), point: new THREE.Vector3(),
    chest: new THREE.Vector3(), muzzle: new THREE.Vector3(),
    traces: new Float32Array(12 * 6), ages: new Float32Array(12), hitboxes: [] as THREE.Object3D[],
    index: 0, lastShot: 0, lastHud: 0, damage: 0, reset: -1 }), []);
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
    if (tools.reset !== r.reset) { tools.reset = r.reset; tools.lastShot = 0; tools.damage = 0; tools.ages.fill(0); }
    if (targets.current) {
      targets.current.position.x = c.strafe ? Math.sin(clock.elapsedTime * 0.8) * 0.7 : 0;
      targets.current.updateWorldMatrix(true, true);
    }
    camera.position.set(0.65, 1.8, 4.7); camera.rotation.order = 'YXZ';
    camera.rotation.set(r.pitch, r.yaw, 0); camera.updateMatrixWorld();
    tools.ray.setFromCamera(tools.center, camera);
    const aimHit = tools.ray.intersectObjects(tools.hitboxes, false)[0];
    const lock = aimHit?.object.userData['hitbox'] === 'body';
    const delay = responseDelay(c), gain = rotationGain(c);
    while (r.queue.length && (r.queue[0]?.at ?? now) + delay <= now) {
      const input = r.queue.shift(); if (!input) break;
      r.speed = input.speed;
      const friction = lock && input.speed < 0.7 ? 0.16 : 1;
      r.yaw -= input.dx * gain * (c.stretched ? 1.28 : 1) * friction;
      r.pitch -= input.dy * gain * (1 + Math.min(0.45, input.speed * 0.2)) * (c.stretched ? 0.88 : 1) * friction;
    }
    if (lock && r.held && r.speed < 0.7 && aimHit) {
      aimHit.object.getWorldPosition(tools.chest);
      const yaw = Math.atan2(camera.position.x - tools.chest.x, camera.position.z - tools.chest.z);
      const pitch = Math.atan2(tools.chest.y - camera.position.y, Math.hypot(tools.chest.x - camera.position.x, tools.chest.z - camera.position.z));
      const magnet = 1 - Math.exp(-3.2 * dt);
      r.yaw += (yaw - r.yaw) * magnet; r.pitch += (pitch - r.pitch) * magnet;
    }
    r.yaw = bound(r.yaw, -0.65, 0.65); r.pitch = bound(r.pitch, -0.45, 0.5);
    camera.rotation.set(r.pitch, r.yaw, 0); camera.updateMatrixWorld();
    if (player.current) player.current.rotation.y = Math.PI + r.yaw;
    if (r.held && aimHit?.object.userData['hitbox'] === 'head') r.trial.dwell += dt * 1000;
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
        r.hits.push({ x: hit.point.x - tools.point.x, y: hit.point.y + (head ? 0 : 0), head });
        if (r.hits.length > 100) r.hits.shift();
      } else {
        r.trial.miss++; tools.damage = 0;
        tools.ray.ray.at(11.7, tools.point);
        if (tools.point.y > 1.95) r.trial.overshoot++;
      }
      if (hit) tools.point.copy(hit.point);
      tools.ray.ray.at(hit?.distance ?? 16, tools.point);
      const start = muzzle.current?.getWorldPosition(tools.muzzle) ?? tools.muzzle.set(0.32, 1.15, 1.5);
      const offset = tools.index * 6;
      tools.traces.set([start.x, start.y, start.z, tools.point.x, tools.point.y, tools.point.z], offset);
      tools.ages[tools.index] = 0.13; tools.index = (tools.index + 1) % 12;
      r.pitch += c.stock ? 0.0006 : 0.0011;
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
  return <>
    <color attach="background" args={[p.wall]} />
    <fog attach="fog" args={[p.wall, 22, 42]} />
    <ambientLight intensity={0.65} />
    <hemisphereLight args={[p.light, p.floor, 1.1]} />
    <directionalLight position={[3, 6, 4]} intensity={2.4} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-15} />
    <Environment resolution={128}><Lightformer intensity={2} position={[0, 6, -4]} rotation-x={Math.PI / 2} scale={[12, 20, 1]} /><Lightformer intensity={1} color={p.accent} position={[-8, 3, -4]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} /></Environment>
    <Room p={p} />
    <group ref={player} position={[0, 0, 2.1]} rotation-y={Math.PI}>
      <Suspense fallback={null}><Model url={soldierAsset.url} height={1.75} armed />
        <group position={[-0.26, 1.08, 0.45]} rotation-x={Math.PI / 2}><Model url={gunAsset.url} height={0.24} /></group>
      </Suspense>
      <mesh ref={muzzle} position={[-0.26, 1.14, 0.78]}><sphereGeometry args={[0.045, 6, 6]} /><meshBasicMaterial color={p.accent} /></mesh>
    </group>
    <group ref={targets}>
      {[-3, 0, 3].map(x => <group key={x} position={[x, 0.12, x === 0 ? -8 : -11]}>
        <Suspense fallback={null}><Model url={soldierAsset.url} height={1.9} /></Suspense>
        <mesh position={[0, 0.85, 0]} userData={{ hitbox: 'body' }}><boxGeometry args={[0.65, 0.78, 0.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
        <mesh position={[0, 1.55, 0]} userData={{ hitbox: 'head' }}><sphereGeometry args={[0.3, 12, 10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
        <mesh position={[0, 1.55, 0.32]}><ringGeometry args={[0.29, 0.302, 24]} /><meshBasicMaterial color={p.critical} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.9, 0.3]}><ringGeometry args={[0.13, 0.145, 20]} /><meshBasicMaterial color={p.accent} side={THREE.DoubleSide} /></mesh>
      </group>)}
    </group>
    <lineSegments ref={trace} geometry={geometry} frustumCulled={false}><lineBasicMaterial color={p.accent} transparent opacity={0.8} /></lineSegments>
  </>;
}