import { BottomNav } from "@/components/app/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/app/ServiceWorkerRegistrar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // overflow-hidden prevents the map from bleeding outside the viewport
    <div className="relative min-h-full bg-[--color-background] overflow-hidden">
      {/* Register the push notification service worker on every app page */}
      <ServiceWorkerRegistrar />
      {/*
        Pages that want full-bleed map layouts (e.g. dashboard, park)
        manage their own internal padding for the bottom nav.
        Other pages get a default bottom pad here via the BottomNav spacer.
      */}
      <main className="h-full">{children}</main>
      <BottomNav />
    </div>
  );
}
