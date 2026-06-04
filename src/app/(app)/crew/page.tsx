"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Crown, UserMinus, RefreshCw, Check, Share2,
  Pencil, LogOut, Loader2, MapPin, Car as CarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import type { Car, CrewMember } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Up to two initials from a display name; "?" when we have nothing.
function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic warm-palette avatar color from an opaque id.
const AVATAR_COLORS = ["#2D3561", "#F0A500", "#7FB069", "#C96F4A", "#5B7DB1"];
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function joinedLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface CrewState {
  status: "loading" | "no-car" | "ready";
  car: Car | null;
  isOwner: boolean;
  members: CrewMember[];
  myId: string | null;
}

export default function CrewPage() {
  const router = useRouter();
  const [state, setState] = useState<CrewState>({
    status: "loading",
    car: null,
    isOwner: false,
    members: [],
    myId: null,
  });

  // Transient UI state
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingCar, setEditingCar] = useState(false);
  const [carDraft, setCarDraft] = useState({ make: "", model: "", color: "" });
  const [savingCar, setSavingCar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Load car + crew roster.
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: sub } = await supabase
        .from("car_subscriptions")
        .select("cars(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      const car = (sub as unknown as { cars: Car } | null)?.cars ?? null;
      if (!car) {
        setState({ status: "no-car", car: null, isOwner: false, members: [], myId: user.id });
        return;
      }

      const { data: crew, error: crewError } = await supabase
        .rpc("get_car_crew", { p_car_id: car.id });

      if (crewError) setError(crewError.message);

      setState({
        status: "ready",
        car,
        isOwner: car.created_by === user.id,
        members: (crew as CrewMember[]) ?? [],
        myId: user.id,
      });
    }

    load();

    // Realtime: RLS scopes car_subscriptions reads to the caller's own rows, so
    // this primarily fires when *you* are added or removed — e.g. an owner kicks
    // you and your view refreshes (you lose the car). Other members' changes
    // surface on the next load/navigation.
    const channel = supabase
      .channel("crew_subscriptions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "car_subscriptions" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const { car, isOwner, members, myId } = state;

  // "Silver Honda Civic" — only the filled-in parts.
  const carSpec = car ? [car.color, car.make, car.model].filter(Boolean).join(" ") : "";

  const inviteUrl =
    typeof window !== "undefined" && car
      ? `${window.location.origin}/invite/${car.invite_code}`
      : "";

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleShare() {
    if (!inviteUrl || !car) return;
    const shareData = {
      title: "Join my car on ParkShare",
      text: `Help me keep track of ${car.name} on ParkShare.`,
      url: inviteUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user dismissed the share sheet — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Long-press to copy it manually.");
    }
  }

  async function handleRegenerate() {
    if (!car) return;
    setRegenerating(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("regenerate_invite_code", { p_car_id: car.id });
    setRegenerating(false);
    if (error) { setError(error.message); return; }
    setState((s) => (s.car ? { ...s, car: { ...s.car, invite_code: data as string } } : s));
  }

  async function handleRemove(memberId: string) {
    if (!car) return;
    setRemovingId(memberId);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("car_subscriptions")
      .delete()
      .eq("car_id", car.id)
      .eq("user_id", memberId);
    setRemovingId(null);
    if (error) { setError(error.message); return; }
    // Optimistic — realtime will also fire, but update immediately for snappiness
    setState((s) => ({ ...s, members: s.members.filter((m) => m.user_id !== memberId) }));
  }

  async function handleLeave() {
    if (!car || !myId) return;
    setLeaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("car_subscriptions")
      .delete()
      .eq("car_id", car.id)
      .eq("user_id", myId);
    if (error) { setLeaving(false); setError(error.message); return; }
    router.push("/");
    router.refresh();
  }

  function startEditCar() {
    if (!car) return;
    setCarDraft({ make: car.make ?? "", model: car.model ?? "", color: car.color ?? "" });
    setEditingCar(true);
  }

  async function saveCarDetails() {
    if (!car) return;
    setSavingCar(true);
    setError(null);
    const patch = {
      make: carDraft.make.trim() || null,
      model: carDraft.model.trim() || null,
      color: carDraft.color.trim() || null,
    };
    const supabase = createClient();
    const { error } = await supabase.from("cars").update(patch).eq("id", car.id);
    setSavingCar(false);
    if (error) { setError(error.message); return; }
    setEditingCar(false);
    setState((s) => (s.car ? { ...s, car: { ...s.car, ...patch } } : s));
  }

  function startEditName() {
    const me = members.find((m) => m.user_id === myId);
    setNameDraft(me?.display_name ?? "");
    setEditingName(true);
  }

  async function saveName() {
    const name = nameDraft.trim();
    if (!name || !myId) { setEditingName(false); return; }
    setSavingName(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", myId);
    setSavingName(false);
    if (error) { setError(error.message); return; }
    setEditingName(false);
    setState((s) => ({
      ...s,
      members: s.members.map((m) => (m.user_id === myId ? { ...m, display_name: name } : m)),
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[--color-background]">
        <Loader2 size={28} className="animate-spin text-[--color-primary]" />
      </div>
    );
  }

  if (state.status === "no-car") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 px-6 bg-[--color-background] text-center">
        <Users size={40} className="text-[--color-text-muted]" />
        <h1 className="text-xl font-extrabold text-[--color-text-primary]">No crew yet</h1>
        <p className="text-sm text-[--color-text-secondary] max-w-xs">
          Set up a car or join one with an invite link to start a crew.
        </p>
        <Button variant="cta" size="lg" asChild>
          <Link href="/setup"><MapPin size={18} /> Set up a car</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-28 max-w-lg mx-auto">
      <header>
        <h1 className="text-2xl font-extrabold text-[--color-text-primary]">The Crew</h1>
        <p className="text-sm text-[--color-text-secondary] mt-1">
          Everyone watching <span className="font-semibold text-[--color-text-primary]">{car?.name}</span>.
        </p>
      </header>

      {error && (
        <p className="mt-4 text-xs text-[--color-danger] bg-[--color-danger-light] rounded-[var(--radius-sm)] px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Car details ── */}
      <section className="mt-6 rounded-[var(--radius-lg)] bg-[--color-surface] border border-[--color-border] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[--color-primary-light] flex items-center justify-center">
              <CarIcon size={16} className="text-[--color-primary]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[--color-text-primary] leading-tight truncate">{car?.name}</p>
              <p className="text-xs text-[--color-text-secondary] leading-tight truncate">
                {carSpec || (isOwner ? "Add make, model & color" : "No details yet")}
              </p>
            </div>
          </div>
          {isOwner && !editingCar && (
            <button
              onClick={startEditCar}
              aria-label="Edit car details"
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[--color-text-muted] hover:text-[--color-primary] hover:bg-[--color-surface-raised] transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        {isOwner && editingCar && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Make" maxLength={24} value={carDraft.make}
                onChange={(e) => setCarDraft((d) => ({ ...d, make: e.target.value }))}
                className="h-9 px-3 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
              />
              <input
                placeholder="Model" maxLength={24} value={carDraft.model}
                onChange={(e) => setCarDraft((d) => ({ ...d, model: e.target.value }))}
                className="h-9 px-3 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
              />
            </div>
            <input
              placeholder="Color" maxLength={24} value={carDraft.color}
              onChange={(e) => setCarDraft((d) => ({ ...d, color: e.target.value }))}
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[--color-border] bg-[--color-background] text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            />
            <div className="flex gap-2 pt-1">
              <Button variant="cta" size="sm" className="flex-1" onClick={saveCarDetails} disabled={savingCar}>
                {savingCar ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingCar(false)} disabled={savingCar}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Members ── */}
      <ul className="mt-6 space-y-2">
        {members.map((m) => {
          const isMe = m.user_id === myId;
          const editingMe = isMe && editingName;
          return (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[--color-surface] border border-[--color-border] p-3 shadow-[var(--shadow-sm)]"
            >
              <span
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: avatarColor(m.user_id) }}
                aria-hidden
              >
                {initials(m.display_name)}
              </span>

              <div className="min-w-0 flex-1">
                {editingMe ? (
                  <input
                    autoFocus
                    value={nameDraft}
                    maxLength={40}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-[--color-primary] bg-[--color-background] text-sm font-semibold text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                  />
                ) : (
                  <p className="text-sm font-bold text-[--color-text-primary] leading-tight truncate">
                    {m.display_name ?? "Crew member"}
                  </p>
                )}
                <p className="text-[11px] text-[--color-text-muted] leading-tight mt-0.5">
                  Joined {joinedLabel(m.joined_at)}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {m.is_owner && (
                  <Badge variant="accent"><Crown size={10} /> Owner</Badge>
                )}
                {isMe && !m.is_owner && <Badge variant="muted">You</Badge>}

                {/* Edit own name */}
                {isMe && (
                  editingMe ? (
                    <button
                      onClick={saveName}
                      disabled={savingName}
                      aria-label="Save name"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[--color-success] hover:bg-[--color-success-light] transition-colors"
                    >
                      {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                    </button>
                  ) : (
                    <button
                      onClick={startEditName}
                      aria-label="Edit your name"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[--color-text-muted] hover:text-[--color-primary] hover:bg-[--color-surface-raised] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  )
                )}

                {/* Owner removing another member */}
                {isOwner && !isMe && (
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removingId === m.user_id}
                    aria-label={`Remove ${m.display_name ?? "this member"} from the crew`}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[--color-text-muted] hover:text-[--color-danger] hover:bg-[--color-danger-light] transition-colors"
                  >
                    {removingId === m.user_id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <UserMinus size={15} />}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Invite ── */}
      <section className="mt-8 rounded-[var(--radius-lg)] bg-[--color-surface] border border-[--color-border] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[--color-text-primary]">Invite your crew</h2>
        <p className="text-sm text-[--color-text-secondary] mt-0.5">
          Share this link so roommates can watch {car?.name} too.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 text-center text-lg font-bold tracking-[0.25em] text-[--color-primary] bg-[--color-primary-light] rounded-[var(--radius-md)] py-2.5">
            {car?.invite_code}
          </code>
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="cta" size="md" className="flex-1" onClick={handleShare}>
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "Copied!" : "Share invite link"}
          </Button>
          {isOwner && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleRegenerate}
              disabled={regenerating}
              aria-label="Generate a new invite code"
              title="Generate a new code — the old link stops working"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </Button>
          )}
        </div>

        {isOwner && (
          <p className="mt-2.5 text-[11px] text-[--color-text-muted] flex items-start gap-1.5">
            <RefreshCw size={12} className="mt-0.5 flex-shrink-0" />
            Regenerating makes the old link stop working — use it after removing someone.
          </p>
        )}
      </section>

      {/* ── Leave ── */}
      <div className="mt-6">
        {isOwner ? (
          <p className="text-center text-[11px] text-[--color-text-muted] px-4">
            You own {car?.name}. To leave, delete the car from settings (coming soon)
            so your crew isn&apos;t left without an owner.
          </p>
        ) : (
          <Button
            variant="ghost"
            size="md"
            className="w-full text-[--color-danger] hover:bg-[--color-danger-light]"
            onClick={handleLeave}
            disabled={leaving}
          >
            {leaving ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Leave {car?.name}
          </Button>
        )}
      </div>
    </div>
  );
}
