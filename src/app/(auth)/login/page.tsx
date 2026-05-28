"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Mail, Hash, Loader2, ArrowLeft } from "lucide-react";

type Step = "email" | "code";
type Status = "idle" | "loading" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("idle");
      setStep("code");
      // Focus the code input after the transition renders
      setTimeout(() => codeInputRef.current?.focus(), 50);
    }
  }

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.trim();
    if (token.length < 6) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message.includes("expired") || error.message.includes("invalid")
          ? "That code didn't work. Check the email or request a new one."
          : error.message
      );
      setCode("");
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } else {
      // Session is set — go to the app
      router.push("/");
      router.refresh();
    }
  }

  // Auto-submit once the user stops typing (debounced) — supports 6 or 8 digit codes
  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setCode(digits);
    setErrorMsg("");

    // Auto-submit: wait 600ms after the last keystroke so partial codes don't fire early
    if (digits.length >= 6) {
      setTimeout(() => {
        setCode((current) => {
          if (current === digits) {
            // Still the same value — user has stopped typing, submit
            const form = codeInputRef.current?.closest("form");
            form?.requestSubmit();
          }
          return current;
        });
      }, 600);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--color-background)" }}
    >
      {/* Logo */}
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
        {step === "email" ? (
          // ── Email step ────────────────────────────────────────────────────
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <h2 className="font-bold text-[--color-text-primary] text-lg mb-0.5">
                Sign in
              </h2>
              <p className="text-sm text-[--color-text-secondary]">
                We&apos;ll send a 6-digit code to your email.
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg("");
                  }}
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
              {status === "loading" ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          // ── Code step ─────────────────────────────────────────────────────
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setErrorMsg("");
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[--color-text-muted] hover:text-[--color-text-primary] hover:bg-[--color-border] transition-colors"
                aria-label="Back to email"
              >
                <ArrowLeft size={15} />
              </button>
              <div>
                <h2 className="font-bold text-[--color-text-primary] text-lg leading-none">
                  Check your email
                </h2>
              </div>
            </div>

            <p className="text-sm text-[--color-text-secondary]">
              We sent a 6-digit code to{" "}
              <strong className="text-[--color-text-primary]">{email}</strong>.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="code"
                className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide"
              >
                Enter code
              </label>
              <div className="relative">
                <Hash
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] pointer-events-none"
                />
                <input
                  id="code"
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  maxLength={8}
                  className="w-full h-12 pl-9 pr-4 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-xl font-bold tracking-[0.3em] text-[--color-text-primary] placeholder:text-[--color-text-muted] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent transition"
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
              disabled={status === "loading" || code.length < 6}
            >
              {status === "loading" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Hash size={18} />
              )}
              {status === "loading" ? "Verifying…" : "Sign in"}
            </Button>

            <button
              type="button"
              onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
              disabled={status === "loading"}
              className="w-full text-sm text-[--color-text-muted] hover:text-[--color-text-secondary] transition-colors disabled:opacity-50"
            >
              Didn&apos;t get it? Resend code
            </button>
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
