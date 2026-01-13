import React, { useEffect, useRef, ReactNode, useCallback, useState } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean; // When true, ignores size prop and uses width/height or className
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
};

// Global mouse position state to avoid multiple event listeners
let globalMouseX = 0;
let globalMouseY = 0;
let globalMouseXP = 0;
let globalMouseYP = 0;
let isGlobalListenerActive = false;
const subscribedCards = new Set<(x: number, y: number, xp: number, yp: number) => void>();

const initGlobalMouseListener = () => {
  if (isGlobalListenerActive) return;

  let animationId: number;

  const syncPointer = (e: PointerEvent) => {
    // Cancel previous animation frame to throttle updates
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    animationId = requestAnimationFrame(() => {
      globalMouseX = e.clientX;
      globalMouseY = e.clientY;
      globalMouseXP = e.clientX / window.innerWidth;
      globalMouseYP = e.clientY / window.innerHeight;

      // Update all subscribed cards
      subscribedCards.forEach(callback => {
        callback(globalMouseX, globalMouseY, globalMouseXP, globalMouseYP);
      });
    });
  };

  document.addEventListener('pointermove', syncPointer, { passive: true });
  isGlobalListenerActive = true;
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const updateCardPosition = useCallback((x: number, y: number, xp: number, yp: number) => {
    if (cardRef.current && isHovered) {
      cardRef.current.style.setProperty('--x', x.toFixed(2));
      cardRef.current.style.setProperty('--xp', xp.toFixed(2));
      cardRef.current.style.setProperty('--y', y.toFixed(2));
      cardRef.current.style.setProperty('--yp', yp.toFixed(2));
    }
  }, [isHovered]);

  useEffect(() => {
    initGlobalMouseListener();
    subscribedCards.add(updateCardPosition);

    return () => {
      subscribedCards.delete(updateCardPosition);
    };
  }, [updateCardPosition]);

  const { base, spread } = glowColorMap[glowColor];

  // Determine sizing
  const getSizeClasses = () => {
    if (customSize) {
      return ''; // Let className or inline styles handle sizing
    }
    return sizeMap[size];
  };

  const getInlineStyles = () => {
    const baseStyles: React.CSSProperties = {
      '--base': base,
      '--spread': spread,
      '--radius': '14',
      '--border': '2',
      '--backdrop': 'hsl(0 0% 95% / 0.8)',
      '--backup-border': 'hsl(0 0% 85% / 1)',
      '--size': '150',
      '--outer': '1',
      '--border-size': 'calc(var(--border, 2) * 1px)',
      '--spotlight-size': 'calc(var(--size, 150) * 1px)',
      '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      backgroundColor: 'var(--backdrop, rgba(255, 255, 255, 0.9))',
      border: 'var(--border-size) solid var(--backup-border)',
      position: 'relative' as const,
      touchAction: 'none' as const,
      willChange: isHovered ? 'transform' : 'auto',
      transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
    } as any;

    // Add width and height if provided
    if (width !== undefined) {
      baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return baseStyles;
  };

  const beforeAfterStyles = `
    [data-glow] {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    [data-glow]:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      transform: translateY(-2px);
      transition: all 0.2s ease-in-out;
    }

    [data-glow]::before {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: calc(var(--radius) * 1px);
      background: linear-gradient(135deg,
        hsl(var(--hue, 210) 50% 60% / 0.1),
        hsl(var(--hue, 210) 50% 80% / 0.05)
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: -1;
    }

    [data-glow]:hover::before {
      opacity: 1;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          ${getSizeClasses()}
          ${!customSize ? 'aspect-[3/4]' : ''}
          rounded-2xl
          relative
          grid
          grid-rows-[1fr_auto]
          p-4
          gap-4
          ${className}
        `}
      >
        {children}
      </div>
    </>
  );
};

export { GlowCard }
