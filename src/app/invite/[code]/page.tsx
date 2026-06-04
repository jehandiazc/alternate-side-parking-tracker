"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Users, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type View =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "need-auth"; carName: string }
  | { status: "ready"; carId: string; carName: string }
  | { status: "joining"; carName: string }
  | { status: "error"; carName: string; message: string };

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [view, setView] = useState<View>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const supabase = createClient();

      const [{ data: { user } }, carRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("get_car_by_invite", { p_invite_code: code }),
      ]);
      if (cancelled) return;

      const car = (carRes.data as { car_id: string; car_name: string }[] | null)?.[0];
      if (!car) { setView({ status: "invalid" }); return; }

      if (!user) {
        setView({ status: "need-auth", carName: car.car_name });
      } else {
        setView({ status: "ready", carId: car.car_id, carName: car.car_name });
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [code]);

  async function handleJoin() {
    if (view.status !== "ready") return;
    setView({ status: "joining", carName: view.carName });
    const supabase = createClient();
    const { error } = await supabase.rpc("join_car_by_invite", { p_invite_code: code });
    if (error) {
      setView({ status: "error", carName: view.carName, message: error.message });
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--color-background)" }}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] p-7 text-center"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {view.status === "loading" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-[--color-primary]" />
            <p className="text-sm text-[--color-text-secondary]">Checking invite…</p>
          </div>
        )}

        {view.status === "invalid" && (
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[--color-danger-light] flex items-center justify-center">
              <AlertCircle size={26} className="text-[--color-danger]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[--color-text-primary]">
                Invite not found
              </h1>
              <p className="text-sm text-[--color-text-secondary] mt-1">
                This link is invalid or has been reset. Ask your crew for a fresh one.
              </p>
            </div>
            <Button variant="secondary" size="lg" className="w-full" asChild>
              <Link href="/">Go to ParkShare</Link>
            </Button>
          </div>
        )}

        {(view.status === "need-auth" ||
          view.status === "ready" ||
          view.status === "joining" ||
          view.status === "error") && (
          <div className="space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[--color-primary-light] flex items-center justify-center">
              <Users size={30} className="text-[--color-primary]" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[--color-text-muted] uppercase tracking-widest">
                You&apos;re invited to
              </p>
              <h1 className="text-2xl font-extrabold text-[--color-text-primary] mt-1">
                {view.carName}
              </h1>
              <p className="text-sm text-[--color-text-secondary] mt-1.5">
                Join the crew to see where it&apos;s parked and get move reminders.
              </p>
            </div>

            {view.status === "error" && (
              <p className="text-xs text-[--color-danger] bg-[--color-danger-light] rounded-[var(--radius-sm)] px-3 py-2">
                {view.message}
              </p>
            )}

            {view.status === "need-auth" ? (
              <Button variant="cta" size="lg" className="w-full" asChild>
                <Link href={`/login?next=${encodeURIComponent(`/invite/${code}`)}`}>
                  Sign in to join <ArrowRight size={18} />
                </Link>
              </Button>
            ) : (
              <Button
                variant="cta"
                size="lg"
                className="w-full"
                onClick={handleJoin}
                disabled={view.status === "joining"}
              >
                {view.status === "joining"
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Users size={18} />}
                {view.status === "joining" ? "Joining…" : "Join the crew"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
