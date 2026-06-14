import type { WebContainer } from '@webcontainer/api'

export type WebContainerStatus = 'unsupported' | 'booting' | 'ready' | 'error'

export interface WebContainerPreview {
  url: string
  port: number
}

let bootPromise: Promise<WebContainer> | null = null
let teardownPromise: Promise<void> = Promise.resolve()
let status: WebContainerStatus | null = null
const statusListeners = new Set<() => void>()
let preview: WebContainerPreview | null = null
const previewListeners = new Set<() => void>()

function setStatus(next: WebContainerStatus | null) {
  status = next
  statusListeners.forEach((listener) => listener())
}

function setPreview(next: WebContainerPreview | null) {
  preview = next
  previewListeners.forEach((listener) => listener())
}

export function subscribeWebContainerStatus(listener: () => void) {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}

export function getWebContainerStatus(): WebContainerStatus | null {
  return status
}

export function subscribeWebContainerPreview(listener: () => void) {
  previewListeners.add(listener)
  return () => {
    previewListeners.delete(listener)
  }
}

export function getWebContainerPreview(): WebContainerPreview | null {
  return preview
}

export function isWebContainerSupported(): boolean {
  return typeof window !== 'undefined' && window.crossOriginIsolated === true
}

export function slugifyWorkdirName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'project'
}

export function getBootedWebContainer(): Promise<WebContainer> | null {
  return bootPromise
}

export function getWebContainer(workdirName?: string): Promise<WebContainer> {
  if (bootPromise) return bootPromise

  if (!isWebContainerSupported()) {
    setStatus('unsupported')
    return Promise.reject(
      new Error(
        'WebContainer requires cross-origin isolation (missing COOP/COEP headers or unsupported browser)'
      )
    )
  }

  // Chain after any in-flight teardown — only one WebContainer may exist at
  // a time, and boot() throws if the previous instance is still alive.
  setStatus('booting')
  const promise = teardownPromise
    .then(() => import('@webcontainer/api'))
    .then(({ WebContainer }) =>
      WebContainer.boot(workdirName ? { workdirName } : undefined)
    )
    .then((instance) => {
      instance.on('server-ready', (port, url) => setPreview({ url, port }))
      instance.on('port', (port, type) => {
        if (type === 'close' && preview?.port === port) setPreview(null)
      })
      return instance
    })
  bootPromise = promise
  promise.then(
    () => {
      if (bootPromise === promise) setStatus('ready')
    },
    () => {
      if (bootPromise === promise) {
        bootPromise = null
        setStatus('error')
      }
    }
  )
  return promise
}

export function teardownWebContainer(): Promise<void> {
  const promise = bootPromise
  bootPromise = null
  setStatus(null)
  setPreview(null)
  if (!promise) return teardownPromise

  teardownPromise = promise
    .then((instance) => instance.teardown())
    .catch(() => undefined)
  return teardownPromise
}
