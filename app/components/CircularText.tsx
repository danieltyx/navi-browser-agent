'use client';
import { useState } from 'react';

interface CircularTextProps {
  text: string;
  onHover?: 'speedUp';
  spinDuration?: number;
  className?: string;
}

export default function CircularText({ text, onHover, spinDuration = 20, className = '' }: CircularTextProps) {
  const [isHovered, setIsHovered] = useState(false);
  const chars = text.split('');
  const deg = 360 / chars.length;

  return (
    <div 
      className={`relative w-32 h-32 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`absolute inset-0 rounded-full animate-spin transition-all duration-300`}
        style={{ 
          animationDuration: `${isHovered && onHover === 'speedUp' ? spinDuration / 2 : spinDuration}s`
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-200"
            style={{
              transformOrigin: '0 64px',
              transform: `rotate(${i * deg}deg)`,
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
} 