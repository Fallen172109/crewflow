'use client';

import React from 'react';

export default function AnimatedBoat() {
  return (
    <div className="relative w-full h-64 md:h-96 overflow-hidden">
      {/* Ocean Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-600"></div>
      
      {/* Waves - Three layers with different speeds */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Fast wave */}
        <div className="absolute bottom-0 w-[200%] h-16 animate-waveFast">
          <svg className="w-full h-full" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path 
              d="M0,0 C100,25 200,50 300,25 C400,0 500,25 600,50 C700,25 800,0 900,25 C1000,50 1100,25 1200,0 V60 H0 Z" 
              fill="#1d4ed8" 
              opacity="0.3"
            />
          </svg>
        </div>
        
        {/* Medium wave */}
        <div className="absolute bottom-0 w-[200%] h-12 animate-waveMedium">
          <svg className="w-full h-full" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path 
              d="M0,30 C100,10 200,40 300,30 C400,20 500,40 600,30 C700,20 800,40 900,30 C1000,20 1100,40 1200,30 V60 H0 Z" 
              fill="#2563eb" 
              opacity="0.5"
            />
          </svg>
        </div>
        
        {/* Slow wave */}
        <div className="absolute bottom-0 w-[200%] h-8 animate-waveSlow">
          <svg className="w-full h-full" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path 
              d="M0,40 C100,50 200,30 300,40 C400,50 500,30 600,40 C700,50 800,30 900,40 C1000,50 1100,30 1200,40 V60 H0 Z" 
              fill="#3b82f6" 
              opacity="0.7"
            />
          </svg>
        </div>
      </div>
      
      {/* Boat */}
      <div className="absolute left-1/2 bottom-16 -translate-x-1/2 animate-boatFloatSynced">
        <svg width="120" height="80" viewBox="0 0 120 80" className="drop-shadow-lg">
          {/* Boat Hull */}
          <path 
            d="M10,60 L110,60 L90,40 L30,40 Z" 
            fill="#000000" 
            stroke="#000000" 
            strokeWidth="2"
          />
          
          {/* Mast */}
          <line 
            x1="60" 
            y1="10" 
            x2="60" 
            y2="40" 
            stroke="#000000" 
            strokeWidth="3"
          />
          
          {/* Sail */}
          <path 
            d="M60,10 L85,25 L60,35 Z" 
            fill="#FF6A3D" 
            stroke="#FF6A3D"
          />
          
          {/* Flag */}
          <path 
            d="M60,10 L70,5 L60,15" 
            fill="#FF6A3D" 
            stroke="#FF6A3D"
          />
        </svg>
      </div>
      
      {/* Sun */}
      <div className="absolute top-8 right-16">
        <div className="w-16 h-16 rounded-full bg-yellow-300 animate-pulse shadow-lg shadow-yellow-300/50"></div>
      </div>
      
      {/* Birds */}
      <div className="absolute top-16 left-1/4">
        <svg width="40" height="20" viewBox="0 0 40 20">
          <path 
            d="M0,10 C5,5 10,0 15,5 C20,10 25,5 30,0 C35,5 40,10 35,15" 
            fill="none" 
            stroke="#000000" 
            strokeWidth="1"
          />
        </svg>
      </div>
      <div className="absolute top-24 left-1/3">
        <svg width="30" height="15" viewBox="0 0 30 15">
          <path 
            d="M0,7.5 C3.75,3.75 7.5,0 11.25,3.75 C15,7.5 18.75,3.75 22.5,0 C26.25,3.75 30,7.5 26.25,11.25" 
            fill="none" 
            stroke="#000000" 
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}
