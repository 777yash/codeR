import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://b2448cf17f4204adf2bf3e51665b459a@o4511312172548096.ingest.de.sentry.io/4511312187031632',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  enableLogs: true,
  sendDefaultPii: true,
})
