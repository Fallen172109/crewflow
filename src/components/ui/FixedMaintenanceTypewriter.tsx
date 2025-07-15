'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface FixedMaintenanceTypewriterProps {
  onComplete?: () => void;
  typingSpeed?: number;
}

export default function FixedMaintenanceTypewriter({
  onComplete,
  typingSpeed = 60
}: FixedMaintenanceTypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const hasStarted = useRef(false);

  // The exact text we want to display
  const fullText = "We are under development";
  
  useEffect(() => {
    // Prevent multiple animations
    if (hasStarted.current) return;
    hasStarted.current = true;
    
    let currentIndex = 0;
    setDisplayedText('');
    setIsTypingComplete(false);
    
    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTypingComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, typingSpeed);
    
    return () => clearInterval(typingInterval);
  }, []);

  // Render the text - simplified to single color to avoid spacing issues
  const renderText = () => {
    return <span style={{ color: 'white' }}>{displayedText}</span>;
  };

  return (
    <div className="flex items-center justify-center">
      <div 
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold whitespace-nowrap"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {renderText()}
        {!isTypingComplete && (
          <motion.div
            className="inline-block ml-1 rounded-sm w-[4px] h-6 sm:h-8 md:h-10 lg:h-12 bg-white"
            animate={{ opacity: [1, 0, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>
    </div>
  );
}
