/**
 * Analytics React Hooks
 * 
 * React-friendly wrappers for tracking user interactions
 * Sprint 4, Task SP4-02: Client Tracking Wrapper
 */

'use client'

import { useEffect, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getTracker, EventName } from './tracker'

/**
 * Hook to get tracker instance
 */
export function useAnalytics() {
  return getTracker()
}

/**
 * Auto-track page views on route changes
 */
export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tracker = useAnalytics()

  useEffect(() => {
    // Track page view when route changes
    tracker.trackPageView()
  }, [pathname, searchParams, tracker])
}

/**
 * Track event with callback wrapper
 * Usage: const trackClick = useTrackEvent('screener_stock_clicked')
 */
export function useTrackEvent(eventName: EventName) {
  const tracker = useAnalytics()

  return useCallback((properties?: Record<string, any>) => {
    tracker.track(eventName, properties)
  }, [eventName, tracker])
}

/**
 * Track user identification (after login)
 */
export function useIdentifyUser(userId?: string) {
  const tracker = useAnalytics()

  useEffect(() => {
    if (userId) {
      tracker.identify(userId)
    }
  }, [userId, tracker])
}

/**
 * Reset tracking on logout
 */
export function useResetTracking(isLoggedOut: boolean) {
  const tracker = useAnalytics()

  useEffect(() => {
    if (isLoggedOut) {
      tracker.reset()
    }
  }, [isLoggedOut, tracker])
}
