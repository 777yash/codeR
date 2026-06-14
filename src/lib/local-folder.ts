const DB_NAME = 'coder-local-folders'
const STORE = 'handles'

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveFolderHandle(
  roomId: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await requestToPromise(tx.objectStore(STORE).put(handle, roomId))
  } finally {
    db.close()
  }
}

export async function getFolderHandle(
  roomId: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const result = await requestToPromise(
      tx.objectStore(STORE).get(roomId) as IDBRequest<
        FileSystemDirectoryHandle | undefined
      >
    )
    return result ?? null
  } finally {
    db.close()
  }
}

export async function clearFolderHandle(roomId: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await requestToPromise(tx.objectStore(STORE).delete(roomId))
  } finally {
    db.close()
  }
}

export async function ensureFolderPermission(
  handle: FileSystemDirectoryHandle,
  ask: boolean
): Promise<boolean> {
  const descriptor = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(descriptor)) === 'granted') return true
  if (!ask) return false
  return (await handle.requestPermission(descriptor)) === 'granted'
}
