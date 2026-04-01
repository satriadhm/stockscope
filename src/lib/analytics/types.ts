/**
 * Event Taxonomy V1 - TypeScript Types
 * 
 * This file provides type-safe event tracking for Stockscope.
 * All events must conform to the taxonomy defined in docs/EVENT_TAXONOMY_V1.md
 * 
 * @version 1.0.0
 * @frozen true
 */

// ============================================================================
// Core Event Structure
// ============================================================================

export type Platform = 'web' | 'mobile_ios' | 'mobile_android' | 'server';
export type DeviceType = 'desktop' | 'tablet' | 'mobile';
export type Locale = 'id' | 'en';

export interface BaseEvent {
  event_name: string;
  timestamp: string; // ISO 8601 UTC
  session_id: string;
  user_id?: string | null;
  platform: Platform;
  device_type?: DeviceType;
  locale: Locale;
  viewport_width?: number;
  viewport_height?: number;
}

export interface TrackingEvent<T extends Record<string, any> = Record<string, any>>
  extends BaseEvent {
  properties: T;
}

// ============================================================================
// Event Names (Exhaustive Union)
// ============================================================================

export type EventName =
  // Session
  | 'session_start'
  | 'session_end'
  
  // Page/Screen
  | 'page_view'
  
  // Auth
  | 'auth_signin_clicked'
  | 'auth_signin_completed'
  | 'auth_signout_clicked'
  
  // Search
  | 'search_query_submitted'
  | 'search_result_clicked'
  
  // Screener
  | 'screener_filter_applied'
  | 'screener_filter_cleared'
  | 'screener_sort_changed'
  | 'screener_result_clicked'
  | 'screener_saved'
  
  // Watchlist (Sprint 2)
  | 'watchlist_created'
  | 'watchlist_stock_added'
  | 'watchlist_stock_removed'
  | 'watchlist_viewed'
  
  // Alerts (Sprint 2)
  | 'alert_created'
  | 'alert_triggered'
  | 'alert_notification_sent'
  
  // Payment
  | 'payment_checkout_initiated'
  | 'payment_method_selected'
  | 'payment_completed'
  | 'subscription_upgraded'
  | 'subscription_cancelled'
  
  // Features
  | 'feature_gated_shown'
  | 'export_initiated'
  | 'dashboard_widget_clicked'
  
  // Errors
  | 'error_occurred';

// ============================================================================
// Event Property Types
// ============================================================================

// Session Events
export interface SessionStartProperties {
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  is_returning_user: boolean;
}

export interface SessionEndProperties {
  duration_seconds: number;
  page_views: number;
  events_count: number;
}

// Page Events
export interface PageViewProperties {
  page_path: string;
  page_title: string;
  previous_path?: string | null;
  load_time_ms?: number;
}

// Auth Events
export type AuthProvider = 'google' | 'email' | 'apple';

export interface AuthSignInClickedProperties {
  provider: AuthProvider;
  page_path: string;
}

export interface AuthSignInCompletedProperties {
  provider: AuthProvider;
  is_new_user: boolean;
  signup_date?: string;
}

export interface AuthSignOutClickedProperties {
  session_duration_seconds: number;
}

// Search Events
export type SearchLocation = 'navbar' | 'screener' | 'dashboard';

export interface SearchQuerySubmittedProperties {
  query: string;
  query_length: number;
  results_count: number;
  location: SearchLocation;
}

export interface SearchResultClickedProperties {
  ticker: string;
  result_position: number;
  query: string;
}

// Screener Events
export interface ScreenerFilterAppliedProperties {
  filter_type: string;
  filter_value: string | number;
  active_filters_count: number;
}

export interface ScreenerFilterClearedProperties {
  filters_cleared_count: number;
}

export interface ScreenerSortChangedProperties {
  sort_field: string;
  sort_direction: 'asc' | 'desc';
}

export interface ScreenerResultClickedProperties {
  ticker: string;
  result_position: number;
  active_filters_count: number;
  total_results: number;
}

export interface ScreenerSavedProperties {
  screener_name: string;
  filters_count: number;
  is_first_save: boolean;
}

// Watchlist Events (Sprint 2)
export interface WatchlistCreatedProperties {
  watchlist_name: string;
  is_first_watchlist: boolean;
}

export type WatchlistSource = 'screener' | 'search' | 'dashboard' | 'direct';

export interface WatchlistStockAddedProperties {
  ticker: string;
  watchlist_id: string;
  source: WatchlistSource;
}

export interface WatchlistStockRemovedProperties {
  ticker: string;
  watchlist_id: string;
}

export interface WatchlistViewedProperties {
  watchlist_id: string;
  stocks_count: number;
}

// Alert Events (Sprint 2)
export type AlertType = 'price_above' | 'price_below' | 'price_change_pct';
export type NotificationMethod = 'email' | 'push' | 'both';

export interface AlertCreatedProperties {
  ticker: string;
  alert_type: AlertType;
  threshold_value: number;
  notification_method: NotificationMethod;
}

export interface AlertTriggeredProperties {
  alert_id: string;
  ticker: string;
  alert_type: AlertType;
  threshold_value: number;
  actual_value: number;
  user_id: string;
}

export interface AlertNotificationSentProperties {
  alert_id: string;
  user_id: string;
  notification_method: Exclude<NotificationMethod, 'both'>;
  delivery_status: 'sent' | 'failed';
}

// Payment Events
export type BillingCycle = 'monthly' | 'annual';
export type PaymentSource = 'paywall' | 'pricing_page' | 'feature_gate';

export interface PaymentCheckoutInitiatedProperties {
  plan_id: string;
  plan_name: string;
  price_idr: number;
  billing_cycle: BillingCycle;
  source: PaymentSource;
}

export interface PaymentMethodSelectedProperties {
  payment_method: string;
  plan_id: string;
}

export type PaymentStatus = 'success' | 'pending' | 'failed';

export interface PaymentCompletedProperties {
  transaction_id: string;
  user_id: string;
  plan_id: string;
  amount_idr: number;
  payment_method: string;
  status: PaymentStatus;
}

export interface SubscriptionUpgradedProperties {
  from_plan: string;
  to_plan: string;
  upgrade_reason?: string;
}

export interface SubscriptionCancelledProperties {
  plan_id: string;
  cancellation_reason?: string;
  days_subscribed: number;
}

// Feature Events
export type ActionTaken = 'dismissed' | 'upgraded' | 'none';

export interface FeatureGatedShownProperties {
  feature_name: string;
  current_plan: string;
  required_plan: string;
  action_taken: ActionTaken;
}

export type ExportType = 'csv' | 'pdf' | 'excel';
export type DataSource = 'screener' | 'watchlist' | 'dashboard';

export interface ExportInitiatedProperties {
  export_type: ExportType;
  data_source: DataSource;
  rows_exported: number;
}

export interface DashboardWidgetClickedProperties {
  widget_type: string;
  widget_position: number;
}

// Error Events
export interface ErrorOccurredProperties {
  error_type: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  page_path: string;
}

// ============================================================================
// Typed Event Map
// ============================================================================

export interface EventPropertiesMap {
  session_start: SessionStartProperties;
  session_end: SessionEndProperties;
  page_view: PageViewProperties;
  auth_signin_clicked: AuthSignInClickedProperties;
  auth_signin_completed: AuthSignInCompletedProperties;
  auth_signout_clicked: AuthSignOutClickedProperties;
  search_query_submitted: SearchQuerySubmittedProperties;
  search_result_clicked: SearchResultClickedProperties;
  screener_filter_applied: ScreenerFilterAppliedProperties;
  screener_filter_cleared: ScreenerFilterClearedProperties;
  screener_sort_changed: ScreenerSortChangedProperties;
  screener_result_clicked: ScreenerResultClickedProperties;
  screener_saved: ScreenerSavedProperties;
  watchlist_created: WatchlistCreatedProperties;
  watchlist_stock_added: WatchlistStockAddedProperties;
  watchlist_stock_removed: WatchlistStockRemovedProperties;
  watchlist_viewed: WatchlistViewedProperties;
  alert_created: AlertCreatedProperties;
  alert_triggered: AlertTriggeredProperties;
  alert_notification_sent: AlertNotificationSentProperties;
  payment_checkout_initiated: PaymentCheckoutInitiatedProperties;
  payment_method_selected: PaymentMethodSelectedProperties;
  payment_completed: PaymentCompletedProperties;
  subscription_upgraded: SubscriptionUpgradedProperties;
  subscription_cancelled: SubscriptionCancelledProperties;
  feature_gated_shown: FeatureGatedShownProperties;
  export_initiated: ExportInitiatedProperties;
  dashboard_widget_clicked: DashboardWidgetClickedProperties;
  error_occurred: ErrorOccurredProperties;
}

// ============================================================================
// Type-Safe Track Function Signature
// ============================================================================

/**
 * Type-safe event tracking function.
 * 
 * @example
 * // ✅ Correct - properties match event type
 * track('search_query_submitted', {
 *   query: 'BBCA',
 *   query_length: 4,
 *   results_count: 1,
 *   location: 'navbar'
 * });
 * 
 * @example
 * // ❌ Type error - missing required property
 * track('search_query_submitted', {
 *   query: 'BBCA'
 *   // Error: Missing query_length, results_count, location
 * });
 */
export type TrackFunction = <E extends EventName>(
  eventName: E,
  properties: EventPropertiesMap[E]
) => void;

// ============================================================================
// Validation Utilities
// ============================================================================

export const EVENT_NAME_PATTERN = /^[a-z]+(_[a-z]+){1,2}$/;

export function isValidEventName(name: string): name is EventName {
  return EVENT_NAME_PATTERN.test(name) && name.length <= 50;
}

export function validateEventProperties(
  properties: Record<string, any>
): boolean {
  const MAX_STRING_LENGTH = 500;
  const MAX_ARRAY_LENGTH = 50;
  const MAX_NESTING_DEPTH = 2;

  function checkNesting(obj: any, depth: number = 0): boolean {
    if (depth > MAX_NESTING_DEPTH) return false;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
        return false;
      }
      if (Array.isArray(value) && value.length > MAX_ARRAY_LENGTH) {
        return false;
      }
      if (typeof value === 'object' && value !== null) {
        if (!checkNesting(value, depth + 1)) return false;
      }
    }
    return true;
  }

  return checkNesting(properties);
}

// ============================================================================
// Priority Tiers (for implementation phasing)
// ============================================================================

export const TIER_1_EVENTS: EventName[] = [
  'session_start',
  'session_end',
  'page_view',
  'auth_signin_completed',
  'auth_signout_clicked',
  'payment_completed',
  'error_occurred',
];

export const TIER_2_EVENTS: EventName[] = [
  'screener_filter_applied',
  'screener_filter_cleared',
  'screener_result_clicked',
  'watchlist_created',
  'watchlist_stock_added',
  'search_query_submitted',
  'feature_gated_shown',
];

export const TIER_3_EVENTS: EventName[] = [
  'dashboard_widget_clicked',
  'export_initiated',
  'screener_sort_changed',
  'search_result_clicked',
];
