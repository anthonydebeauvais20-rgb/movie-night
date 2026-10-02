export type SpineStyle = 'ink' | 'fluo' | 'over' | 'tint' | 'outline'

const CYCLE: SpineStyle[] = ['ink', 'outline', 'fluo', 'tint', 'over']

// A title always gets the same spine, on the draw shelf, on its jaquette and in the library.
export function spineStyleFor(id: number): SpineStyle {
  return CYCLE[id % CYCLE.length]
}

export function spineHeightFor(id: number): number {
  return 128 + (id % 5) * 8
}
