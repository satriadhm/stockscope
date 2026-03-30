/**
 * Analytics Library Exports
 * 
 * Central export point for Stockscope analytics tracking
 * Sprint 4, Task SP4-02: Client Tracking Wrapper
 */

export { getTracker, useAnalytics, type EventName, type TrackingEvent, type TrackerConfig } from './tracker'
export { usePageTracking, useTrackEvent, useIdentifyUser, useResetTracking } from './hooks'

// Re-export default
export { default } from './tracker'
