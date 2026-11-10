// Réponse lumineuse ancrée sur un repère rond (jeton, couvercle). Paramètres : cfg ; aucune donnée de jeu ici.
export async function creerReponse(THREE, cfg) {
  const { r, cx = 0, cy = 0, duree = 3200 } = cfg, L = 0x5ff3e6, A = 0xffb84d, T = Math.PI * 2;
  const g = new THREE.Group(); g.position.set(cx, cy, 0); g.visible = false;
  const plat = (c, o = 0) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });

  const N = cfg.segments || 24, segs = [];
  for (let i = 0; i < N; i++) {
    const s = new THREE.Mesh(new THREE.RingGeometry(r * 1.03, r * 1.11, 6, 1, Math.PI / 2 - (i + 0.9) * T / N, T / N * 0.8), plat(i % 6 ? L : A));
    s.position.z = 0.002; g.add(s); segs.push(s);
  }
  const ondes = [];
  for (let k = 0; k < 3; k++) { const o = new THREE.Mesh(new THREE.RingGeometry(0.965, 1, 64), plat(L)); o.position.z = 0.001; g.add(o); ondes.push(o); }

  const H = cfg.hauteur || 0.9;
  const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.6, H, 40, 1, true), plat(L));
  faisceau.material.blending = THREE.AdditiveBlending; faisceau.rotation.x = Math.PI / 2; faisceau.position.z = H / 2; g.add(faisceau);

  const balise = new THREE.Group(), k = r * 0.42;
  const noyau = new THREE.Mesh(new THREE.IcosahedronGeometry(k * 0.5, 1), new THREE.MeshStandardMaterial({ color: L, emissive: L, emissiveIntensity: 0.9, roughness: 0.3 }));
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(k * 0.85, 0), new THREE.MeshBasicMaterial({ color: A, wireframe: true }));
  balise.add(noyau, cage, new THREE.PointLight(0xffffff, 1.2, 0, 0)); g.add(balise);

  let panneau = null;
  if (cfg.panneau) {
    const t = await new THREE.TextureLoader().loadAsync(cfg.panneau.img); t.colorSpace = THREE.SRGBColorSpace;
    const w = cfg.panneau.w || 2 * r, h = w * t.image.height / t.image.width, m = plat(0xffffff); m.map = t;
    panneau = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); panneau.position.set(0, r * 1.11 + 0.05 + h / 2, 0.01); g.add(panneau);
  }

  let t0 = null, q = 0;
  const lisse = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  return {
    group: g,
    lancer() { if (t0 === null) { t0 = performance.now(); g.visible = true; } },
    maj(t) {
      if (t0 === null) return;
      q = Math.min(1, (performance.now() - t0) / duree);
      const tour = q / 0.5, u = lisse((q - 0.45) / 0.55);
      segs.forEach((s, i) => { s.material.opacity = tour > (i + 1) / N ? (q < 1 ? 0.95 : 0.7 + 0.25 * Math.sin(t * 3 - i * T / N)) : 0; });
      ondes.forEach((o, i) => { const f = (t * 0.45 + i / 3) % 1, e = r * (1.12 + 1.2 * f); o.scale.set(e, e, 1); o.material.opacity = q < 0.5 ? 0 : 0.55 * (1 - f); });
      faisceau.material.opacity = 0.3 * u + 0.04 * u * Math.sin(t * 5);
      balise.visible = u > 0; balise.position.z = 0.04 + 0.42 * u; balise.scale.setScalar(Math.max(0.001, u));
      noyau.rotation.y = t * 0.8; cage.rotation.x = t * 0.5; cage.rotation.y = -t * 0.35;
      if (panneau) panneau.material.opacity = lisse((q - 0.8) / 0.2);
    },
    etat() { return { lancee: t0 !== null, allumee: q >= 1, p: Math.round(q * 100) / 100 }; },
  };
}
