import React, { useEffect, useRef, useState } from 'react';

function springPts(z, ms) {
  const N = 40, T = ms / 1000, pts = [], w = 6.9 / (z * T), wd = w * Math.sqrt(1 - z * z);
  for (let i = 0; i <= N; i++) { const t = (i / N) * T; pts.push(1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))); }
  pts[N] = 1;
  return pts;
}
const PTS = springPts(0.82, 350);
function ease(x) { const n = PTS.length - 1, f = Math.min(1, Math.max(0, x)) * n, i = Math.floor(f); return i >= n ? 1 : PTS[i] + (PTS[i + 1] - PTS[i]) * (f - i); }
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Big tabular money figure that counts to its value on the emph spring (350ms). */
export function AnimatedAmount({ value, from = 0, format = brl, size = 44, duration = 350, style }) {
  const [shown, setShown] = useState(from);
  const cur = useRef(from);
  useEffect(() => {
    const start = cur.current, t0 = performance.now();
    let raf;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / duration);
      cur.current = start + (value - start) * ease(k);
      setShown(cur.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const track = size >= 40 ? '-0.045em' : '-0.02em';
  return <div style={{ fontSize: size, fontWeight: size >= 40 ? 300 : 400, letterSpacing: track, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'var(--ink1)', ...style }}>{format(shown)}</div>;
}
