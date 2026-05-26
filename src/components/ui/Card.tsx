import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;   // stronger shadow
  padded?: boolean;     // default padding
}

export function Card({ className, elevated = false, padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[--color-surface] rounded-[var(--radius-lg)] border border-[--color-border]",
        elevated ? "shadow-[var(--shadow-lg)]" : "shadow-[var(--shadow-sm)]",
        padded && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-base font-semibold text-[--color-text-primary] leading-snug", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[--color-text-secondary]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-[--color-border] flex items-center gap-3", className)} {...props}>
      {children}
    </div>
  );
}
