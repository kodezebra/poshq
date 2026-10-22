import { tv, type VariantProps } from "tailwind-variants";

/**
 * Instrument button system — rectangular 6px controls, one filled action per
 * surface. Secondary is neutral-outlined rather than accent-outlined so it
 * never competes with the primary it sits beside.
 */
export const buttonVariants = tv({
  base: [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  variants: {
    variant: {
      primary:
        "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-press",
      secondary:
        "border border-hairline-input bg-canvas text-ink-secondary hover:bg-canvas-sunken hover:text-ink active:bg-canvas-sunken",
      dark: "bg-chrome text-chrome-ink hover:bg-chrome-raised active:bg-chrome",
      ghost: "text-ink-secondary hover:bg-canvas-sunken hover:text-ink",
      danger: "bg-danger text-on-primary hover:brightness-95 active:brightness-90",
    },
    size: {
      sm: "h-8 rounded-sm px-3 text-button-sm",
      md: "h-9 rounded-sm px-4 text-button-md",
      icon: "size-8 rounded-sm",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;
