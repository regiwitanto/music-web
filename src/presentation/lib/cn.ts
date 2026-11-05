// Adapted from shadcn/ui (MIT). See THIRD_PARTY_NOTICES.md.
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * The design system's typography tokens (design-system §3) are `text-*` font
 * sizes. Without this, tailwind-merge would read `text-title-1` as a colour
 * and drop it when merged with a colour such as `text-muted`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'title-1', 'title-2', 'title-3', 'body', 'body-strong', 'caption', 'micro'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
