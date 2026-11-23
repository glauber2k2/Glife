import React, { useEffect, useState } from 'react';

const DEFAULT_BASE = 'https://unpkg.com/lucide-static@0.460.0/icons/';
const cache = {};
const resolved = {};

function load(name, base) {
  const key = base + name;
  if (!cache[key]) {
    cache[key] = fetch(base + name + '.svg')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        const u = t ? 'url("data:image/svg+xml;utf8,' + encodeURIComponent(t.replace(/stroke-width="2"/g, 'stroke-width="1.5"')) + '")' : null;
        resolved[key] = u;
        return u;
      })
      .catch(function () { return null; });
  }
  return cache[key];
}

/** Lucide icon rendered as a CSS mask so it always takes the surrounding text colour. Stroke forced to 1.5. */
export function Icon({ name, size = 20, color, base, style }) {
  const b = base || (typeof window !== 'undefined' && window.GLIFE_ICON_BASE) || DEFAULT_BASE;
  const key = b + name;
  const [url, setUrl] = useState(resolved[key] || null);
  useEffect(function () {
    let live = true;
    if (resolved[key]) { setUrl(resolved[key]); return; }
    load(name, b).then(function (u) { if (live) setUrl(u); });
    return function () { live = false; };
  }, [key]);
  return (
    <span aria-hidden="true" style={{
      display: 'inline-block', flex: 'none', width: size, height: size,
      backgroundColor: url ? (color || 'currentColor') : 'transparent',
      WebkitMaskImage: url || 'none', maskImage: url || 'none',
      WebkitMaskSize: 'contain', maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      ...style
    }} />
  );
}
