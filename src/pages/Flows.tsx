import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSim } from "../lib/useSim";
import { SECTORS, ASSETS, fmtMoney, fmtPct, Market } from "../engine/market";
import TimeControls from "../components/TimeControls";
import Shell, { MapRow } from "../components/Shell";

// Each sector node maps to one representative asset you can pour capital into.
const NODES = [
  { sector: "tech", asset: "nova" },
  { sector: "energy", asset: "volt" },
  { sector: "industry", asset: "iron" },
  { sector: "consumer", asset: "cane" },
  { sector: "health", asset: "aura" },
  { sector: "crypto", asset: "btx" },
  { sector: "index", asset: "coop" },
];
const INVEST = 120;
const INDEX_SECTOR = { id: "index", label: "Index", color: "#7ee0c0" };
function sectorMeta(id: string) { return id === "index" ? INDEX_SECTOR : SECTORS.find((s) => s.id === id)!; }

interface SharedState { values: Record<string, number>; cash: number; changes: Record<string, number>; eventScope: string | null; }

export default function Flows() {
  const { m, speed, setSpeed, act, reset, done } = useSim({ seed: 7, cash: 1200, maxStep: 150 });
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SharedState>({ values: {}, cash: 0, changes: {}, eventScope: null });
  const burstRef = useRef<(sector: string, dir: number) => void>(() => {});
  const [, setV] = useState(0);

  const nw = m.netWorth();
  const pnl = (nw - m.start) / m.start;
  const benchPnl = (m.benchmark - m.start) / m.start;
  const ev = m.activeEvent();

  // publish latest sim state for the render loop to read
  const values: Record<string, number> = {};
  const changes: Record<string, number> = {};
  for (const n of NODES) {
    const h = m.holdings[n.asset];
    values[n.sector] = h ? h.shares * m.prices[n.asset] : 0;
    changes[n.sector] = m.changePct(n.asset, 3);
  }
  stateRef.current = { values, cash: m.cash, changes, eventScope: ev?.scope ?? null };

  const invest = (sector: string) => {
    const n = NODES.find((x) => x.sector === sector)!;
    if (m.cash < 10) return;
    act((mk) => mk.buy(n.asset, Math.min(INVEST, mk.cash)));
    burstRef.current(sector, 1);
    if (speed === 0) setSpeed(1);
    setV((x) => x + 1);
  };
  const withdraw = (sector: string) => {
    const n = NODES.find((x) => x.sector === sector)!;
    if (!m.holdings[n.asset]) return;
    act((mk) => mk.sellFraction(n.asset, 0.5));
    burstRef.current(sector, -1);
    setV((x) => x + 1);
  };

  // ---- three.js scene ----
  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth, H = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 2.4, 11.5);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pt = new THREE.PointLight(0xffffff, 1.1); pt.position.set(0, 6, 6); scene.add(pt);

    const ring = new THREE.Group(); scene.add(ring);

    // central cash core
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffcf6a, emissiveIntensity: 0.7, roughness: 0.3 }));
    scene.add(core);

    // sector nodes on a circle
    const R = 3.5;
    const nodeMeshes: Record<string, THREE.Mesh> = {};
    const nodePos: Record<string, THREE.Vector3> = {};
    NODES.forEach((n, i) => {
      const ang = (i / NODES.length) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(ang) * R, Math.sin(ang) * R * 0.55, Math.sin(ang) * 1.2);
      nodePos[n.sector] = pos;
      const col = new THREE.Color(sectorMeta(n.sector).color);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 28),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, roughness: 0.35 }));
      mesh.position.copy(pos);
      (mesh as any).userData.sector = n.sector;
      ring.add(mesh);
      nodeMeshes[n.sector] = mesh;
      // link line core->node
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.22 }));
      ring.add(line);
    });

    // correlation links between similar sectors (faint)
    const corr: [string, string][] = [["tech", "crypto"], ["energy", "industry"], ["consumer", "health"]];
    corr.forEach(([a, b]) => {
      const lg = new THREE.BufferGeometry().setFromPoints([nodePos[a], nodePos[b]]);
      ring.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 })));
    });

    // particle system: capital flowing core<->nodes
    const PER = 14;
    const parts: { sector: string; t: number; dir: number; speed: number; life: number }[] = [];
    NODES.forEach((n) => { for (let i = 0; i < PER; i++) parts.push({ sector: n.sector, t: Math.random(), dir: 1, speed: 0.004 + Math.random() * 0.004, life: 0 }); });
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(parts.length * 3);
    const pCol = new Float32Array(parts.length * 3);
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    burstRef.current = (sector: string, dir: number) => {
      for (const p of parts) if (p.sector === sector) { p.dir = dir; p.life = 40; p.speed = 0.02; }
    };

    // raycast click to invest
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(Object.values(nodeMeshes))[0];
      if (hit) invest((hit.object as any).userData.sector);
    };
    renderer.domElement.addEventListener("click", onClick);

    let raf = 0; let clock = 0;
    const tmp = new THREE.Vector3();
    const render = () => {
      clock += 0.016;
      ring.rotation.y = Math.sin(clock * 0.12) * 0.28;
      const st = stateRef.current;
      const maxV = Math.max(150, ...Object.values(st.values));
      core.scale.setScalar(0.8 + Math.min(1.4, st.cash / 800));
      (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55 + 0.25 * Math.sin(clock * 2);

      for (const n of NODES) {
        const mesh = nodeMeshes[n.sector];
        const v = st.values[n.sector] || 0;
        const target = 0.34 + 0.85 * Math.sqrt(v / maxV);
        mesh.scale.setScalar(mesh.scale.x + (target - mesh.scale.x) * 0.1);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const chg = st.changes[n.sector] || 0;
        const hot = st.eventScope === "market" || st.eventScope === n.sector;
        mat.emissiveIntensity = 0.4 + Math.min(0.9, Math.abs(chg) * 14) + (hot ? 0.4 * (0.5 + 0.5 * Math.sin(clock * 8)) : 0);
        mat.emissive.set(hot ? 0xff5d6c : sectorMeta(n.sector).color);
      }

      // particles
      const worldNode: Record<string, THREE.Vector3> = {};
      for (const n of NODES) worldNode[n.sector] = nodePos[n.sector].clone().applyMatrix4(ring.matrixWorld);
      ring.updateMatrixWorld();
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const alloc = (st.values[p.sector] || 0) / maxV;
        const spd = p.life > 0 ? p.speed : 0.0025 + alloc * 0.006;
        p.t += spd * p.dir;
        if (p.t > 1) { p.t = 0; p.dir = 1; if (p.life > 0) p.life--; }
        if (p.t < 0) { p.t = 1; p.dir = 1; if (p.life > 0) p.life = 0; }
        if (p.life > 0) p.life--; else p.speed = 0.004;
        const np = worldNode[p.sector];
        tmp.copy(np).multiplyScalar(p.t); // core(0) -> node
        const wob = Math.sin(p.t * Math.PI) * 0.25;
        tmp.x += Math.sin(clock * 3 + i) * wob;
        tmp.y += Math.cos(clock * 2 + i) * wob;
        pPos[i * 3] = tmp.x; pPos[i * 3 + 1] = tmp.y; pPos[i * 3 + 2] = tmp.z;
        const hot = st.eventScope === "market" || st.eventScope === p.sector;
        const c = new THREE.Color(hot ? 0xff5d6c : sectorMeta(p.sector).color);
        const bright = 0.5 + 0.5 * Math.sin(p.t * Math.PI);
        pCol[i * 3] = c.r * bright; pCol[i * 3 + 1] = c.g * bright; pCol[i * 3 + 2] = c.b * bright;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); renderer.domElement.removeEventListener("click", onClick); renderer.dispose(); mount.removeChild(renderer.domElement); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell title="Flows" tag="the systems view" accent="#9b8cff"
      blurb="Money as a living field. Structure, not soil."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[11px] tracking-[0.03em] font-medium text-white/40 mb-3">The translation</div>
          <MapRow left="The bright core" right="your cash" color="#ffe6a8" />
          <MapRow left="A glowing node" right="a market sector" color="#9b8cff" />
          <MapRow left="Streams of light" right="capital you route" color="#9b8cff" />
          <MapRow left="Faint node-to-node lines" right="correlation" color="#ffffff" />
          <MapRow left="A node flares red" right="a sector shock" color="#ff8a94" />
          <p className="mt-4 text-xs text-white/45 leading-relaxed">
            You decide where money flows. Pour everything into one node and watch a shock drain it. Spread across the field, or
            feed the calm index node, and the system stays balanced. Diversification and correlation become things you can see, not terms to memorize.
          </p>
          <p className="mt-3 text-xs text-white/35 leading-relaxed">Tap a node in the field or use the chips below to route capital.</p>
        </div>
      }>
      <div className="device device-portrait flex flex-col" style={{ background: "radial-gradient(120% 80% at 50% 30%, #101d33, #05080f 75%)" }}>
        <div className="h-9 flex items-center justify-between px-5 text-[11px] text-white/40 tnum flex-shrink-0">
          <span>9:41</span><span className="font-semibold tracking-wide text-white/60">FLOWS</span><span>day {m.step}</span>
        </div>

        <div className="px-5 pt-1 pb-2 flex-shrink-0">
          <div className="text-[11px] text-white/45">Total capital</div>
          <div className="text-[30px] leading-none font-semibold text-white tnum">{fmtMoney(nw)}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] tnum">
            <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: pnl >= 0 ? "#9b8cff22" : "#ff5d6c22", color: pnl >= 0 ? "#b9aeff" : "#ff8a94" }}>{fmtPct(pnl)}</span>
            <span className="text-white/40">index pace</span>
            <span className="text-white/60">{fmtPct(benchPnl)}</span>
          </div>
        </div>

        {/* three.js field */}
        <div ref={mountRef} className="relative h-[300px] flex-shrink-0">
          {ev && (
            <div className="absolute top-2 left-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] pop-in" style={{ background: "#ff5d6c18", border: "1px solid #ff5d6c33" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff5d6c" }} />
              <span className="font-semibold text-white/85">{ev.label}</span>
              <span className="text-white/55 truncate">{ev.blurb}</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/30">tap a node to route capital into it</div>
        </div>

        {/* controls */}
        <div className="px-4 py-2 border-y border-white/6 flex items-center justify-between flex-shrink-0">
          <TimeControls speed={speed} setSpeed={setSpeed} step={m.step} accent="#9b8cff" compact />
          <span className="text-[11px] text-white/45 tnum">cash {fmtMoney(m.cash)}</span>
        </div>

        {/* sector chips */}
        <div className="p-2.5 grid grid-cols-2 gap-1.5 flex-1 content-start overflow-hidden">
          {NODES.map((n) => {
            const meta = sectorMeta(n.sector);
            const h = m.holdings[n.asset];
            const val = h ? h.shares * m.prices[n.asset] : 0;
            const chg = m.changePct(n.asset, 3);
            return (
              <div key={n.sector} className="rounded-lg px-2 py-1.5 border" style={{ borderColor: meta.color + "33", background: meta.color + "0e" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  <span className="text-[11px] font-semibold text-white truncate">{meta.label}</span>
                  <span className="ml-auto text-[10px] tnum" style={{ color: chg >= 0 ? "#8be0a8" : "#ff8a94" }}>{fmtPct(chg)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-white tnum flex-1">{fmtMoney(val)}</span>
                  <button onClick={() => invest(n.sector)} disabled={m.cash < 10} className="px-2 py-1 rounded-md text-[10px] font-semibold text-black disabled:opacity-30" style={{ background: meta.color }}>route in</button>
                  <button onClick={() => withdraw(n.sector)} disabled={!h} className="px-1.5 py-1 rounded-md text-[10px] font-medium text-white/70 bg-white/5 disabled:opacity-25">out</button>
                </div>
              </div>
            );
          })}
        </div>

        {done && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/60 text-sm">The season settles</div>
              <div className="text-4xl font-semibold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-2" style={{ color: pnl >= benchPnl ? "#b9aeff" : "#ff8a94" }}>you {fmtPct(pnl)} {" / "} index {fmtPct(benchPnl)}</div>
              <div className="text-xs text-white/55 max-w-[260px] mx-auto">{pnl >= benchPnl ? "You steered well this run. Concentration can win, until it does not." : "The balanced index node rode the shocks better than your bets did."}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#9b8cff" }}>Run again</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
