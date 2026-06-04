"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, CalendarDays, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Home",     Icon: Home },
  { href: "/park",     label: "Park",     Icon: MapPin },
  { href: "/schedule", label: "Schedule", Icon: CalendarDays },
  { href: "/crew",     label: "Crew",     Icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-[--color-surface] border-t border-[--color-border]"
      style={{
        // Respect iPhone home indicator
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 0 rgba(26,26,46,0.06), 0 -4px 16px rgba(26,26,46,0.06)",
      }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 pt-1",
                "transition-colors duration-150",
                "rounded-[var(--radius-md)]",
                isActive
                  ? "text-[--color-primary]"
                  : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
              )}
            >
              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className="transition-transform duration-150 active:scale-90"
                />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[--color-accent]" />
                )}
              </span>
              <span className={cn(
                "text-[10px] font-semibold tracking-wide leading-none",
                isActive ? "text-[--color-primary]" : "text-[--color-text-muted]"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
