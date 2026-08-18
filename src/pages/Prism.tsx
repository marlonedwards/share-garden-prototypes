import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSim } from "../lib/useSim";
import { MARKET, SECTORS, AssetDef, fmtMoney, fmtPct, sectorOf, Market } from "../engine/market";
import TimeControls from "../components/TimeControls";
import TradePop from "../components/TradePop";
import Shell, { MapRow } from "../components/Shell";

const SECTOR_ORDER = ["tech", "crypto", "energy", "industry", "consumer", "health"];
// assets ordered so sectors cluster and the biggest sit near the centre
const ORDERED: AssetDef[] = [...MARKET].sort((a, b) => {
  const s = SECTOR_ORDER.indexOf(a.sector) - SECTOR_ORDER.indexOf(b.sector);
  return s !== 0 ? s : b.marketCap - a.marketCap;
});
const MAXCAP = Math.max(...MARKET.map((a) => a.marketCap));

// hex axial spiral -> flat-top pixel coords
const AX = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
function hexSpiral(n: number) {
  const out = [{ q: 0, r: 0 }];
  for (let k = 1; out.length < n; k++) {
    let q = AX[4][0] * k, r = AX[4][1] * k;
    for (let s = 0; s < 6; s++) for (let i = 0; i < k; i++) { if (out.length < n) out.push({ q, r }); q += AX[s][0]; r += AX[s][1]; }
  }
  return out;
}

interface SharedState { changes: Record<string, number>; held: Set<string>; eventScope: string | null; }

export default function Prism() {
  const { m, speed, setSpeed, act, reset, done } = useSim({ seed: 305, cash: 1000, maxStep: 150 });
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SharedState>({ changes: {}, held: new Set(), eventScope: null });
  const selRef = useRef<(a: AssetDef) => void>(() => {});
  const [sel, setSel] = useState<AssetDef | null>(null);
  selRef.current = setSel;

  const nw = m.netWorth();
  const pnl = (nw - m.start) / m.start;
  const benchPnl = (m.benchmark - m.start) / m.start;
  const ev = m.activeEvent();

  const changes: Record<string, number> = {};
  for (const a of MARKET) changes[a.id] = m.changePct(a.id, Math.max(1, m.step));
  stateRef.current = { changes, held: new Set(m.positions().map((p) => p.asset.id)), eventScope: ev?.scope ?? null };

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth, H = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
    camera.position.set(0, 10.5, 12);
    camera.lookAt(0, 0.5, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(6, 12, 8); scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.4); rim.position.set(-8, 4, -6); scene.add(rim);

    const group = new THREE.Group(); scene.add(group);
    const cells = hexSpiral(ORDERED.length);
    const S = 0.98;
    const meshes: { id: string; mesh: THREE.Mesh; baseColor: THREE.Color; h: number }[] = [];

    ORDERED.forEach((a, i) => {
      const { q, r } = cells[i];
      const x = S * 1.5 * q;
      const z = S * Math.sqrt(3) * (r + q / 2);
      const h = 0.4 + Math.sqrt(a.marketCap / MAXCAP) * 5.2;
      const geo = new THREE.CylinderGeometry(S * 0.94, S * 0.94, h, 6);
      const base = new THREE.Color(sectorOf(a.sector).color);
      const mat = new THREE.MeshStandardMaterial({ color: base, emissive: base, emissiveIntensity: 0.12, roughness: 0.45, metalness: 0.1, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h / 2, z);
      mesh.rotation.y = Math.PI / 6;
      (mesh as any).userData.id = a.id;
      group.add(mesh);
      meshes.push({ id: a.id, mesh, baseColor: base, h });
    });
    // recenter group
    const box = new THREE.Box3().setFromObject(group);
    const c = box.getCenter(new THREE.Vector3());
    group.position.x = -c.x; group.position.z = -c.z;

    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(meshes.map((m) => m.mesh))[0];
      if (hit) { const id = (hit.object as any).userData.id; const a = MARKET.find((x) => x.id === id); if (a) selRef.current(a); }
    };
    renderer.domElement.addEventListener("click", onClick);

    const up = new THREE.Color(0x2fd27a), down = new THREE.Color(0xff5d6c), white = new THREE.Color(0xffffff);
    let raf = 0, clock = 0;
    const render = () => {
      clock += 0.016;
      group.rotation.y = Math.sin(clock * 0.1) * 0.35;
      const st = stateRef.current;
      for (const item of meshes) {
        const chg = st.changes[item.id] || 0;
        const t = Math.max(-1, Math.min(1, chg / 0.06));
        const mat = item.mesh.material as THREE.MeshStandardMaterial;
        const target = t >= 0 ? up : down;
        mat.color.copy(item.baseColor).lerp(target, Math.abs(t) * 0.85);
        const holds = st.held.has(item.id);
        mat.emissive.copy(target);
        mat.emissiveIntensity = 0.12 + Math.abs(t) * 0.5 + (holds ? 0.35 : 0);
        if (holds) mat.color.lerp(white, 0.18);
        const targY = item.h / 2 + (holds ? 0.15 + 0.08 * Math.sin(clock * 3) : 0);
        item.mesh.position.y += (targY - item.mesh.position.y) * 0.15;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    const onResize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); renderer.domElement.removeEventListener("click", onClick); renderer.dispose(); mount.removeChild(renderer.domElement); };
  }, []);

  return (
    <Shell title="Prism" accent="#9b8cff"
      blurb="The same market, built from pure shapes."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-sm text-white/65 leading-relaxed mb-4">Every hexagon is a company, and sectors cluster into neighborhoods.</p>
          <MapRow left="Tower height" right="market cap" color="#9b8cff" />
          <MapRow left="Glow color" right="performance" color="#5fe39a" />
          <MapRow left="A district reddens" right="a sector shock" color="#ff8a94" />
          <MapRow left="A tower lifts" right="you own it" color="#ffffff" />
          <p className="mt-4 text-[13px] text-white/45 leading-relaxed">Tap a tower to buy or sell.</p>
        </div>
      }>
      <div className="device device-landscape flex flex-col" style={{ background: "radial-gradient(120% 90% at 50% 20%, #131a2e, #05070d 80%)" }}>
        <div className="h-11 flex items-center gap-3 px-4 flex-shrink-0 border-b border-white/6">
          <div className="text-[16px] font-bold text-white tnum leading-tight">{fmtMoney(nw)}</div>
          <span className="px-1.5 py-0.5 rounded text-[12px] font-medium tnum" style={{ background: pnl >= 0 ? "#9b8cff22" : "#ff5d6c22", color: pnl >= 0 ? "#b9aeff" : "#ff8a94" }}>{fmtPct(pnl)}</span>
          <span className="text-[12px] text-white/45 tnum">{fmtPct(pnl - benchPnl)} against the index</span>
          <div className="ml-auto"><TimeControls speed={speed} setSpeed={setSpeed} step={m.step} accent="#9b8cff" compact /></div>
        </div>

        <div ref={mountRef} className="relative flex-1 min-h-0">
          {ev && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] pop-in shadow-lg" style={{ background: "rgba(8,10,18,0.9)", border: "1px solid #ff5d6c44" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff5d6c" }} />
              <span className="font-semibold text-white/90">{ev.label}</span>
              <span className="text-white/55 truncate max-w-[380px]">{ev.blurb}</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-0 right-0 text-center text-[12px] text-white/40">Tap a tower to trade.</div>
        </div>

        <div className="h-9 flex items-center gap-4 px-4 flex-shrink-0 border-t border-white/6 text-[12px] text-white/45">
          <span>A taller tower is a bigger company.</span>
          <span className="text-[#8be0a8]">Bright is winning.</span>
          <span className="text-[#ff8a94]">Red is falling.</span>
          <span className="ml-auto tnum">{fmtMoney(m.cash)} in cash</span>
        </div>

        {sel && <TradePop a={sel} m={m} act={act} onClose={() => setSel(null)} accent="#9b8cff" />}
        {done && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/55 text-sm">The season is over.</div>
              <div className="text-4xl font-bold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-1 text-[13px]" style={{ color: pnl >= benchPnl ? "#b9aeff" : "#ff8a94" }}>You {fmtPct(pnl)}, the index {fmtPct(benchPnl)}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#9b8cff" }}>Run again</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
