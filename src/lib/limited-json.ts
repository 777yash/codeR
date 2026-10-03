export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413) {
    super(status === 413 ? 'Request too large' : 'Invalid JSON request')
  }
}

/** Bound actual bytes, including chunked bodies, before parsing JSON. */
export async function readLimitedJson(
  req: Request | Response,
  limit: number
): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > limit)
    throw new RequestBodyError(413)
  const reader = req.body?.getReader()
  if (!reader) throw new RequestBodyError(400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyError(413)
      }
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch (error) {
    if (error instanceof RequestBodyError) throw error
    throw new RequestBodyError(400)
  } finally {
    reader.releaseLock()
  }
}
