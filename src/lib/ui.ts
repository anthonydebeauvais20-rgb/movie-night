export const inputClass =
  'mt-1 w-full rounded-sm border border-line/60 bg-paper px-3 py-2 text-fg outline-none placeholder:text-muted/70 focus:border-ink disabled:cursor-not-allowed'

export const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    active ? 'border-action bg-action text-on-action' : 'border-line text-fg hover:bg-tint'
  }`

export const primaryButtonClass =
  'rounded-sm bg-action px-5 py-2.5 font-poster text-base text-on-action transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40'

export const secondaryButtonClass =
  'rounded-sm border border-line px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-tint aria-pressed:bg-tint'
