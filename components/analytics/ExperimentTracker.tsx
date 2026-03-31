'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Component to listen for experiment tracking events
 * and send them to analytics API
 */
export function ExperimentTracker() {
  const pathname = usePathname();
  
  useEffect(() => {
    const handleExperimentEvent = async (event: CustomEvent) => {
      const { experimentId, variant, action, ...metadata } = event.detail;
      
      try {
        await fetch('/api/events/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'experiment_interaction',
            properties: {
              experimentId,
              experimentVariant: variant,
              experimentAction: action,
              page: pathname,
              timestamp: new Date().toISOString(),
              ...metadata,
            },
          }),
        });
      } catch (error) {
        console.error('Failed to track experiment event:', error);
      }
    };
    
    // @ts-ignore - Custom event
    window.addEventListener('track_experiment', handleExperimentEvent);
    
    return () => {
      // @ts-ignore
      window.removeEventListener('track_experiment', handleExperimentEvent);
    };
  }, [pathname]);
  
  return null;
}
