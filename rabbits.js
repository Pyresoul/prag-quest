// Schwert-Hasen im Stil mittelalterlicher Randzeichnungen / Emaille-Pins (eigene SVG-Zeichnungen).
// Eigene Bilder: Datei rabbits/<farbe>-<pose>.png (oder .webp) ablegen und den Namen unter window.RABBIT_IMAGES eintragen, siehe rabbits/README.md.
window.RABBIT_IMAGES = window.RABBIT_IMAGES || [];
window.RABBIT_COLORS = ['mustard', 'orange', 'grey', 'red', 'brown'];
window.RABBIT_POSES = ['stand', 'guard', 'trumpet', 'lens', 'point', 'stop', 'burst', 'walk', 'attack', 'peek'];
window.rabbit = (() => {
  const INK = '#18110a';
  const COL = { mustard: ['#d9c45a', '#4d3f10', '#efe39a'], grey: ['#e7e5df', '#8a8780', '#ffffff'], orange: ['#e4883a', '#5e2a0c', '#f2b274'], red: ['#c4302a', '#430d09', '#e0786f'], brown: ['#9a6b3c', '#34200d', '#cfa874'] };
  const st = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const limb = (d, c, w = 5) => `<path d="${d}" fill="none" ${st(w + 4)}/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const paw = (x, y, c, r = 3.8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st(2.4)}/>`;
  function sword(x, y, tx, ty, flip) {
    const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux, gx = x + ux * 8, gy = y + uy * 8;
    return `<path d="M${gx} ${gy}L${tx} ${ty}" fill="none" ${st(7.5)}/><path d="M${gx} ${gy}L${tx} ${ty}" fill="none" stroke="#dcd6c4" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="M${gx + px * 8} ${gy + py * 8}L${gx - px * 8} ${gy - py * 8}" fill="none" ${st(6)}/><path d="M${x} ${y}L${gx} ${gy}" fill="none" ${st(6)}/><circle cx="${x - ux * 2}" cy="${y - uy * 2}" r="3" fill="${INK}"/>`;
  }
  function burst() {
    const pts = [];
    for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, r = i % 2 ? 34 : 58; pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (62 + Math.sin(a) * r).toFixed(1)); }
    return `<polygon points="${pts.join(' ')}" fill="#c4302a" ${st(2.6)}/>`;
  }
  const feet = c => `<path d="M44 94L40 103L37 110" fill="none" ${st(9)}/><path d="M44 94L40 103L37 110" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M56 94L60 103L63 110" fill="none" ${st(9)}/><path d="M56 94L60 103L63 110" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M28 111Q37 106 42 111L42 113L28 113Z" fill="${c}" ${st(2.8)}/><path d="M58 111Q63 106 72 111L72 113L58 113Z" fill="${c}" ${st(2.8)}/><path d="M31 112v-3M34 112v-3M65 112v-3M68 112v-3" ${st(1.4)} fill="none"/>`;
  // Vorderansicht
  function front(c, dk, hi, P) {
    return `${P.back || ''}<path d="M22 104L72 88" fill="none" ${st(6.5)}/>
      <path d="M41 44C33 30 26 14 31 2C40 6 47 22 48 44Z" fill="${c}" ${st()}/><path d="M41 38C36 26 33 14 34 8C40 12 44 24 44 38Z" fill="${dk}"/>
      <path d="M59 44C70 32 79 16 74 3C64 6 53 22 52 44Z" fill="${c}" ${st()}/><path d="M60 38C67 27 71 16 70 9C63 13 58 24 56 38Z" fill="${dk}"/>
      <path d="M42 64C38 74 40 84 43 94L57 94C60 84 62 74 58 64Z" fill="${c}" ${st()}/>
      <path d="M42 86L58 86L55 101L50 96L45 101Z" fill="${INK}"/><path d="M41.5 83L58.5 83" ${st(4)}/>
      ${feet(c)}
      <path d="M36 50C36 41 42 38 50 38C58 38 64 41 64 50C64 55 61 58 56 60L50 63L44 60C39 58 36 55 36 50Z" fill="${c}" ${st()}/>
      <ellipse cx="50" cy="57" rx="6.5" ry="4.5" fill="${hi}" opacity=".55"/>
      <ellipse cx="43.5" cy="48" rx="2" ry="2.6" fill="${INK}"/><ellipse cx="56.5" cy="48" rx="2" ry="2.6" fill="${INK}"/>
      <path d="M40.5 44L46.5 45.5M59.5 44L53.5 45.5" ${st(1.8)} fill="none"/>
      <path d="M48 55H52L50 58Z" fill="${INK}"/><path d="M46 61Q50 63.5 54 61" fill="none" ${st(1.6)}/>
      ${P.arms(c)}${P.item || ''}${P.hand ? P.hand(c) : ''}`;
  }
  // Seitenansicht (schaut nach rechts)
  function side(c, dk, hi, P) {
    return `${P.back || ''}<path d="M22 98L60 84" fill="none" ${st(6.5)}/>
      <path d="M30 94C28 92 24 94 24 98C27 100 31 99 33 96Z" fill="${c}" ${st(2.6)}/>
      <path d="M48 42C38 28 24 18 6 18C18 28 30 40 44 50Z" fill="${c}" ${st()}/><path d="M42 40C34 31 24 25 15 23C25 30 33 38 40 45Z" fill="${dk}"/>
      <path d="M54 41C48 24 34 10 14 5C28 18 36 32 46 48Z" fill="${c}" ${st()}/><path d="M50 38C44 26 34 16 24 11C34 20 40 30 46 42Z" fill="${dk}"/>
      <path d="M45 60C38 70 33 82 36 94L52 96C54 84 57 72 57 62Z" fill="${c}" ${st()}/>
      <path d="M36 87L55 90L52 100L46 94L40 100Z" fill="${INK}"/><path d="M36 85L56 88" ${st(4)}/>
      <path d="M44 94L48 104L50 111" fill="none" ${st(9)}/><path d="M44 94L48 104L50 111" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <path d="M38 94L34 104L28 111" fill="none" ${st(9)}/><path d="M38 94L34 104L28 111" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 112Q58 106 66 112L66 114L50 114Z" fill="${c}" ${st(2.8)}/><path d="M18 112Q26 106 34 112L34 114L18 114Z" fill="${c}" ${st(2.8)}/>
      <path d="M44 48C48 40 58 39 64 44L80 52L70 58C64 63 52 62 46 57Z" fill="${c}" ${st()}/>
      <ellipse cx="62" cy="47" rx="2" ry="2.5" fill="${INK}"/><path d="M58 43L66 44" ${st(1.8)} fill="none"/>
      <circle cx="79.5" cy="52" r="2.4" fill="${INK}"/><path d="M68 58Q72 59 75 57" fill="none" ${st(1.5)}/>
      ${P.arms(c)}${P.item || ''}${P.hand ? P.hand(c) : ''}`;
  }
  const POSES = {
    stand: { v: 'front', arms: c => limb('M41 66Q35 78 39 88', c) + limb('M59 66Q66 78 61 88', c) + paw(61, 89, c) },
    guard: { v: 'front', arms: c => limb('M41 66Q35 78 39 88', c) + limb('M59 66L74 52', c), item: sword(74, 53, 94, 10) },
    trumpet: { v: 'front', arms: c => limb('M41 66Q35 78 39 88', c) + limb('M59 66Q68 62 65 56', c),
      item: `<polygon points="62,52 80,55 97,44 100,73 80,62 62,59" fill="#e0b93a" ${st(2.6)}/><path d="M62 52L62 59" ${st(3)}/>` },
    lens: { v: 'front', arms: c => limb('M41 66Q35 78 39 88', c) + limb('M59 66Q68 66 73 62', c),
      item: `<path d="M72 64L62 74" fill="none" ${st(5)}/><circle cx="82" cy="54" r="11" fill="#f4f0e0" ${st(3.4)}/><circle cx="82" cy="54" r="6" fill="none" stroke="#9a9484" stroke-width="1.5"/>` },
    point: { v: 'front', arms: c => limb('M59 66Q66 78 61 88', c) + limb('M41 66L10 52', c) + paw(8, 51, c, 3.4) },
    stop: { v: 'front', arms: c => limb('M41 66Q35 78 39 88', c) + limb('M59 66Q74 62 72 46', c), hand: c => `<path d="M66 44C64 36 66 30 70 30C72 30 73 33 73 33C74 30 80 30 80 34C80 38 80 42 78 46Z" fill="${c}" ${st(2.6)}/>` },
    burst: { v: 'front', back: burst(), arms: c => limb('M41 66Q35 78 39 88', c) + limb('M59 66L74 52', c), item: sword(74, 53, 84, 18) },
    walk: { v: 'side', arms: c => limb('M52 64Q58 74 54 82', c) + paw(54, 83, c) },
    attack: { v: 'side', arms: c => limb('M52 62L68 56', c), item: sword(68, 56, 98, 30) },
    peek: { v: 'side', arms: c => limb('M52 64Q62 66 68 62', c),
      item: `<path d="M68 62L72 56" fill="none" ${st(5)}/><circle cx="82" cy="50" r="10" fill="#f4f0e0" ${st(3.4)}/><circle cx="82" cy="50" r="5.5" fill="none" stroke="#9a9484" stroke-width="1.4"/>` }
  };
  return function rabbit(color = 'mustard', pose = 'stand', cls = 'rb') {
    const img = window.RABBIT_IMAGES.find(f => f.startsWith(color + '-' + pose + '.'));
    if (img) return `<img class="${cls}" src="rabbits/${img}" alt="" style="object-fit:contain">`;
    const [c, dk, hi] = COL[color] || COL.mustard, P = POSES[pose] || POSES.stand;
    return `<svg class="${cls}" viewBox="-8 0 116 120" role="img" aria-hidden="true">${(P.v === 'side' ? side : front)(c, dk, hi, P)}</svg>`;
  };
})();
