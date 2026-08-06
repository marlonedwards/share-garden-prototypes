import { Link } from "react-router-dom";

// The demo's front door: two games, one curriculum, one honest engine.

const S = (name: string) => `${import.meta.env.BASE_URL}sprites/t/${name}.png`;

export default function Landing() {
  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-[44px] leading-tight font-semibold tracking-tight">Financial literacy games</h1>
        <p className="mt-3 text-[17px] max-w-2xl" style={{ color: "#6e6e73" }}>
          Two visually beautiful games teach investing concepts and fundamentals. Each one
          turns the market into something you can see and play with: shares, prices, crashes,
          and what it takes to hold through them.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-5">
          <Link to="/orb" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5">
            <div className="h-28 flex items-center justify-center mb-4">
              <div className="w-24 h-24 rounded-full relative"
                style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(238,243,250,0.4) 55%, rgba(214,224,238,0.65))", boxShadow: "inset 0 0 0 1.5px rgba(30,45,80,0.12), 0 14px 28px -14px rgba(24,34,60,0.4)" }}>
                <div className="absolute inset-2.5 rounded-full overflow-hidden" style={{ filter: "blur(6px)" }}>
                  <div className="w-full h-full" style={{ background: "conic-gradient(from 220deg, #0a84ff, #bf5af2 40%, #ff9f0a 75%, #0a84ff)" }} />
                </div>
                <div className="absolute rounded-full" style={{ left: "24%", top: "14%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", transform: "rotate(-25deg)" }} />
              </div>
            </div>
            <div className="text-[12px] font-semibold" style={{ color: "#0071e3" }}>Game one</div>
            <div className="text-[22px] font-semibold tracking-tight">The Orb</div>
            <p className="text-[13.5px] mt-1.5" style={{ color: "#6e6e73" }}>
              Your portfolio is one glass marble. Companies are colors, the sealed rainbow orb is
              the index, and crashes deflate prices, never your shares. Five short Basics lessons,
              a guided tutorial, six eras of real market history, and a final planning lesson run
              in order as one course, and an open sandbox waits beside them.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#0071e3" }}>Play the Orb</div>
          </Link>

          <Link to="/garden" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5">
            <div className="h-28 flex items-center justify-center mb-4">
              <img src={S("pumpkin")} alt="" style={{ height: 104 }} />
            </div>
            <div className="text-[12px] font-semibold" style={{ color: "#3f6b3a" }}>Game two</div>
            <div className="text-[22px] font-semibold tracking-tight">Share Garden</div>
            <p className="text-[13.5px] mt-1.5" style={{ color: "#6e6e73" }}>
              Share Garden teaches the same first lesson in a garden. Plant size is the market price, selling is
              transplanting to another gardener, the co-op field is the index, and frost is the
              crash you tend through.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#3f6b3a" }}>Play Share Garden</div>
          </Link>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-5">
          <Link to="/objectives" className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
            <div className="text-[15px] font-semibold tracking-tight">Learning objectives</div>
            <p className="text-[13px] mt-1" style={{ color: "#6e6e73" }}>
              Every unit is mapped to CEE and Jump$tart standards, with the misconception it busts
              and its assessment hook. The whole page prints on one sheet.
            </p>
          </Link>
          <Link to="/archive" className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
            <div className="text-[15px] font-semibold tracking-tight">First-week prototypes</div>
            <p className="text-[13px] mt-1" style={{ color: "#6e6e73" }}>
              The earlier explorations are kept here for reference.
            </p>
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/orb/intro" className="text-[12.5px] font-medium transition hover:opacity-75" style={{ color: "#0071e3" }}>
            New here, or showing a friend? Play the Orb's intro.
          </Link>
        </div>

        <p className="mt-10 text-[12.5px]" style={{ color: "#a1a1a6" }}>
          Everything here is free and open source, with no accounts and no logins, and it runs
          in a browser on a Chromebook. A deterministic simulation engine replays real historical
          market data, and every number is inspectable.
        </p>
      </main>
    </div>
  );
}
