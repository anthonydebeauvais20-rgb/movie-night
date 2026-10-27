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
