/**
 * Stockscope Analytics Tracker
 * 
 * Client-side tracking wrapper for product analytics
 * Automatically captures sessions, page views, and user interactions
 * 
 * Sprint 4, Task SP4-02: Client Tracking Wrapper
 */

import { v4 as uuidv4 } from 'uuid'

// Event Taxonomy V1 - Type-safe event names
export type EventName = 
  // Session
  | 'session_start'
  | 'session_end'
  // Page
  | 'page_view'
  // Auth
  | 'auth_signin_clicked'
  | 'auth_signin_completed'
  | 'auth_signup_completed'
  | 'auth_signout_clicked'
  // Screener
  | 'screener_viewed'
  | 'screener_filter_applied'
  | 'screener_filter_cleared'
  | 'screener_sort_changed'
  | 'screener_view_toggled'
  | 'screener_stock_clicked'
  | 'screener_export_clicked'
  // Stock detail
  | 'stock_detail_viewed'
  | 'stock_chart_timeframe_changed'
  | 'stock_ownership_viewed'
  // Watchlist
  | 'watchlist_viewed'
  | 'watchlist_created'
  | 'watchlist_stock_added'
  | 'watchlist_stock_removed'
  | 'watchlist_reordered'
  | 'watchlist_deleted'
  // Saved screeners
  | 'saved_screener_created'
  | 'saved_screener_loaded'
  | 'saved_screener_deleted'
  // Alerts
  | 'alert_created'
  | 'alert_deleted'
  | 'alert_triggered'
  // Payment
  | 'payment_checkout_initiated'
  | 'payment_method_selected'
  | 'payment_completed'
  | 'payment_failed'
  | 'subscription_cancelled'
  // Upgrade
  | 'upgrade_modal_viewed'
  | 'upgrade_button_clicked'
  | 'feature_locked_viewed'
  // Search
  | 'search_query_entered'
  | 'search_result_clicked'
  // Error
  | 'error_occurred'
  | 'api_error'

export interface TrackingEvent {
  eventName: EventName
  timestamp?: string
  sessionId: string
  userId?: string
  anonymousId?: string
  
  platform?: 'web' | 'mobile_ios' | 'mobile_android'
  deviceType?: 'desktop' | 'tablet' | 'mobile'
  locale?: 'id' | 'en'
  viewportWidth?: number
  viewportHeight?: number
  
  pageUrl?: string
  pageTitle?: string
  referrer?: string
  
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  
  properties?: Record<string, any>
}

export interface TrackerConfig {
  endpoint?: string
  batchSize?: number
  batchInterval?: number
  debug?: boolean
}

class StockscopeTracker {
  private sessionId: string
  private anonymousId: string
  private userId?: string
  private eventQueue: TrackingEvent[] = []
  private batchTimer?: NodeJS.Timeout
  private config: Required<TrackerConfig>

  constructor(config: TrackerConfig = {}) {
    this.config = {
      endpoint: config.endpoint || '/api/events/track',
      batchSize: config.batchSize || 10,
      batchInterval: config.batchInterval || 30000, // 30 seconds
      debug: config.debug || false
    }

    // Initialize session and anonymous IDs
    this.sessionId = this.getOrCreateSessionId()
    this.anonymousId = this.getOrCreateAnonymousId()

    // Auto-track session start
    this.trackSessionStart()

    // Track session end on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.trackSessionEnd()
        this.flush() // Send any pending events
      })

      // Start batch upload timer
      this.startBatchTimer()
    }
  }

  /**
   * Get or create session ID (expires after 30 minutes of inactivity)
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return uuidv4()

    const stored = sessionStorage.getItem('stockscope_session_id')
    const lastActivity = sessionStorage.getItem('stockscope_last_activity')

    const now = Date.now()
    const thirtyMinutes = 30 * 60 * 1000

    if (stored && lastActivity && (now - parseInt(lastActivity)) < thirtyMinutes) {
      // Existing session still valid
      sessionStorage.setItem('stockscope_last_activity', now.toString())
      return stored
    }

    // Create new session
    const newSessionId = uuidv4()
    sessionStorage.setItem('stockscope_session_id', newSessionId)
    sessionStorage.setItem('stockscope_last_activity', now.toString())
    return newSessionId
  }

  /**
   * Get or create anonymous ID (persists across sessions)
   */
  private getOrCreateAnonymousId(): string {
    if (typeof window === 'undefined') return uuidv4()

    const stored = localStorage.getItem('stockscope_anonymous_id')
    if (stored) return stored

    const newAnonymousId = uuidv4()
    localStorage.setItem('stockscope_anonymous_id', newAnonymousId)
    return newAnonymousId
  }

  /**
   * Set user ID after authentication
   */
  public identify(userId: string) {
    this.userId = userId
    if (this.config.debug) {
      console.log('[Tracker] User identified:', userId)
    }
  }

  /**
   * Clear user ID on logout
   */
  public reset() {
    this.userId = undefined
    if (this.config.debug) {
      console.log('[Tracker] User reset (logged out)')
    }
  }

  /**
   * Track a custom event
   */
  public track(eventName: EventName, properties?: Record<string, any>) {
    const event: TrackingEvent = {
      eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      anonymousId: this.anonymousId,
      platform: 'web',
      deviceType: this.getDeviceType(),
      locale: this.getLocale(),
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      pageTitle: typeof document !== 'undefined' ? document.title : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      ...this.getUTMParams(),
      properties
    }

    this.eventQueue.push(event)

    if (this.config.debug) {
      console.log('[Tracker] Event queued:', eventName, properties)
    }

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush()
    }
  }

  /**
   * Track page view
   */
  public trackPageView() {
    this.track('page_view', {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      search: typeof window !== 'undefined' ? window.location.search : undefined
    })
  }

  /**
   * Track session start (auto-called on initialization)
   */
  private trackSessionStart() {
    this.track('session_start', {
      isNewSession: true,
      sessionStartTime: Date.now()
    })
  }

  /**
   * Track session end (auto-called on page unload)
   */
  private trackSessionEnd() {
    this.track('session_end', {
      sessionDuration: Date.now() - parseInt(
        sessionStorage.getItem('stockscope_last_activity') || '0'
      )
    })
  }

  /**
   * Send all queued events immediately
   */
  public async flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    if (this.config.debug) {
      console.log('[Tracker] Flushing', events.length, 'events')
    }

    try {
      if (events.length === 1) {
        // Single event - use POST
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(events[0]),
          keepalive: true // Important for beforeunload
        })
      } else {
        // Multiple events - use batch endpoint
        await fetch(this.config.endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
          keepalive: true
        })
      }

      if (this.config.debug) {
        console.log('[Tracker] Events sent successfully')
      }
    } catch (error) {
      console.error('[Tracker] Failed to send events:', error)
      // Re-queue events on failure
      this.eventQueue.push(...events)
    }
  }

  /**
   * Start periodic batch upload timer
   */
  private startBatchTimer() {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush()
      }
    }, this.config.batchInterval)
  }

  /**
   * Stop batch timer (cleanup)
   */
  public destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
    this.flush()
  }

  /**
   * Detect device type from user agent
   */
  private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop'

    const ua = navigator.userAgent
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet'
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile'
    }
    return 'desktop'
  }

  /**
   * Get current locale from URL or navigator
   */
  private getLocale(): 'id' | 'en' {
    if (typeof window === 'undefined') return 'en'

    const pathLocale = window.location.pathname.split('/')[1]
    if (pathLocale === 'id' || pathLocale === 'en') {
      return pathLocale
    }

    return navigator.language.startsWith('id') ? 'id' : 'en'
  }

  /**
   * Extract UTM parameters from URL
   */
  private getUTMParams() {
    if (typeof window === 'undefined') return {}

    const params = new URLSearchParams(window.location.search)
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmContent: params.get('utm_content') || undefined,
      utmTerm: params.get('utm_term') || undefined
    }
  }
}

// Export singleton instance
let trackerInstance: StockscopeTracker | null = null

export function getTracker(config?: TrackerConfig): StockscopeTracker {
  if (!trackerInstance) {
    trackerInstance = new StockscopeTracker(config)
  }
  return trackerInstance
}

// Convenience exports for React hooks
export function useAnalytics() {
  return getTracker()
}

// Default export
export default getTracker
