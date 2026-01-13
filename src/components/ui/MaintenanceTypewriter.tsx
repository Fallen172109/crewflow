'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MaintenanceTypewriterProps {
  text: string;
  typingSpeed?: number;
  cursorColor?: string;
  textColor?: string;
  highlightWord?: string;
  highlightColor?: string;
  onComplete?: () => void;
}

export default function MaintenanceTypewriter({
  text,
  typingSpeed = 80,
  cursorColor = 'white',
  textColor = 'white',
  highlightWord = 'development',
  highlightColor = '#5BBF46',
  onComplete
}: MaintenanceTypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    // Prevent multiple animations
    if (hasStarted.current) return;
    hasStarted.current = true;

    let currentIndex = 0;
    setDisplayedText('');
    setIsTypingComplete(false);

    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
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
  }, []); // Remove dependencies to prevent re-runs

  // Render the text with highlighted word during typing
  const renderText = () => {
    // Manual character-by-character approach to ensure space is preserved
    const chars = displayedText.split('');
    const result = [];

    // Characters 0-13: "We are under " (white)
    // Characters 14+: "development" (green)

    for (let i = 0; i < chars.length; i++) {
      if (i < 14) {
        // White part: "We are under "
        result.push(
          <span key={i} style={{ color: textColor }}>
            {chars[i]}
          </span>
        );
      } else {
        // Green part: "development"
        result.push(
          <span key={i} style={{ color: highlightColor }}>
            {chars[i]}
          </span>
        );
      }
    }

    return <>{result}</>;
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
            className="inline-block ml-1 rounded-sm w-[4px] h-6 sm:h-8 md:h-10 lg:h-12"
            style={{ backgroundColor: cursorColor }}
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
