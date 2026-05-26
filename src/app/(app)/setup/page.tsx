"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Car, Loader2 } from "lucide-react";

const CAR_SUGGESTIONS = ["The Civic", "The Beast", "Old Reliable", "The Chariot", "My Car"];

export default function SetupPage() {
  const router = useRouter();
  const [carName, setCarName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = carName.trim();
    if (!name) return;

    setStatus("loading");
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Create the car
    const { data: car, error: carError } = await supabase
      .from("cars")
      .insert({ name, created_by: user.id })
      .select("id")
      .single();

    if (carError || !car) {
      setStatus("error");
      setErrorMsg(carError?.message ?? "Failed to create car");
      return;
    }

    // Subscribe the creator to their own car
    const { error: subError } = await supabase
      .from("car_subscriptions")
      .insert({ car_id: car.id, user_id: user.id });

    if (subError) {
      setStatus("error");
      setErrorMsg(subError.message);
      return;
    }

    router.push("/");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--color-background)" }}
    >
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🚗</div>
        <h1 className="text-2xl font-extrabold text-[--color-text-primary]">
          Name your car
        </h1>
        <p className="text-sm text-[--color-text-secondary] mt-1 max-w-xs">
          Give your shared car a name. Your roommates will see this when they join.
        </p>
      </div>

      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] p-6 space-y-5"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="car-name"
              className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide"
            >
              Car name
            </label>
            <div className="relative">
              <Car
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] pointer-events-none"
              />
              <input
                id="car-name"
                type="text"
                autoFocus
                maxLength={40}
                placeholder="e.g. The Civic"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                required
                className="w-full h-11 pl-9 pr-4 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {CAR_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCarName(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-[--color-border] bg-[--color-surface-raised] text-[--color-text-secondary] hover:border-[--color-primary] hover:text-[--color-primary] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs text-[--color-danger] bg-[--color-danger-light] rounded-[var(--radius-sm)] px-3 py-2">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            variant="cta"
            size="lg"
            className="w-full"
            disabled={status === "loading" || !carName.trim()}
          >
            {status === "loading" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Car size={18} />
            )}
            {status === "loading" ? "Creating…" : "Create car"}
          </Button>
        </form>
      </div>
    </div>
  );
}
