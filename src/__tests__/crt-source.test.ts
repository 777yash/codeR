import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('preserves all five registered files from the requested ThreeUI revision', () => {
  const registered = {
    'crt/CrtBackground.tsx':
      '20932f2655319c5fc6c6b3c29c890149beec7e4850edc414f909ab24a0c95031',
    'crt/crtRenderer.ts':
      'a3eb536e9c50eeb31832e7d6d25021c1535137e8ead5eb1b864e5a27c340af03',
    'crt/crtShaders.ts':
      'cf3a7c747d1cac495c705529954e2491ad885489ddd5110724f8f4b3553f1592',
    'crt/crtScreens.ts':
      'e545922e0d3afa19b9d01840d0ea684c56d0799714f9cf77a4712921bfec7adb',
    'threeui.css':
      'efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf',
  }
  for (const [path, expected] of Object.entries(registered)) {
    const digest = createHash('sha256')
      .update(readFileSync(resolve('src/shaders', path)))
      .digest('hex')
    expect(digest, path).toBe(expected)
  }
})
