// Signal à aligner sur un repère plan : une image découpée en fragments flottants, qui ne se recompose que vue d'un point donné. Paramètres : cfg.
export async function creerSignal(THREE, cfg) {
  const { cx, cy, w, n = [6, 3], oeil, tol = 0.1, loin = 0.6, duree = 0.8, s = [0.05, 0.2], graine = 1 } = cfg, L = 0x5ff3e6;
  const tex = await new THREE.TextureLoader().loadAsync(cfg.img); tex.colorSpace = THREE.SRGBColorSpace;
  const h = w * tex.image.height / tex.image.width, [nc, nl] = n, tw = w / nc, th = h / nl;
  const a = oeil.angle * Math.PI / 180, E = new THREE.Vector3(Math.sin(a) * oeil.d, cy + (oeil.haut || 0), Math.cos(a) * oeil.d);
  let s0 = graine >>> 0; const alea = () => (s0 = (s0 * 1664525 + 1013904223) >>> 0) / 4294967296;
  const g = new THREE.Group(), tuiles = [];
  for (let j = 0; j < nl; j++) for (let i = 0; i < nc; i++) {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1 / nc, 1 / nl); t.offset.set(i / nc, 1 - (j + 1) / nl);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false }));
    const Q = new THREE.Vector3(cx - w / 2 + (i + 0.5) * tw, cy + h / 2 - (j + 0.5) * th, 0.004), f = s[0] + (s[1] - s[0]) * alea();
    m.userData = { Q, P: Q.clone().lerp(E, f), k: 1 - f, tour: (alea() * 2 - 1) * Math.PI, ph: alea() * 6.28 }; m.renderOrder = 5;
    g.add(m); tuiles.push(m);
  }
  const mc = new THREE.MeshBasicMaterial({ color: L, transparent: true, opacity: 0, depthTest: false }), ep = 0.012;
  for (const [bw, bh, px, py] of [[w + 2 * ep, ep, 0, h / 2 + ep / 2], [w + 2 * ep, ep, 0, -h / 2 - ep / 2], [ep, h, -w / 2 - ep / 2, 0], [ep, h, w / 2 + ep / 2, 0]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mc); c.position.set(cx + px, cy + py, 0.004); c.renderOrder = 6; g.add(c); }

  const pos = new THREE.Vector3(), tmp = new THREE.Vector3(); let vu = false, e = 9, tenu = 0, acc = false, t1 = 0, tp = null;
  const ecart = () => { let mx = 0; if (pos.z <= 0.01) return 99;
    for (const m of tuiles) { const P = m.userData.P, Q = m.userData.Q, f = pos.z / (pos.z - P.z); mx = Math.max(mx, Math.hypot(pos.x + (P.x - pos.x) * f - Q.x, pos.y + (P.y - pos.y) * f - Q.y) / tw); }
    return mx; };
  return {
    group: g,
    maj(t, camera, suivi) {
      const dt = tp === null ? 0 : Math.min(0.2, t - tp); tp = t;
      if (suivi) { g.updateWorldMatrix(true, false); g.worldToLocal(camera.getWorldPosition(tmp)); if (vu) pos.lerp(tmp, 0.25); else { pos.copy(tmp); vu = true; }
        e = pos.distanceTo(E) / E.length();
        if (!acc) { tenu = e < tol ? tenu + dt : Math.max(0, tenu - dt); if (tenu >= duree) { acc = true; t1 = t; } } }
      const q = acc ? Math.min(1, (t - t1) / 0.6) : 0, u = q * q * (3 - 2 * q);
      const br = acc ? 0 : Math.min(1, Math.max(0, (e - tol * 0.5) / (loin - tol * 0.5)));
      for (const m of tuiles) { const d = m.userData;
        m.position.copy(d.P).lerp(d.Q, u); m.scale.setScalar(d.k + (1 - d.k) * u);
        m.rotation.z = (d.tour * br + 0.06 * Math.sin(t * 2 + d.ph) * Math.min(1, br * 4)) * (1 - u);
        m.material.opacity = 0.55 + 0.45 * (1 - br) - 0.15 * br * (0.5 + 0.5 * Math.sin(t * 7 + d.ph)); }
      mc.opacity = acc ? 0.5 + 0.4 * u : 0.25 * (1 - br);
    },
    etat() {
      return { signal: acc ? 100 : Math.round(100 * Math.max(0, 1 - e / loin)), aligne: e < tol, accroche: acc, ecart: Math.round(ecart() * 100) / 100,
        dist: Math.round(pos.length() * 100) / 100, angle: Math.round(Math.atan2(pos.x, pos.z) * 57.3) };
    },
  };
}
