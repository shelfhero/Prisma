/**
 * Analytics and Error Tracking for Призма
 * Lightweight analytics without external dependencies (privacy-first)
 */

import { createBrowserClient } from './supabase-simple'

export interface AnalyticsEvent {
  event_name: string
  event_category: 'user_action' | 'error' | 'performance' | 'system'
  event_data?: Record<string, any>
  user_id?: string
  session_id?: string
  page_url?: string
  timestamp?: string
}

export interface ErrorEvent {
  error_type: string
  error_message: string
  error_stack?: string
  page_url: string
  user_id?: string
  user_agent: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
}

// Session ID persists during browsing session
let sessionId: string | null = null

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'

  if (!sessionId) {
    sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
  }
  return sessionId
}

/**
 * Track a generic analytics event
 */
export async function trackEvent(
  eventName: string,
  category: AnalyticsEvent['event_category'],
  data?: Record<string, any>
) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('📊 Analytics Event:', eventName, category, data)
    return
  }

  try {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const event: AnalyticsEvent = {
      event_name: eventName,
      event_category: category,
      event_data: data,
      user_id: user?.id,
      session_id: getSessionId(),
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
    }

    await supabase.from('analytics_events').insert(event)
  } catch (error) {
    console.error('Analytics tracking error:', error)
  }
}

/**
 * Track an error event
 */
export async function trackError(
  error: Error | string,
  severity: ErrorEvent['severity'] = 'medium',
  metadata?: Record<string, any>
) {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'object' ? error.stack : undefined

  if (process.env.NODE_ENV !== 'production') {
    console.error('📛 Error Tracked:', errorMessage, severity, metadata)
    return
  }

  try {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const errorEvent: ErrorEvent = {
      error_type: typeof error === 'object' ? error.constructor.name : 'GenericError',
      error_message: errorMessage,
      error_stack: errorStack,
      page_url: window.location.href,
      user_id: user?.id,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity,
      metadata: {
        ...metadata,
        session_id: getSessionId(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    }

    await supabase.from('error_logs').insert(errorEvent)

    // Also send to Sentry if configured
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs').then(({ captureException }) => {
        captureException(error, {
          level: severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning',
          tags: {
            severity,
            page: window.location.pathname,
          },
          extra: metadata,
        })
      })
    }
  } catch (err) {
    console.error('Error tracking failed:', err)
  }
}

/**
 * Track performance metrics
 */
export async function trackPerformance(metricName: string, value: number, metadata?: Record<string, any>) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚡ Performance Metric:', metricName, value, metadata)
    return
  }

  try {
    await trackEvent(`performance_${metricName}`, 'performance', {
      value,
      ...metadata,
    })
  } catch (error) {
    console.error('Performance tracking error:', error)
  }
}

/**
 * Track page view
 */
export async function trackPageView(pageName?: string) {
  const page = pageName || window.location.pathname

  await trackEvent('page_view', 'user_action', {
    page,
    referrer: document.referrer,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  })
}

/**
 * Track user action
 */
export async function trackUserAction(action: string, target?: string, metadata?: Record<string, any>) {
  await trackEvent(`user_${action}`, 'user_action', {
    target,
    ...metadata,
  })
}

/**
 * Track receipt upload
 */
export async function trackReceiptUpload(
  status: 'started' | 'success' | 'failed',
  metadata?: {
    fileSize?: number
    fileType?: string
    processingTime?: number
    errorMessage?: string
  }
) {
  await trackEvent(`receipt_upload_${status}`, 'user_action', metadata)
}

/**
 * Track OCR processing
 */
export async function trackOCRProcessing(
  status: 'started' | 'success' | 'failed',
  metadata?: {
    provider?: 'google_vision' | 'gpt4_vision' | 'fallback'
    processingTime?: number
    itemsDetected?: number
    confidence?: number
    errorMessage?: string
  }
) {
  await trackEvent(`ocr_${status}`, 'system', metadata)
}

/**
 * Track budget alerts
 */
export async function trackBudgetAlert(
  alertType: 'warning' | 'exceeded',
  category?: string,
  metadata?: {
    budgetLimit?: number
    currentSpent?: number
    percentageUsed?: number
  }
) {
  await trackEvent(`budget_alert_${alertType}`, 'user_action', {
    category,
    ...metadata,
  })
}

/**
 * Web Vitals tracking
 */
export function trackWebVitals() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return

  // Track Core Web Vitals
  if ('PerformanceObserver' in window) {
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      trackPerformance('lcp', lastEntry.renderTime || lastEntry.loadTime, {
        url: window.location.pathname,
      })
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        trackPerformance('fid', entry.processingStart - entry.startTime, {
          url: window.location.pathname,
        })
      })
    })
    fidObserver.observe({ type: 'first-input', buffered: true })

    // CLS (Cumulative Layout Shift)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      trackPerformance('cls', clsValue, {
        url: window.location.pathname,
      })
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  }

  // Track page load time
  window.addEventListener('load', () => {
    const perfData = performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
    trackPerformance('page_load_time', pageLoadTime, {
      url: window.location.pathname,
    })
  })
}

/**
 * Initialize analytics
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return

  // Track initial page view
  trackPageView()

  // Track web vitals
  trackWebVitals()

  // Track errors globally
  window.addEventListener('error', (event) => {
    trackError(event.error || event.message, 'medium', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason, 'high', {
      type: 'unhandled_promise_rejection',
    })
  })

  // Track navigation
  if ('navigation' in performance) {
    const navType = (performance as any).navigation.type
    const navTypes = ['navigate', 'reload', 'back_forward', 'prerender']
    trackEvent('navigation', 'system', {
      type: navTypes[navType] || 'unknown',
    })
  }
}

/**
 * Analytics dashboard query helpers for admin
 */
export async function getAnalyticsSummary(startDate?: string, endDate?: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.rpc('get_analytics_summary', {
    start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: endDate || new Date().toISOString(),
  })

  if (error) throw error
  return data
}

export async function getErrorTrends(days: number = 7) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('error_logs')
    .select('error_type, severity, timestamp')
    .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data
}
