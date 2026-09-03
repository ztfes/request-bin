export function formatReceivedAt(receivedAt: string): string {
  const date = new Date(receivedAt)
  if (Number.isNaN(date.getTime())) return receivedAt
  return date.toLocaleString()
}
