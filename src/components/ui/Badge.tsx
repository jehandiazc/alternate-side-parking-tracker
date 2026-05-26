import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        default:  "bg-[--color-primary-light]  text-[--color-primary]",
        accent:   "bg-[--color-accent-light]   text-[--color-accent-hover]",
        success:  "bg-[--color-success-light]  text-[#4a7a3a]",
        warning:  "bg-[--color-warning-light]  text-[--color-accent-hover]",
        danger:   "bg-[--color-danger-light]   text-[--color-danger]",
        muted:    "bg-[--color-surface-raised] text-[--color-text-muted]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
