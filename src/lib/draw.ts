import type { Filters, MediaType } from '../types'

// Films and series are numbered separately on TMDB (film 1399 and series 1399 are different titles), so a
// title is only identified by its type and id together.
export const titleKey = (mediaType: MediaType, id: number) => `${mediaType}:${id}`

interface TitleId {
  id: number
  mediaType: MediaType
}

/**
 * The titles a draw must never return: set-aside ones always, seen ones unless the filters ask to include
 * them, and the title currently on stage so "Autre tirage" really gives another one.
 */
export function drawExclusions(
  filters: Pick<Filters, 'includeSeen'>,
  seen: TitleId[],
  ignored: TitleId[],
  current: TitleId | null,
): Set<string> {
  const keys = new Set<string>()
  if (!filters.includeSeen) for (const t of seen) keys.add(titleKey(t.mediaType, t.id))
  for (const t of ignored) keys.add(titleKey(t.mediaType, t.id))
  if (current) keys.add(titleKey(current.mediaType, current.id))
  return keys
}

/** The exclusions plus the recent draws: tried first, so a draw doesn't land on what came up lately. */
export function withRecentDraws(excluded: Set<string>, recent: TitleId[]): Set<string> {
  return new Set([...excluded, ...recent.map((t) => titleKey(t.mediaType, t.id))])
}

/**
 * Draws while avoiding recent draws, and only lets them back when nothing else matches the filters
 * (a narrow selection may have fewer titles than the history holds).
 */
export async function drawAvoidingRecent<T>(
  excluded: Set<string>,
  recent: TitleId[],
  draw: (excluded: Set<string>) => Promise<T | null>,
): Promise<T | null> {
  if (recent.length > 0) {
    const fresh = await draw(withRecentDraws(excluded, recent))
    if (fresh) return fresh
  }
  return draw(excluded)
}
