/**
 * Community API client — all production endpoints in one place.
 */
const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

export async function fetchCategoryCounts() {
  const res = await fetch('/api/v1/stats/categories')
  if (!res.ok) throw new Error('Failed to load category counts')
  return res.json() as Promise<Array<{ category: string; label: string; count: number }>>
}

export async function fetchActiveTags(limit = 12) {
  const res = await fetch(`/api/v1/tags/?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to load tags')
  return res.json() as Promise<Array<{ name: string; slug: string; count: number }>>
}

export async function fetchNotifications(token: string) {
  const res = await fetch('/api/v1/users/me/notifications', { headers: authHeaders(token) })
  if (!res.ok) return []
  return res.json()
}

export async function markNotificationRead(token: string, id: number) {
  await fetch(`/api/v1/users/me/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  })
}

// Admin APIs
export async function adminFetchProblems(token: string, params: URLSearchParams) {
  const res = await fetch(`/api/v1/admin/questions?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Failed to load problems')
  return res.json()
}

export async function adminUpdateProblem(token: string, id: number, body: Record<string, unknown>) {
  const res = await fetch(`/api/v1/admin/questions/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update problem')
  return res.json()
}

export async function adminDeleteProblem(token: string, id: number) {
  const res = await fetch(`/api/v1/admin/questions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete problem')
  return res.json()
}

export async function adminBulkProblems(token: string, ids: number[], action: string) {
  const res = await fetch('/api/v1/admin/questions/bulk', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ ids, action }),
  })
  if (!res.ok) throw new Error('Bulk action failed')
  return res.json()
}

export async function adminFetchTags(token: string) {
  const res = await fetch('/api/v1/admin/tags', { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Failed to load tags')
  return res.json()
}

export async function adminCreateTag(token: string, name: string) {
  const res = await fetch('/api/v1/admin/tags', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create tag')
  return res.json()
}

export async function adminRenameTag(token: string, id: number, name: string) {
  const res = await fetch(`/api/v1/admin/tags/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to rename tag')
  return res.json()
}

export async function adminMergeTag(token: string, id: number, target: string) {
  const res = await fetch(`/api/v1/admin/tags/${id}/merge`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ target }),
  })
  if (!res.ok) throw new Error('Failed to merge tag')
  return res.json()
}

export async function adminDeleteTag(token: string, id: number) {
  const res = await fetch(`/api/v1/admin/tags/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete tag')
}

export async function adminFetchSettings(token: string) {
  const res = await fetch('/api/v1/admin/settings', { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Failed to load settings')
  return res.json()
}

export async function adminSaveSettings(token: string, settings: Record<string, unknown>) {
  const res = await fetch('/api/v1/admin/settings', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error('Failed to save settings')
  return res.json()
}

export async function adminFetchActivity(token: string) {
  const res = await fetch('/api/v1/admin/activity', { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Failed to load activity')
  return res.json()
}

export async function adminFetchReviews(token: string) {
  const res = await fetch('/api/v1/admin/reviews', { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Failed to load reviews')
  return res.json()
}

export async function adminToggleReview(token: string, id: number) {
  const res = await fetch(`/api/v1/admin/reviews/${id}/toggle`, {
    method: 'PUT',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to toggle review visibility')
  return res.json()
}

export async function adminDeleteReview(token: string, id: number) {
  const res = await fetch(`/api/v1/admin/reviews/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete review')
}
