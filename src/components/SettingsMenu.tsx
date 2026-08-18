import { useEffect, useRef, useState } from "react";
import { OrbSettings } from "../lib/settings";

// The gear in the header: presentation toggles that persist across games.

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between gap-6 py-2 text-left">
      <span className="text-[13px]">{label}</span>
      <span className="relative inline-block w-9 h-[22px] rounded-full transition-colors flex-shrink-0"
        style={{ background: on ? "#34c759" : "rgba(0,0,0,0.12)" }}>
        <span className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all"
          style={{ left: on ? 18 : 2 }} />
      </span>
    </button>
  );
}

export default function SettingsMenu({ settings, update }: {
  settings: OrbSettings;
  update: (patch: Partial<OrbSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Settings"
        className="flex items-center justify-center w-8 h-8 rounded-full opacity-50 hover:opacity-90 transition"
        style={open ? { opacity: 0.9, background: "rgba(0,0,0,0.06)" } : undefined}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-60 rounded-2xl bg-white border border-black/8 shadow-lg p-4 pop-in">
          <div className="text-[12px] font-semibold mb-1" style={{ color: "#6e6e73" }}>Scene</div>
          <ToggleRow label="Headline clippings" on={settings.clippings}
            onToggle={() => update({ clippings: !settings.clippings })} />
          <ToggleRow label="Live ticker" on={settings.ticker}
            onToggle={() => update({ ticker: !settings.ticker })} />
          <div className="mt-2 pt-2 text-[12px] border-t border-black/8" style={{ color: "#a1a1a6" }}>
            Saved on this computer, for every game.
          </div>
        </div>
      )}
    </div>
  );
}
