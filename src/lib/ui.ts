export const inputClass =
  'mt-1 w-full rounded-sm border-[1.5px] border-ink/40 bg-paper px-3 py-2 text-fg outline-none placeholder:text-muted/70 focus:border-ink focus:shadow-[2px_2px_0_var(--color-fluo)] disabled:cursor-not-allowed'

export const chipClass = (active: boolean) =>
  `rounded-full border border-ink px-3 py-1 text-sm transition ${
    active ? 'bg-ink text-on-ink shadow-[2px_2px_0_var(--color-fluo)]' : 'text-fg hover:bg-tint'
  }`

export const primaryButtonClass =
  'bg-ink px-5 py-2.5 font-poster text-base text-on-ink shadow-[3px_3px_0_var(--color-fluo)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_var(--color-fluo)] disabled:cursor-not-allowed disabled:opacity-40'

export const secondaryButtonClass =
  'rounded-sm border-[1.5px] border-ink px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-tint aria-pressed:bg-tint'
