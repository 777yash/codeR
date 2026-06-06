import 'server-only'
import * as Y from 'yjs'
import { gunzipSync } from 'zlib'

// Mirrors collab-server/src/codec.ts. Tagged container: [0x59, 0x5A, flags, ...payload].
// Untagged bytes are legacy V1 updates (pre-compression snapshots).
const MAGIC_0 = 0x59
const MAGIC_1 = 0x5a
const FLAG_V2 = 0x01
const FLAG_GZIP = 0x02

export function decodeInto(doc: Y.Doc, bytes: Uint8Array): void {
  const tagged =
    bytes.length >= 3 && bytes[0] === MAGIC_0 && bytes[1] === MAGIC_1
  if (!tagged) {
    Y.applyUpdate(doc, bytes)
    return
  }
  const flags = bytes[2]
  let payload = bytes.subarray(3)
  if (flags & FLAG_GZIP) {
    payload = new Uint8Array(gunzipSync(Buffer.from(payload)))
  }
  if (flags & FLAG_V2) Y.applyUpdateV2(doc, payload)
  else Y.applyUpdate(doc, payload)
}
