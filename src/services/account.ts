export async function deleteCloudAccount(accessToken: string, password: string) {
  const response = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ password }),
  })
  const result = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' })) as { deleted?: boolean; error?: string }
  if (!response.ok) throw new Error(result.error || 'The account could not be deleted.')
  return result.deleted === true
}
