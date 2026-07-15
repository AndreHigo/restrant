"use client";

import { useEffect, useRef, useState } from "react";
import { BellRingIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductionAlertBannerProps = {
  pendingCount: number;
};

function playShortAlert() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audio.currentTime);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.28);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.3);
}

export function ProductionAlertBanner({ pendingCount }: ProductionAlertBannerProps) {
  const previousPending = useRef(pendingCount);
  const [muted, setMuted] = useState(false);
  const hasPending = pendingCount > 0;

  useEffect(() => {
    setMuted(window.localStorage.getItem("restaurant-brasil-production-muted") === "true");
  }, []);

  useEffect(() => {
    if (pendingCount > previousPending.current && !muted) {
      playShortAlert();
    }

    previousPending.current = pendingCount;
  }, [muted, pendingCount]);

  function toggleMuted() {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem("restaurant-brasil-production-muted", String(next));
      return next;
    });
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        hasPending
          ? "border-amber-200 bg-amber-50 text-amber-950 shadow-sm"
          : "border-emerald-200 bg-emerald-50 text-emerald-950"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full",
            hasPending ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
          )}
        >
          <BellRingIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{hasPending ? "Alerta de producao" : "Producao em dia"}</p>
          <p className="mt-1 text-sm opacity-80">
            {hasPending
              ? `${pendingCount} item(ns) pendente(s) aguardando inicio de preparo.`
              : "Nenhum item pendente nos setores agora."}
          </p>
        </div>
      </div>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-current/20 px-3 text-sm font-medium transition hover:bg-white/50"
        type="button"
        onClick={toggleMuted}
      >
        {muted ? <VolumeXIcon className="h-4 w-4" /> : <Volume2Icon className="h-4 w-4" />}
        {muted ? "Som silenciado" : "Som ativo"}
      </button>
    </section>
  );
}
