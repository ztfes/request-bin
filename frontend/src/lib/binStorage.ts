const STORAGE_KEY = 'buckets'

export interface StoredBucket {
  public_id: string
  owner_token: string
}

/**
 * Reads the bins created in this browser. This is the contract
 * CreateBucket.tsx writes to on bin creation:
 * `localStorage["buckets"] = JSON.stringify([{ public_id, owner_token }, ...])`.
 */
export function getStoredBuckets(): StoredBucket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (entry): entry is StoredBucket =>
        entry &&
        typeof entry === 'object' &&
        typeof (entry as StoredBucket).public_id === 'string' &&
        typeof (entry as StoredBucket).owner_token === 'string',
    )
  } catch {
    return []
  }
}

export function getOwnerToken(publicId: string): string | null {
  const match = getStoredBuckets().find((b) => b.public_id === publicId)
  return match?.owner_token ?? null
}

export function addStoredBucket(bucket: StoredBucket): StoredBucket[] {
  const updated = [...getStoredBuckets(), bucket]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}
