const STORAGE_KEY = 'requestbin:lastBin'

export interface StoredBin {
  publicId: string
  ownerToken: string
}

/**
 * Reads the most recently created bin from localStorage. This is the
 * contract 260-14 (Create Bin UI) writes to on bin creation:
 * `localStorage["requestbin:lastBin"] = JSON.stringify({ publicId, ownerToken })`.
 */
export function getStoredBin(): StoredBin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      'publicId' in parsed &&
      'ownerToken' in parsed &&
      typeof parsed.publicId === 'string' &&
      typeof parsed.ownerToken === 'string'
    ) {
      return { publicId: parsed.publicId, ownerToken: parsed.ownerToken }
    }
    return null
  } catch {
    return null
  }
}
