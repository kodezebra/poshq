import { tv, type VariantProps } from "tailwind-variants";

/**
 * Stripi button system — pill geometry, tight 8/16 padding,
 * indigo primary reserved for the single filled action per surface.
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
        "bg-primary text-on-primary hover:bg-primary-deep active:bg-primary-press",
      secondary:
        "border border-primary bg-canvas text-primary hover:bg-primary/5 active:bg-primary/10",
      dark: "bg-brand-dark text-on-primary hover:bg-brand-dark/90 active:bg-brand-dark/80",
      ghost: "text-ink-secondary hover:bg-canvas-soft hover:text-ink",
      danger: "bg-ruby text-on-primary hover:brightness-95 active:brightness-90",
    },
    size: {
      sm: "h-9 rounded-pill px-4 text-button-sm",
      md: "h-10 rounded-pill px-4 text-button-md",
      icon: "size-9 rounded-md",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;
