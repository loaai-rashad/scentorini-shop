// The 3D bottle scene for the homepage hero. Loaded lazily (React.lazy) so three.js
// is only downloaded when the 3D hero is switched on.
//
// The bottle is modelled from Scentorini's 50 ml bottle: squarish glass with rounded
// edges and a thick base, a short neck and a matte white ball cap, a cream front label
// and the blue floral side label, standing on a grey pebble like the product photos.

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor, PresentationControls, RoundedBox, Sparkles } from "@react-three/drei";
import { HERO_SCENTS } from "./heroScents";
import { drawFrontLabel, drawSideLabel, drawStone, loadLabelFonts, loadLogo } from "./labelTextures";

// Bottle proportions (body width = 1), taken from the product photos.
const W = 1.0; // body width
const D = 0.62; // body depth
const H = 1.36; // body height
const R = 0.09; // edge radius
const BASE = 0.24; // solid glass at the bottom
const NECK_R = 0.17;
const NECK_H = 0.09;
const CAP_R = 0.33;
const LABEL_H = 0.62;
const LABEL_Y = 0.05; // label centre, slightly above the body centre
const SPIN_MS = 1100;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Soft radial glow behind the bottle, tinted per scent.
function useGlowTexture() {
  return useMemo(() => {
    const s = 256;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);
}

// Clear glass: see-through with studio reflections. (A refraction/"transmission"
// material looked milky in testing and costs a lot on phones, so it isn't used.)
function Glass(props) {
  return (
    <meshPhysicalMaterial
      transparent
      opacity={0.16}
      roughness={0.02}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.02}
      color="#f2f7fb"
      envMapIntensity={2.4}
      specularIntensity={1}
      depthWrite={false}
      {...props}
    />
  );
}

function Bottle({ scentIndex, textures, reducedMotion }) {
  const group = useRef();
  const [shown, setShown] = useState(scentIndex);
  const spin = useRef({ active: false });

  // Changing scent: one full turn, swapping the label while its back faces the camera.
  useEffect(() => {
    if (scentIndex === shown && !spin.current.active) return;
    spin.current = { active: true, start: performance.now(), next: scentIndex, swapped: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scentIndex]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const idle = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.35) * 0.42;
    let turn = 0;
    const s = spin.current;
    if (s.active) {
      const p = Math.min(1, (performance.now() - s.start) / (reducedMotion ? 1 : SPIN_MS));
      turn = easeInOut(p) * Math.PI * 2;
      if (p >= 0.5 && !s.swapped) {
        s.swapped = true;
        setShown(s.next);
      }
      if (p >= 1) s.active = false;
    }
    group.current.rotation.y = idle + turn;
    if (!reducedMotion) group.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.025;
  });

  const scent = HERO_SCENTS[shown];
  const front = textures?.front[shown];
  const top = H / 2;

  return (
    <group ref={group}>
      {/* Inner walls: a faint darker tint, like the edges of thick glass */}
      <RoundedBox args={[W, H, D]} radius={R} smoothness={6} renderOrder={1}>
        <meshBasicMaterial color="#9fb1bd" transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} />
      </RoundedBox>

      {/* Thick glass base */}
      <RoundedBox args={[W - 0.03, BASE, D - 0.03]} radius={R * 0.8} smoothness={4} position={[0, -H / 2 + BASE / 2 + 0.015, 0]} renderOrder={2}>
        <meshPhysicalMaterial transparent opacity={0.28} color="#e6eef3" roughness={0.03} clearcoat={1} envMapIntensity={2} depthWrite={false} />
      </RoundedBox>

      {/* Perfume inside, above the base */}
      <RoundedBox args={[W - 0.14, H - BASE - 0.16, D - 0.14]} radius={R * 0.7} smoothness={4} position={[0, (BASE - 0.16) / 2 + 0.02, 0]} renderOrder={2}>
        <meshPhysicalMaterial transparent opacity={0.12} color={scent.liquid} roughness={0.08} envMapIntensity={1} depthWrite={false} />
      </RoundedBox>

      {/* Glass body (outer surface, drawn last so its reflections sit on top) */}
      <RoundedBox args={[W, H, D]} radius={R} smoothness={6} renderOrder={3}>
        <Glass />
      </RoundedBox>

      {/* Neck */}
      <mesh position={[0, top + NECK_H / 2, 0]} renderOrder={3}>
        <cylinderGeometry args={[NECK_R, NECK_R * 1.08, NECK_H, 40]} />
        <Glass opacity={0.3} />
      </mesh>

      {/* Matte white ball cap */}
      <mesh position={[0, top + NECK_H + CAP_R * 0.86, 0]} castShadow>
        <sphereGeometry args={[CAP_R, 64, 48]} />
        <meshStandardMaterial color="#f1f1ee" roughness={0.62} metalness={0} envMapIntensity={0.9} />
      </mesh>

      {/* Front label (+ plain back so the glass shows paper from behind) */}
      <mesh position={[0, LABEL_Y, D / 2 + 0.004]}>
        <planeGeometry args={[W - 2 * R + 0.03, LABEL_H]} />
        {front ? <meshStandardMaterial key={front.uuid} map={front} roughness={0.85} /> : <meshStandardMaterial key="plain" color="#f4efdf" roughness={0.85} />}
      </mesh>
      <mesh position={[0, LABEL_Y, D / 2 + 0.002]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W - 2 * R + 0.03, LABEL_H]} />
        <meshStandardMaterial color="#efe9d6" roughness={0.9} />
      </mesh>

      {/* Floral side labels */}
      {[1, -1].map((side) => (
        <mesh key={side} position={[side * (W / 2 + 0.004), LABEL_Y, 0]} rotation={[0, (side * Math.PI) / 2, 0]}>
          <planeGeometry args={[D - 2 * R + 0.03, LABEL_H]} />
          {textures ? <meshStandardMaterial key={textures.side.uuid} map={textures.side} roughness={0.85} /> : <meshStandardMaterial key="plain" color="#f4efdf" roughness={0.85} />}
        </mesh>
      ))}
    </group>
  );
}

function Pebble({ texture }) {
  return (
    <mesh position={[0, -H / 2 - 0.12, 0]} scale={[1.08, 0.16, 0.8]} receiveShadow castShadow>
      <sphereGeometry args={[1, 64, 32]} />
      {texture ? (
        <meshStandardMaterial key={texture.uuid} map={texture} roughness={0.92} metalness={0} />
      ) : (
        <meshStandardMaterial key="plain" color="#5d6066" roughness={0.92} metalness={0} />
      )}
    </mesh>
  );
}

// Pull the camera back on tall/narrow (phone) canvases so the whole bottle fits.
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.set(0, 0.35, aspect < 0.75 ? 6.2 : aspect < 1.1 ? 5.3 : 4.7);
    camera.lookAt(0, 0.1, 0);
  }, [camera, size]);
  return null;
}

function GlowBackdrop({ color }) {
  const tex = useGlowTexture();
  const mat = useRef();
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame(() => mat.current && mat.current.color.lerp(target, 0.05));
  return (
    <mesh position={[0, 0.35, -2.2]}>
      <planeGeometry args={[3.4, 3.4]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0.55} depthWrite={false} color={color} />
    </mesh>
  );
}

export default function BottleScene({ scentIndex, active = true, reducedMotion = false, initialQuality = "high", lockQuality = false, onReady }) {
  const [quality, setQuality] = useState(initialQuality);
  const [textures, setTextures] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let created = null;
    Promise.all([loadLabelFonts(), loadLogo()]).then(([, logo]) => {
      if (cancelled) return;
      created = {
        front: HERO_SCENTS.map((s) => canvasTexture(drawFrontLabel(s, logo))),
        side: canvasTexture(drawSideLabel()),
        stone: canvasTexture(drawStone()),
      };
      setTextures(created);
      // On a slow connection the label may have been drawn with fallback fonts:
      // redraw it in place once the real fonts finish loading.
      document.fonts?.ready?.then(() => {
        if (cancelled) return;
        created.front.forEach((t, i) => {
          t.image = drawFrontLabel(HERO_SCENTS[i], logo);
          t.needsUpdate = true;
        });
      });
    });
    return () => {
      cancelled = true;
      if (created) {
        created.front.forEach((t) => t.dispose());
        created.side.dispose();
        created.stone.dispose();
      }
    };
  }, []);

  const scent = HERO_SCENTS[scentIndex];

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, quality === "high" ? 1.75 : 1.25]}
      camera={{ position: [0, 0.35, 4.7], fov: 32 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      shadows={false}
      onCreated={() => onReady?.()}
    >
      <color attach="background" args={["#e8e8ea"]} />
      {!lockQuality && <PerformanceMonitor onDecline={() => setQuality("low")} />}
      <ResponsiveCamera />

      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <pointLight position={[0, 0.6, -1.6]} intensity={6} distance={5} color={scent.glow} />

      {/* Studio reflections, generated locally (no image downloads) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 2]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-4, 1, 1.5]} rotation-y={Math.PI / 2} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[4, 1, 1.5]} rotation-y={-Math.PI / 2} scale={[3, 5, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#bcd0ff" position={[0, 1, -4]} scale={3} />
      </Environment>

      <GlowBackdrop color={scent.glow} />

      <group position={[0, -0.12, 0]}>
        <PresentationControls
          global={false}
          cursor
          snap
          speed={1.6}
          zoom={1}
          rotation={[0, 0, 0]}
          polar={[-0.15, 0.25]}
          azimuth={[-Infinity, Infinity]}
          config={{ mass: 1, tension: 170, friction: 24 }}
        >
          <Bottle scentIndex={scentIndex} textures={textures} reducedMotion={reducedMotion} />
        </PresentationControls>
        <Pebble texture={textures?.stone} />
        <ContactShadows position={[0, -H / 2 - 0.27, 0]} opacity={0.4} scale={4} blur={2.6} far={1.2} frames={1} />
      </group>

      {!reducedMotion && <Sparkles count={36} scale={[4.5, 3, 2]} position={[0, 0.5, -0.5]} size={2.2} speed={0.25} opacity={0.65} color="#ffffff" />}
    </Canvas>
  );
}
