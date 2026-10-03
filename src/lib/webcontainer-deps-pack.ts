import { getBootedWebContainer } from '@/lib/webcontainer'
import { getFolderHandle, ensureFolderPermission } from '@/lib/local-folder'

// node_modules persisted to the linked folder as ONE packed file: copying
// 10k+ small files through the browser FS API takes minutes, a single blob
// takes seconds. Packing/unpacking runs as a node script INSIDE the container
// (native fs), so the JS side only moves one Uint8Array. Symlinks
// (node_modules/.bin) and file modes are preserved.
export const NODE_MODULES_PACK = 'node_modules.pack'
// Temp lives inside node_modules — every watcher/export walk already excludes it
const TEMP = 'node_modules/.pack.tmp'

// Entry: [type u8: 0=file 1=symlink][mode u32][pathLen u32][dataLen u32][path][data]
const PACK_SCRIPT = `
const fs=require('fs');
const bufs=[Buffer.from('NMPK1')];
(function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name==='.pack.tmp')continue;
    const f=dir+'/'+e.name;
    let type,data;
    if(e.isSymbolicLink()){type=1;data=Buffer.from(fs.readlinkSync(f))}
    else if(e.isDirectory()){walk(f);continue}
    else if(e.isFile()){type=0;data=fs.readFileSync(f)}
    else continue;
    const mode=fs.lstatSync(f).mode;
    const p=Buffer.from(f);
    const h=Buffer.alloc(13);
    h.writeUInt8(type,0);h.writeUInt32LE(mode,1);
    h.writeUInt32LE(p.length,5);h.writeUInt32LE(data.length,9);
    bufs.push(h,p,data);
  }
})('node_modules');
fs.writeFileSync('${TEMP}',Buffer.concat(bufs));
`

const UNPACK_SCRIPT = `
const fs=require('fs'),path=require('path');
const b=fs.readFileSync('${TEMP}');
if(b.slice(0,5).toString()!=='NMPK1')process.exit(1);
let o=5;
while(o+13<=b.length){
  const type=b.readUInt8(o),mode=b.readUInt32LE(o+1);
  const pl=b.readUInt32LE(o+5),dl=b.readUInt32LE(o+9);o+=13;
  const f=b.slice(o,o+pl).toString();o+=pl;
  const d=b.slice(o,o+dl);o+=dl;
  if(!f.startsWith('node_modules/')||f.includes('..'))continue;
  fs.mkdirSync(path.dirname(f),{recursive:true});
  try{
    if(type===1)fs.symlinkSync(d.toString(),f);
    else fs.writeFileSync(f,d,{mode:mode&0o777});
  }catch{}
}
`

async function runNode(script: string): Promise<number> {
  const booted = getBootedWebContainer()
  if (!booted) return -1
  const container = await booted
  const proc = await container.spawn('node', ['-e', script])
  return proc.exit
}

export async function packNodeModules(): Promise<Uint8Array | null> {
  const booted = getBootedWebContainer()
  if (!booted) return null
  const container = await booted
  try {
    await container.fs.readdir('node_modules')
  } catch {
    return null
  }
  if ((await runNode(PACK_SCRIPT)) !== 0) return null
  try {
    const bytes = await container.fs.readFile(TEMP)
    await container.fs.rm(TEMP).catch(() => undefined)
    return bytes
  } catch {
    return null
  }
}

let saving = false

export async function saveNodeModulesToDisk(roomId: string): Promise<void> {
  if (saving) return
  saving = true
  try {
    const handle = await getFolderHandle(roomId).catch(() => null)
    if (!handle) return
    if (!(await ensureFolderPermission(handle, false))) return
    const bytes = await packNodeModules()
    if (!bytes || bytes.length === 0) return
    const fileHandle = await handle.getFileHandle(NODE_MODULES_PACK, {
      create: true,
    })
    const writable = await fileHandle.createWritable()
    await writable.write(bytes as unknown as FileSystemWriteChunkType)
    await writable.close()
  } catch {
    // best effort — npm install remains the fallback restore path
  } finally {
    saving = false
  }
}

export async function restoreNodeModulesFromDisk(
  roomId: string
): Promise<boolean> {
  const booted = getBootedWebContainer()
  if (!booted) return false
  const handle = await getFolderHandle(roomId).catch(() => null)
  if (!handle) return false
  if (!(await ensureFolderPermission(handle, false))) return false

  let bytes: Uint8Array
  try {
    const fileHandle = await handle.getFileHandle(NODE_MODULES_PACK)
    bytes = new Uint8Array(await (await fileHandle.getFile()).arrayBuffer())
  } catch {
    return false
  }
  if (bytes.length === 0) return false

  const container = await booted
  try {
    await container.fs.mkdir('node_modules', { recursive: true })
    await container.fs.writeFile(TEMP, bytes)
    const exitCode = await runNode(UNPACK_SCRIPT)
    await container.fs.rm(TEMP).catch(() => undefined)
    return exitCode === 0
  } catch {
    return false
  }
}
