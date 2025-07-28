'use client';

import React, { useState, useEffect } from 'react';

interface FixedMaintenanceTypewriterProps {
  onComplete?: () => void;
  typingSpeed?: number;
}

export default function FixedMaintenanceTypewriter({
  onComplete,
  typingSpeed = 100
}: FixedMaintenanceTypewriterProps) {
  const [text, setText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const fullText = "We are under development";

  useEffect(() => {
    let index = 0;
    setText('');

    const timer = setInterval(() => {
      if (index < fullText.length) {
        setText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setShowCursor(false);
        if (onComplete) {
          setTimeout(onComplete, 1000);
        }
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
        {text}
        {showCursor && (
          <span className="inline-block w-1 h-8 sm:h-10 md:h-12 bg-white ml-2 animate-pulse" />
        )}
      </h1>
    </div>
  );
}
