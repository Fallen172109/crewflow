'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TypewriterButtonProps {
  text: string;
  typingSpeed?: number;
  cursorColor?: string;
  textColor?: string;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  delay?: number;
}

export default function TypewriterButton({
  text,
  typingSpeed = 80,
  cursorColor = 'white',
  textColor = 'white',
  className = '',
  onClick,
  type = 'button',
  delay = 0
}: TypewriterButtonProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [shouldStart, setShouldStart] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const hasStarted = useRef(false);

  // Start typing when component mounts (for when it's conditionally rendered)
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startDelay = delay || 0;
    const startTimer = setTimeout(() => {
      setShouldStart(true);
      setIsTyping(true);

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
          setIsTyping(false);
        }
      }, typingSpeed);

      return () => clearInterval(typingInterval);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, []); // Only run once when component mounts

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <span style={{ color: textColor }}>
        {displayedText}
      </span>
      {isTyping && (
        <motion.div
          className="inline-block ml-1 rounded-sm w-[2px] h-4"
          style={{ backgroundColor: cursorColor }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </button>
  );
}
