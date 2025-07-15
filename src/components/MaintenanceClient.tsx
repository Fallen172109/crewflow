'use client';

import TypewriterEffectSmoothDemo from './ui/typewriter-effect-demo-1';
import { Particles } from './ui/particles';

export default function MaintenanceClient() {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Orange particles background */}
      <Particles
        className="absolute inset-0"
        quantity={150}
        ease={80}
        color="#FF6A3D"
        size={1.2}
        staticity={60}
        refresh
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <TypewriterEffectSmoothDemo />
      </div>
    </main>
  );
}
