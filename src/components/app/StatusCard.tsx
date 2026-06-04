"use client";

import { MapPin, Clock, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatMoveTime, formatCountdown } from "@/lib/utils";
import type { ParkingStatus } from "@/types";

interface StatusCardProps {
  carName: string;
  status: ParkingStatus;
}

export function StatusCard({ carName, status }: StatusCardProps) {
  if (status.type === "unknown") {
    return <UnknownStatus carName={carName} />;
  }

  const { log, moveAt, isSuspended } = status;
  const hoursUntilMove = (moveAt.getTime() - Date.now()) / (1000 * 60 * 60);
  const isUrgent = hoursUntilMove > 0 && hoursUntilMove <= 2;

  return (
    <Card elevated padded={false} className="overflow-hidden">
      {/* Header strip */}
      <div className="bg-[--color-primary] px-5 pt-5 pb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[--color-text-inverse] text-xs font-semibold uppercase tracking-widest opacity-60">
            {carName}
          </span>
          {isSuspended ? (
            <Badge variant="success">
              <Sparkles size={10} />
              Holiday!
            </Badge>
          ) : isUrgent ? (
            <Badge variant="danger">
              <AlertCircle size={10} />
              Move Soon
            </Badge>
          ) : (
            <Badge variant="default" className="bg-white/10 text-white border-white/20">
              Parked
            </Badge>
          )}
        </div>

        {isSuspended ? (
          <>
            <h1 className="text-2xl font-bold text-white leading-tight mt-3">
              No need to move! 🎉
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Street cleaning suspended — {(status as Extract<typeof status, { isSuspended: true }>).suspensionReason}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white leading-tight mt-3">
              Move by {formatMoveTime(moveAt)}
            </h1>
            <p className="text-white/60 text-sm mt-1">
              {formatCountdown(moveAt)}
            </p>
          </>
        )}
      </div>

      {/* Location strip */}
      <div className="px-5 py-4 flex items-center gap-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-primary-light] flex items-center justify-center">
          <MapPin size={15} className="text-[--color-primary]" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[--color-text-muted] uppercase tracking-wide">
            Parked on
          </p>
          <p className="text-sm font-semibold text-[--color-text-primary] truncate">
            {log.street_address}
            <span className="ml-1.5 text-[--color-text-muted] font-normal">
              ({log.street_side} side)
            </span>
          </p>
        </div>
      </div>

      {/* Cleaning schedule strip */}
      {!isSuspended && (
        <div className="px-5 pb-4 flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-accent-light] flex items-center justify-center">
            <Clock size={15} className="text-[--color-accent-hover]" />
          </span>
          <div>
            <p className="text-xs font-medium text-[--color-text-muted] uppercase tracking-wide">
              Street cleaning
            </p>
            <p className="text-sm font-semibold text-[--color-text-primary]">
              {formatMoveTime(moveAt)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function UnknownStatus({ carName }: { carName: string }) {
  return (
    <Card elevated padded={false} className="overflow-hidden">
      <div className="bg-[--color-surface-raised] px-5 py-8 text-center">
        <div className="text-4xl mb-3">🚗</div>
        <h1 className="text-lg font-bold text-[--color-text-primary]">
          Where's {carName}?
        </h1>
        <p className="text-sm text-[--color-text-secondary] mt-1 max-w-xs mx-auto">
          Tap <strong>Park</strong> to log where the car is parked and we'll
          handle the rest.
        </p>
      </div>
    </Card>
  );
}
