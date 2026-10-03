export function prepareGistFiles(files: { name: string; content: string }[]) {
  const result: Record<string, { content: string }> = Object.create(null)
  const paths = new Set<string>()
  for (const file of files) {
    if (!file.content.trim()) continue
    const path = file.name.trim().replaceAll('\\', '/')
    if (!path || /[\u0000-\u001f\u007f]/.test(path) || paths.has(path)) {
      throw new Error(
        'File names must be unique and contain no control characters.'
      )
    }
    paths.add(path)
    // Gists have no directories. Encode separators without losing extensions.
    const flattened = path.replaceAll('%', '%25').replaceAll('/', '%2F')
    const name = /^gistfile\d+$/i.test(flattened)
      ? `export-${flattened}`
      : flattened
    if (name.length > 255) throw new Error('A file name is too long to export.')
    result[name] = { content: file.content }
  }
  return result
}
