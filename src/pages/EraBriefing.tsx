import { Link, Navigate, useParams } from "react-router-dom";
import { SCENARIOS } from "../lib/scenarios";

// The optional pre-play read for an era: a designed one-to-two minute page of
// real history, written strictly as of the era's first month plus the dated
// record of what followed. It is linked from the scenario card and from gate
// references, and it is never forced before play. Eras whose briefing is not
// written yet send the reader straight to the scenario instead, and an id
// that matches no era goes back to the scenario shelf (a strict lookup here,
// not getScenario, which quietly falls back to the first era).

export default function EraBriefing() {
  const { id } = useParams();
  const cfg = SCENARIOS.find((s) => s.id === id);
  if (!cfg) return <Navigate to="/orb" replace />;
  const b = cfg.briefing;
  if (!b) return <Navigate to={`/orb/s/${cfg.id}`} replace />;

  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/orb" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Scenarios
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">{cfg.title}</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#6e6e73" }}>Era briefing</span>
        </div>
        <Link to={`/orb/s/${cfg.id}`} className="ml-auto text-[13px] font-medium px-4 py-1.5 rounded-full text-white transition hover:brightness-110"
          style={{ background: "#0071e3" }}>
          Play the era
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 pb-16">
        <div className="text-[12px] font-semibold" style={{ color: "#0071e3" }}>Era briefing · {b.readTime}</div>
        <h1 className="mt-1 text-[30px] font-semibold tracking-tight leading-tight">{b.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#6e6e73" }}>{b.deck}</p>

        {b.sections.map((s) => (
          <section key={s.heading} className="mt-7 rounded-2xl bg-white border border-black/8 shadow-sm p-6">
            <div className="text-[12px] font-semibold" style={{ color: "#6e6e73" }}>{s.heading}</div>
            <p className="mt-1.5 text-[16px] font-semibold tracking-tight leading-snug">{s.lead}</p>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-[14px] leading-relaxed" style={{ color: "#3a3a3c" }}>{p}</p>
            ))}
          </section>
        ))}

        {b.timeline.length > 0 && (
          <section className="mt-7 rounded-2xl bg-white border border-black/8 shadow-sm p-6">
            <div className="text-[12px] font-semibold" style={{ color: "#6e6e73" }}>The era, dated</div>
            <div className="mt-3 flex flex-col">
              {b.timeline.map((t, i) => (
                <div key={t.date} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ background: "#0071e3" }} />
                    {i < b.timeline.length - 1 && <span className="w-px flex-1 my-1" style={{ background: "rgba(0,0,0,0.12)" }} />}
                  </div>
                  <div className={i < b.timeline.length - 1 ? "pb-4" : ""}>
                    <div className="text-[12.5px] font-semibold tnum">{t.date}</div>
                    <div className="text-[13.5px] leading-relaxed" style={{ color: "#3a3a3c" }}>{t.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {b.sources.length > 0 && (
          <p className="mt-5 text-[12.5px]">
            <span style={{ color: "#6e6e73" }}>Read more: </span>
            {b.sources.map((r, i) => (
              <span key={r.url}>
                {i > 0 && <span style={{ color: "#6e6e73" }}> · </span>}
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#0071e3", textDecoration: "none", borderBottom: "1px dotted #0071e3" }}>
                  {r.label}
                </a>
              </span>
            ))}
          </p>
        )}

        <div className="mt-7 flex items-center gap-4">
          <Link to={`/orb/s/${cfg.id}`} className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition hover:brightness-110 shadow-sm whitespace-nowrap flex-shrink-0"
            style={{ background: "#0071e3" }}>
            {cfg.startLabel}
          </Link>
          <span className="text-[12.5px]" style={{ color: "#6e6e73" }}>
            You can play without reading any of this.
          </span>
        </div>
      </main>
    </div>
  );
}
