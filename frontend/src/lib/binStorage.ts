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

/**
 * Drops a bin the server no longer has, so retention deleting it server-side
 * also clears it from this browser.
 *
 * Only call this on a definite 404. A network failure or a 403 means the bin
 * may well still exist -- forgetting it would throw away the owner token,
 * which is the only thing that can ever read that bin again.
 *
 * Re-reads storage rather than filtering a caller-held array so concurrent
 * removals (the landing page checks every bin at once) can't clobber each
 * other.
 */
export function removeStoredBucket(publicId: string): StoredBucket[] {
  const updated = getStoredBuckets().filter((b) => b.public_id !== publicId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}
