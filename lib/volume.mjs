// Volume ancré sur un repère plan. Paramètres : cfg.
export async function creerVolume(THREE, cfg) {
  const { cx, cy, w, h, prof: d, marge: m = 0.06 } = cfg, a = w / 2, b = h / 2, A = a + m, B = b + m, L = 0x5ff3e6;
  const g = new THREE.Group(); g.position.set(cx, cy, 0); g.visible = false;
  const charge = async u => { const t = await new THREE.TextureLoader().loadAsync(u); t.colorSpace = THREE.SRGBColorSpace; return t; };

  const s = new THREE.Shape(), R = 6; s.moveTo(-R, -R); s.lineTo(R, -R); s.lineTo(R, R); s.lineTo(-R, R); s.closePath();
  const o = new THREE.Path(); o.moveTo(-a, -b); o.lineTo(-a, b); o.lineTo(a, b); o.lineTo(a, -b); o.closePath(); s.holes.push(o);
  const masque = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ colorWrite: false }));
  masque.position.z = -0.001; masque.renderOrder = -10; g.add(masque);

  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#1b3038'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#345a68'; x.lineWidth = 4;
  for (let i = 0; i <= 256; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  x.fillStyle = '#4d8496'; for (const i of [20, 108, 148, 236]) for (const j of [20, 108, 148, 236]) { x.beginPath(); x.arc(i, j, 5, 0, 7); x.fill(); }
  const tp = new THREE.CanvasTexture(cv); tp.colorSpace = THREE.SRGBColorSpace;
  const paroi = (lw, lh, pos, rot, ombre) => {
    const t = tp.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(lw / 0.22)), Math.max(1, Math.round(lh / 0.22)));
    const p = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshStandardMaterial({ map: t, roughness: 0.65, metalness: 0.25, vertexColors: true }));
    const q = p.geometry.attributes.position, c = new Float32Array(q.count * 3);
    for (let i = 0; i < q.count; i++) { const v = ombre(q.getX(i) / (lw / 2), q.getY(i) / (lh / 2)); c[3 * i] = c[3 * i + 1] = c[3 * i + 2] = v; }
    p.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
    p.position.set(...pos); p.rotation.set(...rot); g.add(p); return p;
  };
  const Q = Math.PI / 2;
  const pres = 1.15, loin = 0.3, deg = u => loin + (pres - loin) * (1 - u) / 2;
  paroi(2 * A, 2 * B, [0, 0, -d], [0, 0, 0], () => loin);
  paroi(d, 2 * B, [-A, 0, -d / 2], [0, Q, 0], (x) => deg(x));
  paroi(d, 2 * B, [A, 0, -d / 2], [0, -Q, 0], (x) => deg(-x));
  paroi(2 * A, d, [0, B, -d / 2], [Q, 0, 0], (x, y) => deg(-y));
  paroi(2 * A, d, [0, -B, -d / 2], [-Q, 0, 0], (x, y) => deg(y));
  const aretes = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * A, 2 * B, d)), new THREE.LineBasicMaterial({ color: L, transparent: true, opacity: 0.55 }));
  aretes.position.z = -d / 2 - 0.004; g.add(aretes);

  const r = cfg.releve, tr = await charge(r.img), lw = d * (r.taille || 0.6), lh = lw * tr.image.height / tr.image.width, zr = -d * (r.u ?? 0.55), e = 0.003;
  const P = { g: [[-A + e, 0, zr], [0, Q, 0]], d: [[A - e, 0, zr], [0, -Q, 0]], h: [[0, B - e, zr], [Q, 0, 0]], b: [[0, -B + e, zr], [-Q, 0, 0]] }[r.paroi];
  const rel = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: tr, transparent: true }));
  rel.position.set(...P[0]); rel.rotation.set(...P[1]); g.add(rel);

  const k = Math.min(b, d / 2), coeur = new THREE.Group(); coeur.position.set(a * 0.25, 0, -d * 0.55);
  const noyau = new THREE.Mesh(new THREE.IcosahedronGeometry(k * 0.3, 1), new THREE.MeshStandardMaterial({ color: L, emissive: L, emissiveIntensity: 0.9, roughness: 0.3 }));
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(k * 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffb84d, wireframe: true }));
  const lum = new THREE.PointLight(0xffffff, 1.2, 0, 0); coeur.add(noyau, cage, lum); g.add(coeur);
  const mcab = new THREE.MeshStandardMaterial({ color: 0x20282c, roughness: 0.8 });
  for (const [px, py] of [[-A * 0.7, B * 0.6], [A * 0.8, -B * 0.5], [-A * 0.2, -B * 0.8]]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(px, py, -d), new THREE.Vector3((px + coeur.position.x) / 2, py * 0.9 - 0.03, -d * 0.8), coeur.position.clone()]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, k * 0.035, 6), mcab));
  }
  const voyants = [];
  for (let i = 0; i < 5; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(k * 0.05, 8, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb84d : L })); v.position.set(-A * 0.8 + i * A * 0.16, B * 0.75, -d + 0.004); g.add(v); voyants.push(v); }

  const tpo = await charge(cfg.porte);
  const vantail = c => { const t = tpo.clone(); t.needsUpdate = true; t.repeat.set(0.5, 1); t.offset.set(c ? 0.5 : 0, 0);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(a, h), new THREE.MeshBasicMaterial({ map: t })); p.position.set((c ? 1 : -1) * a / 2, 0, -0.004); g.add(p); return p; };
  const vg = vantail(0), vd = vantail(1);
  const ml = new THREE.MeshBasicMaterial({ color: L, transparent: true, opacity: 0, depthWrite: false }), ep = 0.012;
  const joint = new THREE.Mesh(new THREE.PlaneGeometry(ep, h), ml.clone()); joint.position.z = 0.002; g.add(joint);
  for (const [bw, bh, px, py] of [[w + 2 * ep, ep, 0, b + ep / 2], [w + 2 * ep, ep, 0, -b - ep / 2], [ep, h, -a - ep / 2, 0], [ep, h, a + ep / 2, 0]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), ml); c.position.set(px, py, 0.002); g.add(c); }

  let t0 = null, p = 0;
  return {
    group: g,
    get lance() { return t0 !== null; },
    get ouverte() { return p >= 1; },
    ouvrir() { if (t0 === null) t0 = performance.now(); },
    maj(t) {
      if (t0 === null) return;
      const q = Math.min(1, (performance.now() - t0) / 2000), u = q < 0.25 ? 0 : (q - 0.25) / 0.75; p = q >= 1 ? 1 : u * u * (3 - 2 * u);
      vg.position.x = -a / 2 - a * p; vd.position.x = a / 2 + a * p; vg.visible = vd.visible = p < 1;
      joint.material.opacity = q < 0.25 ? q * 4 : Math.max(0, 1 - u * 3); ml.opacity = 0.35 + 0.45 * p;
      noyau.rotation.y = t * 0.8; cage.rotation.x = t * 0.5; cage.rotation.y = -t * 0.35; lum.intensity = 1.1 + 0.3 * Math.sin(t * 3);
      voyants.forEach((v, i) => { v.visible = Math.sin(t * 2.2 + i * 1.7) > -0.3; });
    },
    etat(camera) {
      g.updateWorldMatrix(true, false); const c = g.worldToLocal(camera.getWorldPosition(new THREE.Vector3())), rp = rel.position;
      const f = c.z / (c.z - rp.z), qx = c.x + (rp.x - c.x) * f, qy = c.y + (rp.y - c.y) * f;
      return { ouverte: p >= 1, enVue: p >= 1 && c.z > 0 && Math.abs(qx) < a && Math.abs(qy) < b, angle: Math.round(Math.atan2(c.x, c.z) * 57.3) };
    },
  };
}
