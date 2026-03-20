"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import { useLanguage } from "@/i18n";

function Model() {
  const { scene } = useGLTF("/loading-model.glb");
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={ref}>
      <primitive object={scene} scale={1.5} />
    </group>
  );
}

export default function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="w-64 h-64 sm:w-80 sm:h-80">
        <Canvas
          camera={{ position: [0, 3, 4], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-3, 2, -3]} intensity={0.4} />
          <Suspense fallback={null}>
            <Model />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            enableRotate={false}
          />
        </Canvas>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-dotan-green rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-dotan-green rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-dotan-green rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="text-sm text-gray-500 font-medium">{t.common.loading}</span>
      </div>
    </div>
  );
}

/** Lightweight inline loading — spinning logo + dots, no three.js */
export function InlineLoading() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="relative w-20 h-20">
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-dotan-green animate-spin" />
        {/* Logo in center */}
        <div className="absolute inset-2 rounded-full overflow-hidden bg-white flex items-center justify-center">
          <img src="/dotanLogo.png" alt="" className="w-10 h-10 object-cover" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-dotan-green rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-dotan-green rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-dotan-green rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="text-sm text-gray-400 font-medium">{t.common.loading}</span>
      </div>
    </div>
  );
}

useGLTF.preload("/loading-model.glb");
