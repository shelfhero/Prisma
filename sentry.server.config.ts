import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
  // We recommend adjusting this value in production (free tier: 0.1 = 10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Set context for better debugging
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV !== 'production') {
      return null
    }

    // Add custom context
    event.tags = {
      ...event.tags,
      app: 'prizma-receipt',
      environment: process.env.NODE_ENV,
    }

    return event
  },
})
