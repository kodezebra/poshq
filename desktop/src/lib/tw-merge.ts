import { extendTailwindMerge } from "tailwind-merge"

/**
 * Tailwind v4 derives type sizes from `--text-*`, so the utilities they
 * generate (`text-button-md`, `text-caption`, `text-display-lg` …) look exactly
 * like colour utilities (`text-on-primary`, `text-ink-mute`) to tailwind-merge.
 * The merger treats both as text colour and keeps only the last one, which
 * silently deleted `text-on-primary` from every filled button and the size
 * from every label that also set a colour.
 *
 * Registering the scale as font sizes lets size and colour survive together.
 * Keep this list in step with the `--text-*` tokens in app.css; a missing name
 * reintroduces the bug for that one size.
 */
const FONT_SIZES = [
  "display-xxl",
  "display-xl",
  "display-lg",
  "display-md",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-lg",
  "body-md",
  "body-tabular",
  "button-md",
  "button-sm",
  "caption",
  "micro",
  "micro-cap",
]

export const twMergeConfig = {
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
}

/** The one merger every component uses, configured for the Instrument scale. */
export const twMerge = extendTailwindMerge(twMergeConfig)
