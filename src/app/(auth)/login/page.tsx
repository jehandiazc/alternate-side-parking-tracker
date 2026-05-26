"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--color-background)" }}
    >
      {/* Logo mark */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🚗</div>
        <h1 className="text-2xl font-extrabold text-[--color-text-primary]">
          ParkShare
        </h1>
        <p className="text-sm text-[--color-text-secondary] mt-1">
          Alternate side parking, handled.
        </p>
      </div>

      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] p-6"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {status === "sent" ? (
          /* ── Success state ── */
          <div className="text-center space-y-3 py-4">
            <CheckCircle2
              size={40}
              className="mx-auto text-[--color-success]"
            />
            <h2 className="font-bold text-[--color-text-primary] text-lg">
              Check your email
            </h2>
            <p className="text-sm text-[--color-text-secondary]">
              We sent a magic link to{" "}
              <strong className="text-[--color-text-primary]">{email}</strong>.
              Tap it to sign in — no password needed.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm text-[--color-text-muted] underline underline-offset-2 mt-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* ── Email form ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="font-bold text-[--color-text-primary] text-lg mb-0.5">
                Sign in
              </h2>
              <p className="text-sm text-[--color-text-secondary]">
                We&apos;ll email you a magic link — no password required.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide"
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-9 pr-4 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
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
              disabled={status === "loading" || !email.trim()}
            >
              {status === "loading" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Mail size={18} />
              )}
              {status === "loading" ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-6 text-xs text-[--color-text-muted] text-center max-w-xs">
        By signing in you agree to use this app responsibly and not get any
        parking tickets. 🚔
      </p>
    </div>
  );
}
