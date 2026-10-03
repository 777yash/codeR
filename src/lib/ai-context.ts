// Shared by browser filtering and server enforcement. Do not send these paths to AI.
const SECRET_FILE = /(^|\/)\.env|\.(pem|key)$|secret|credential/i
export function isSensitiveAiFile(name: string): boolean {
  return SECRET_FILE.test(name.replace(/\\/g, '/'))
}
