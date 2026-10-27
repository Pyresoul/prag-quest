// Schwert-Hasen im Stil mittelalterlicher Randzeichnungen (eigene SVG-Zeichnungen, kein Originalmaterial).
window.rabbit = (() => {
  const INK = '#1a130c';
  const COL = { mustard: ['#d8c35a', '#5b4a14'], grey: ['#e9e6df', '#8d8a84'], orange: ['#e58a3c', '#6b3010'], red: ['#c4302a', '#4c0f0b'] };
  const stroke = (w = 2.6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const limb = (d, c) => `<path d="${d}" fill="none" ${stroke(8)}/><path d="${d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  function sword(x, y, tx, ty) {
    const dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
    const gx = x + ux * 7, gy = y + uy * 7;
    return `<path d="M${gx} ${gy}L${tx} ${ty}" fill="none" ${stroke(6.5)}/><path d="M${gx} ${gy}L${tx} ${ty}" fill="none" stroke="#d9d3c0" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M${gx + px * 7} ${gy + py * 7}L${gx - px * 7} ${gy - py * 7}" fill="none" ${stroke(5)}/><path d="M${x} ${y}L${gx} ${gy}" fill="none" ${stroke(5)}/>`;
  }
  function burst() {
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r = i % 2 ? 36 : 56; pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (60 + Math.sin(a) * r).toFixed(1)); }
    return `<polygon points="${pts.join(' ')}" fill="#c4302a" ${stroke(2.2)}/>`;
  }
  const POSES = {
    stand: () => ({ arms: c => limb('M38 68Q32 80 36 88', c) + limb('M62 68Q70 78 64 88', c) + `<circle cx="65" cy="90" r="3.4" fill="${INK}"/>`, item: '' }),
    guard: () => ({ arms: c => limb('M38 68Q32 80 36 88', c) + limb('M62 68L76 54', c), item: sword(76, 55, 94, 12) }),
    trumpet: () => ({ arms: c => limb('M38 68Q32 80 36 88', c) + limb('M62 68Q68 62 66 56', c),
      item: `<polygon points="62,53 80,56 97,46 99,72 80,61 62,59" fill="#e0b93a" ${stroke(2.4)}/>` }),
    lens: () => ({ arms: c => limb('M38 68Q32 80 36 88', c) + limb('M62 68Q70 66 74 62', c),
      item: `<path d="M72 64L64 72" fill="none" ${stroke(5)}/><circle cx="82" cy="54" r="10" fill="#f4f0e0" ${stroke(3)}/><circle cx="82" cy="54" r="5.5" fill="none" stroke="#9a9484" stroke-width="1.4"/>` }),
    point: () => ({ arms: c => limb('M62 68Q70 78 64 88', c) + limb('M38 66L10 54', c), item: '' }),
    stop: () => ({ arms: c => limb('M38 68Q32 80 36 88', c) + limb('M62 68Q76 62 73 46', c), item: '' , hand: c => `<circle cx="73" cy="40" r="7" fill="${c}" ${stroke(2.6)}/>` }),
    burst: () => ({ back: burst(), arms: c => limb('M38 68Q32 80 36 88', c) + limb('M62 68L74 52', c), item: sword(74, 53, 82, 20) })
  };
  return function rabbit(color = 'mustard', pose = 'stand', cls = 'rb') {
    const [c, dark] = COL[color] || COL.mustard, P = (POSES[pose] || POSES.stand)();
    return `<svg class="${cls}" viewBox="-8 0 116 120" role="img" aria-hidden="true">
      ${P.back || ''}
      <path d="M24 102L70 86" fill="none" ${stroke(6)}/>
      <path d="M39 40C26 14 32 3 41 6C49 12 50 30 47 41Z" fill="${c}" ${stroke()}/><path d="M40 34C34 18 37 11 41 12C45 18 45 28 44 35Z" fill="${dark}"/>
      <path d="M61 40C74 14 68 3 59 6C51 12 50 30 53 41Z" fill="${c}" ${stroke()}/><path d="M60 34C66 18 63 11 59 12C55 18 55 28 56 35Z" fill="${dark}"/>
      <path d="M36 62C34 85 36 100 40 106L60 106C64 100 66 85 64 62C58 58 42 58 36 62Z" fill="${c}" ${stroke()}/>
      <path d="M36.5 80Q50 87 63.5 80" fill="none" ${stroke(4.5)}/>
      <ellipse cx="42" cy="108" rx="7" ry="3.6" fill="${c}" ${stroke()}/><ellipse cx="58" cy="108" rx="7" ry="3.6" fill="${c}" ${stroke()}/>
      <ellipse cx="50" cy="50" rx="14.5" ry="12.5" fill="${c}" ${stroke()}/>
      <ellipse cx="44" cy="48" rx="1.7" ry="2.3" fill="${INK}"/><ellipse cx="56" cy="48" rx="1.7" ry="2.3" fill="${INK}"/>
      <path d="M48.3 54H51.7L50 56.2Z" fill="${INK}"/><path d="M46.5 58.5Q50 61 53.5 58.5" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
      ${P.arms(c)}${P.item || ''}${P.hand ? P.hand(c) : ''}
    </svg>`;
  };
})();
