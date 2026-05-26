"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles — all buttons share these
  [
    "inline-flex items-center justify-center gap-2",
    "font-semibold whitespace-nowrap select-none",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[--color-primary] text-[--color-text-inverse]",
          "hover:bg-[--color-primary-hover]",
          "shadow-[var(--shadow-sm)]",
        ],
        accent: [
          "bg-[--color-accent] text-[--color-text-primary]",
          "hover:bg-[--color-accent-hover]",
          "shadow-[var(--shadow-sm)]",
        ],
        secondary: [
          "bg-[--color-surface-raised] text-[--color-text-primary]",
          "hover:bg-[--color-border]",
          "border border-[--color-border]",
        ],
        ghost: [
          "text-[--color-text-secondary]",
          "hover:bg-[--color-surface-raised] hover:text-[--color-text-primary]",
        ],
        danger: [
          "bg-[--color-danger] text-white",
          "hover:bg-[#c94f4f]",
        ],
        // The big satisfying "I Just Parked" CTA
        cta: [
          "bg-[--color-primary] text-[--color-text-inverse]",
          "shadow-[0_8px_32px_rgba(45,53,97,0.35)]",
          "hover:bg-[--color-primary-hover] hover:shadow-[0_12px_40px_rgba(45,53,97,0.45)]",
          "hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-[var(--shadow-sm)]",
          "transition-all duration-[250ms] cubic-bezier(0.34,1.56,0.64,1)",
        ],
      },
      size: {
        sm:   "h-8  px-3   text-sm  rounded-[var(--radius-sm)]",
        md:   "h-10 px-4   text-sm  rounded-[var(--radius-md)]",
        lg:   "h-12 px-6   text-base rounded-[var(--radius-md)]",
        xl:   "h-14 px-8   text-lg  rounded-[var(--radius-lg)]",
        icon: "h-10 w-10          rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
