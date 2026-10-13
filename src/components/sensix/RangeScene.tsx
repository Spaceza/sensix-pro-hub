import { memo, useEffect, useMemo } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { useRangePhysics } from './useRangePhysics';
import type { SceneProps, RangePalette } from './range-types';

const CyberStickman = ({ p, target = false }: { p: RangePalette; target?: boolean }) => <>
  <mesh position={[0, 0.85, 0]} userData={target ? { hitbox: 'body' } : {}} castShadow receiveShadow>
    <cylinderGeometry args={[0.29, 0.24, 0.78, 8]} />
    <meshStandardMaterial color={p.metal} metalness={0.85} roughness={0.3} flatShading />
  </mesh>
  <mesh position={[0, 1.55, 0]} userData={target ? { hitbox: 'head' } : {}} castShadow>
    <sphereGeometry args={[0.27, 12, 8]} />
    <meshStandardMaterial color={p.critical} emissive={p.critical} emissiveIntensity={0.35} roughness={0.4} flatShading />
  </mesh>
  {[-1, 1].map(side => <group key={side}>
    <mesh position={[side * 0.15, 0.23, 0]} castShadow><cylinderGeometry args={[0.065, 0.08, 0.46, 6]} /><meshStandardMaterial color={p.metal} metalness={0.7} roughness={0.4} /></mesh>
    <mesh position={[side * 0.38, 0.92, target ? 0 : -0.15]} rotation-x={target ? 0 : -0.9} rotation-z={side * 0.22} castShadow><cylinderGeometry args={[0.055, 0.065, 0.55, 6]} /><meshStandardMaterial color={p.metal} metalness={0.7} roughness={0.4} /></mesh>
  </group>)}
</>;

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

export const RangeScene = memo(({ runtime, config, palette: p, onSnapshot, onShot }: SceneProps) => {
  const { targets, player, muzzle, geometry } = useRangePhysics({ runtime, config, palette: p, onSnapshot, onShot });
  return <>
    <color attach="background" args={[p.wall]} />
    <fog attach="fog" args={[p.wall, 22, 42]} />
    <ambientLight intensity={0.65} />
    <hemisphereLight args={[p.light, p.floor, 1.1]} />
    <directionalLight position={[3, 6, 4]} intensity={2.4} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-15} />
    <Environment resolution={128}><Lightformer intensity={2} position={[0, 6, -4]} rotation-x={Math.PI / 2} scale={[12, 20, 1]} /><Lightformer intensity={1} color={p.accent} position={[-8, 3, -4]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} /></Environment>
    <Room p={p} />
    <group ref={player} position={[0, 0, 2.1]} rotation-y={Math.PI}>
      <CyberStickman p={p} />
      <mesh ref={muzzle} position={[-0.38, 1.08, 0.38]}><sphereGeometry args={[0.045, 6, 6]} /><meshBasicMaterial color={p.accent} /></mesh>
    </group>
    <group ref={targets}>
      {[-3, 0, 3].map(x => <group key={x} position={[x, 0.12, x === 0 ? -8 : -11]}>
        <CyberStickman p={p} target />
      </group>)}
    </group>
    <lineSegments geometry={geometry} frustumCulled={false}><lineBasicMaterial color={p.accent} transparent opacity={0.8} /></lineSegments>
  </>;
});