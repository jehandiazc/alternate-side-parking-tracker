"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Car, Users, Loader2 } from "lucide-react";

const CAR_SUGGESTIONS = ["The Civic", "The Beast", "Old Reliable", "The Chariot", "My Car"];

type Mode = "create" | "join";

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [carName, setCarName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setErrorMsg("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = carName.trim();
    if (!name) return;

    setStatus("loading");
    setErrorMsg("");
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Create the car
    const { data: car, error: carError } = await supabase
      .from("cars")
      .insert({
        name,
        created_by: user.id,
        make: make.trim() || null,
        model: model.trim() || null,
        color: color.trim() || null,
      })
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
    router.refresh();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = inviteCode.trim();
    if (!code) return;

    setStatus("loading");
    setErrorMsg("");
    const supabase = createClient();

    const { error } = await supabase.rpc("join_car_by_invite", { p_invite_code: code });
    if (error) {
      setStatus("error");
      setErrorMsg(
        /invalid invite/i.test(error.message)
          ? "That code didn't match a car. Double-check it with your crew."
          : error.message
      );
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
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🚗</div>
        <h1 className="text-2xl font-extrabold text-[--color-text-primary]">
          {mode === "create" ? "Name your car" : "Join a car"}
        </h1>
        <p className="text-sm text-[--color-text-secondary] mt-1 max-w-xs">
          {mode === "create"
            ? "Give your shared car a name. Your roommates will see this when they join."
            : "Enter the invite code a roommate shared with you."}
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
        {/* Mode toggle */}
        <div className="flex p-1 rounded-[var(--radius-md)] bg-[--color-background] border border-[--color-border]">
          {(["create", "join"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={[
                "flex-1 h-9 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors",
                mode === m
                  ? "bg-[--color-surface] text-[--color-primary] shadow-[var(--shadow-sm)]"
                  : "text-[--color-text-muted] hover:text-[--color-text-secondary]",
              ].join(" ")}
            >
              {m === "create" ? "Create a car" : "Join with code"}
            </button>
          ))}
        </div>

        {mode === "create" ? (
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

            {/* Optional vehicle details */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide">
                Details <span className="font-normal normal-case text-[--color-text-muted]">— optional</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" maxLength={24} placeholder="Make (Honda)"
                  value={make} onChange={(e) => setMake(e.target.value)}
                  className="h-10 px-3 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
                />
                <input
                  type="text" maxLength={24} placeholder="Model (Civic)"
                  value={model} onChange={(e) => setModel(e.target.value)}
                  className="h-10 px-3 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
                />
              </div>
              <input
                type="text" maxLength={24} placeholder="Color (Silver)"
                value={color} onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
              />
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
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="invite-code"
                className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide"
              >
                Invite code
              </label>
              <div className="relative">
                <Users
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] pointer-events-none"
                />
                <input
                  id="invite-code"
                  type="text"
                  autoFocus
                  maxLength={6}
                  autoCapitalize="characters"
                  placeholder="A1B2C3"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                  required
                  className="w-full h-11 pl-9 pr-4 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm font-bold tracking-[0.25em] text-[--color-text-primary] placeholder:text-[--color-text-muted] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
                />
              </div>
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
              disabled={status === "loading" || !inviteCode.trim()}
            >
              {status === "loading" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Users size={18} />
              )}
              {status === "loading" ? "Joining…" : "Join car"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
