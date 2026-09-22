// URL parameters — Rancho
//
//   ?mock=N     invented inhabitants instead of the real snapshot (up to 5000)
//   ?u=nombre   open the ranch on that inhabitant
//   ?debug=1    frame and memory counters

export const DEFAULT_MOCK = 100
export const MAX_MOCK = 5000

export interface RanchParams {
  mock: number
  /** True only when ?mock= was actually given: without it the page loads the real snapshot. */
  mockRequested: boolean
  user: string | null
  debug: boolean
}

export function readRanchParams(search: string): RanchParams {
  const params = new URLSearchParams(search)
  const raw = params.get('mock')
  const parsed = raw === null ? NaN : Number.parseInt(raw, 10)
  const mock = Number.isFinite(parsed) ? Math.max(0, Math.min(MAX_MOCK, parsed)) : DEFAULT_MOCK
  const user = params.get('u')?.trim() || null
  return { mock, mockRequested: raw !== null, user, debug: params.get('debug') === '1' }
}

/** Current URL with `u` set (or removed), other parameters untouched. */
export function urlWithUser(href: string, user: string | null): string {
  const url = new URL(href)
  if (user) url.searchParams.set('u', user)
  else url.searchParams.delete('u')
  return url.pathname + url.search + url.hash
}
