import { getBootedWebContainer } from '@/lib/webcontainer'
import { sanitizeFilePath } from '@/lib/webcontainer-fs'

const BARE_RUNNABLE = /\.(js|mjs|cjs)$/

export function normalizeNpxCommand(command: string): string {
  return command.replace(/(^|&&\s*|\|\|\s*|;\s*)npx\s+(?!-y\s)/g, '$1npx -y ')
}

export async function buildRunCommand(
  activeFileName: string | null
): Promise<string | null> {
  const booted = getBootedWebContainer()
  if (!booted) return null
  const container = await booted

  let pkgRaw: string | null = null
  try {
    pkgRaw = await container.fs.readFile('package.json', 'utf-8')
  } catch {
    pkgRaw = null
  }

  const activePath = activeFileName ? sanitizeFilePath(activeFileName) : null

  if (pkgRaw) {
    let script: string | null = null
    try {
      const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, string> }
      if (pkg.scripts?.dev) script = 'dev'
      else if (pkg.scripts?.start) script = 'start'
    } catch {
      script = null
    }
    const run = script
      ? `npm run ${script}`
      : activePath && BARE_RUNNABLE.test(activePath)
        ? `node ${activePath}`
        : null
    if (!run) return null
    let hasNodeModules = false
    try {
      await container.fs.readdir('node_modules')
      hasNodeModules = true
    } catch {
      hasNodeModules = false
    }
    return hasNodeModules ? run : `npm install && ${run}`
  }

  // No package.json — only bare .js/.mjs/.cjs files are node-runnable
  // (.ts without a runner falls back to OneCompiler)
  if (activePath && BARE_RUNNABLE.test(activePath)) return `node ${activePath}`
  return null
}
