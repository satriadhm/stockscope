'use client';

import React from 'react';

export interface BlurOverlayProps {
  children: React.ReactNode;
  blur?: 'sm' | 'md' | 'lg';
  opacity?: number;
  className?: string;
}

/**
 * Blurs content to indicate premium feature
 * 
 * @example
 * ```tsx
 * <BlurOverlay blur="md">
 *   <Chart data={data} />
 * </BlurOverlay>
 * ```
 */
export function BlurOverlay({ 
  children, 
  blur = 'md',
  opacity = 0.6,
  className = '' 
}: BlurOverlayProps) {
  const blurClasses = {
    sm: 'blur-[2px]',
    md: 'blur-[4px]',
    lg: 'blur-[8px]',
  };
  
  return (
    <div 
      className={`relative ${className}`}
      aria-hidden="true"
    >
      <div 
        className={blurClasses[blur]}
        style={{ opacity }}
      >
        {children}
      </div>
      
      {/* Subtle overlay to indicate content is locked */}
      <div 
        className="absolute inset-0 bg-background/20 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

export interface BlurOverlayWithGradientProps {
  children: React.ReactNode;
  blur?: 'sm' | 'md' | 'lg';
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
}

/**
 * Blurs content with gradient overlay (for vertical content)
 */
export function BlurOverlayWithGradient({ 
  children, 
  blur = 'md',
  gradientFrom = 'transparent',
  gradientTo = 'background',
  className = '' 
}: BlurOverlayWithGradientProps) {
  const blurClasses = {
    sm: 'blur-[2px]',
    md: 'blur-[4px]',
    lg: 'blur-[8px]',
  };
  
  return (
    <div 
      className={`relative ${className}`}
      aria-hidden="true"
    >
      <div className={blurClasses[blur]}>
        {children}
      </div>
      
      {/* Gradient overlay for smooth fade */}
      <div 
        className={`absolute inset-0 pointer-events-none bg-gradient-to-b from-${gradientFrom} to-${gradientTo}`}
        aria-hidden="true"
      />
    </div>
  );
}
