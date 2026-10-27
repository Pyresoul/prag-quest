// Farkle-Assistent für echte Würfel: Wurf eingeben, Wertung erkennen, Punktetafel führen.
// Der Spielstand liegt als gemeinsamer Eintrag "f:game" im Gruppen-Sync (wenn eine Gruppe aktiv ist), sonst nur lokal.
(() => {
  const KIND3 = { 1: 1000, 2: 200, 3: 300, 4: 400, 5: 500, 6: 600 };
  const DEF_RULES = { target: 10000, entry: 500, straight: true, pairs: true, pen: true, mult: 'flat' };

  function kindScore(f, c, r) { const b = KIND3[f]; return c === 3 ? b : r.mult === 'double' ? b * 2 ** (c - 3) : { 4: 1000, 5: 2000, 6: 3000 }[c]; }
  // Höchste Wertung, bei der alle übergebenen Würfel zählen. 0 = Auswahl enthält Würfel ohne Wertung.
  function scoreCounts(cnt, r) {
    const n = cnt.slice(1).reduce((a, b) => a + b, 0); if (!n) return 0;
    let tot = 0, ok = true;
    for (let f = 1; f <= 6 && ok; f++) {
      const c = cnt[f]; if (!c) continue; let b = -1;
      if (f === 1 || f === 5) {
        const s = f === 1 ? 100 : 50; b = c * s;
        if (c >= 3) { b = Math.max(b, kindScore(f, c, r)); if (c >= 4) b = Math.max(b, kindScore(f, 3, r) + (c - 3) * s); }
      } else if (c >= 3) b = kindScore(f, c, r);
      if (b < 0) ok = false; else tot += b;
    }
    let best = ok ? tot : 0;
    if (n === 6 && r.straight && cnt.slice(1).every(c => c === 1)) best = Math.max(best, 1500);
    if (n === 6 && r.pairs && cnt.slice(1).filter(c => c === 2).length === 3) best = Math.max(best, 1500);
    return best;
  }
  const countsOf = (roll, mask) => { const c = [0, 0, 0, 0, 0, 0, 0]; roll.forEach((v, i) => { if (mask[i]) c[v]++; }); return c; };
  function bestKeep(roll, r) {
    let best = { mask: roll.map(() => false), score: 0, n: 0 };
    for (let m = 1; m < (1 << roll.length); m++) {
      const mask = roll.map((_, i) => !!(m >> i & 1)), s = scoreCounts(countsOf(roll, mask), r), n = mask.filter(Boolean).length;
      if (s > best.score || (s === best.score && s > 0 && n < best.n)) best = { mask, score: s, n };
    }
    return best;
  }
  window.farkleScore = { scoreCounts, bestKeep, DEF_RULES };

  window.initFarkle = PQ => {
    const { $, esc, toast } = PQ, KEY = 'f:game', SETUP_KEY = 'prag-quest.farkle.setup';
    const getG = () => (PQ.S().entries[KEY] || {}).v || null;
    const setG = g => { g.rev = Date.now(); PQ.sync.setEntry(KEY, g); };
    let T = fresh(), hist = [], lastTurn = null, showSetup = false;
    let setup = { names: [], rules: { ...DEF_RULES } };
    try { const s = JSON.parse(localStorage.getItem(SETUP_KEY)); if (s) setup = { names: s.names || [], rules: { ...DEF_RULES, ...(s.rules || {}) } }; } catch (_) {}
    function fresh() { return { pts: 0, left: 6, roll: [], keep: [] }; }
    const saveSetup = () => { try { localStorage.setItem(SETUP_KEY, JSON.stringify(setup)); } catch (_) {} };

    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const die = (n, cls = '') => `<span class="die ${cls}">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<i class="${PIPS[n].includes(i) ? 'on' : ''}"></i>`).join('')}</span>`;
    const autoKeep = () => { T.keep = bestKeep(T.roll, rules()).mask; };
    const rules = () => (getG() || {}).rules || setup.rules;

    function rulesTable(r) {
      return `<details class="fk-rules"><summary>Wertungstabelle</summary><table>
        <tr><td>Einzelne 1</td><td>100</td></tr><tr><td>Einzelne 5</td><td>50</td></tr>
        <tr><td>Drilling 1er</td><td>1000</td></tr><tr><td>Drilling 2er / 3er / 4er</td><td>200 / 300 / 400</td></tr><tr><td>Drilling 5er / 6er</td><td>500 / 600</td></tr>
        <tr><td>Vierling / Fünfling / Sechsling</td><td>${r.mult === 'double' ? '2× / 4× / 8× Drilling' : '1000 / 2000 / 3000'}</td></tr>
        ${r.straight ? '<tr><td>Straße 1–6</td><td>1500</td></tr>' : ''}${r.pairs ? '<tr><td>Drei Paare</td><td>1500</td></tr>' : ''}
        <tr><td>Alle 6 Würfel gewertet</td><td>nochmal 6 würfeln</td></tr>
        <tr><td>Farkle (nichts zählt)</td><td>Zug-Punkte weg${r.pen ? ', 3× in Folge: −1000' : ''}</td></tr></table></details>`;
    }

    function setupHTML() {
      if (!setup.names.length) setup.names = ['', ''];
      const r = setup.rules, sel = (k, vals) => `<select data-fkr="${k}">${vals.map(([v, l]) => `<option value="${v}" ${String(r[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      return `<h2 class="sec">Farkle</h2><p class="hint">Würfelt mit echten Würfeln (6 Stück). Du gibst ein, was gefallen ist, die App rechnet die Punkte und führt die Tafel.</p>
        <h3 class="sec">Spieler</h3>
        ${setup.names.map((n, i) => `<div class="row" style="margin-bottom:6px"><input data-fkn="${i}" maxlength="16" placeholder="Spieler ${i + 1}" value="${esc(n)}">${setup.names.length > 2 ? `<button class="btn small" data-fk="rm" data-i="${i}" aria-label="Entfernen">✕</button>` : ''}</div>`).join('')}
        <div class="row"><button class="btn small" data-fk="add" ${setup.names.length >= 8 ? 'disabled' : ''}>+ Spieler</button><button class="btn small" data-fk="grp">Gruppe übernehmen</button></div>
        <h3 class="sec">Regeln</h3>
        <div class="row"><label>Zielpunkte${sel('target', [[5000, '5000'], [10000, '10 000']])}</label><label>Einstieg (erste Bank)${sel('entry', [[0, 'keiner'], [300, '300'], [500, '500'], [1000, '1000']])}</label></div>
        <div class="row"><label>Vier+ gleiche${sel('mult', [['flat', 'Pauschal 1000/2000/3000'], ['double', 'Verdoppeln je Würfel']])}</label></div>
        <div class="chips-wrap"><button class="chip ${r.straight ? 'on' : ''}" data-fkt="straight">Straße 1500</button><button class="chip ${r.pairs ? 'on' : ''}" data-fkt="pairs">Drei Paare 1500</button><button class="chip ${r.pen ? 'on' : ''}" data-fkt="pen">3× Farkle −1000</button></div>
        <button class="btn gold" data-fk="start" style="width:100%;margin-top:10px">Spiel starten</button>${rulesTable(r)}`;
    }

    function analyze() {
      const r = rules(), roll = T.roll, best = bestKeep(roll, r), cnt = countsOf(roll, T.keep);
      const keepN = T.keep.filter(Boolean).length, keepScore = keepN ? scoreCounts(cnt, r) : 0;
      return { best, keepN, keepScore, complete: roll.length === T.left, farkle: roll.length === T.left && roll.length > 0 && best.score === 0 };
    }

    function gameHTML(g) {
      const A = analyze(), p = g.players[g.turn], need = g.rules.entry && !p.in ? g.rules.entry : 0;
      const total = T.pts + (A.keepScore > 0 ? A.keepScore : 0), canBank = total > 0 && total >= need;
      const board = g.players.map((q, i) => `<div class="fk-p ${i === g.turn ? 'cur' : ''}"><div class="fk-line"><span>${esc(q.n)}${g.rules.entry && !q.in ? ' <em>· Einstieg offen</em>' : ''}${g.final === i ? ' <em>· Ziel erreicht</em>' : ''}${q.fk ? ` <em>· Farkle ${q.fk}×</em>` : ''}</span><b>${q.s}</b></div><div class="bar-out"><div class="bar-in" style="width:${Math.min(100, Math.max(0, q.s / g.target * 100))}%"></div></div></div>`).join('');
      const rollHTML = T.roll.length ? T.roll.map((v, i) => `<div class="fk-d"><button class="fk-die ${T.keep[i] ? 'keep' : ''}" data-fk="tog" data-i="${i}" aria-label="Würfel ${v}">${die(v)}</button><button class="fk-x" data-fk="del" data-i="${i}" aria-label="Entfernen">✕</button></div>`).join('') : `<p class="hint">Gib ein, was du gewürfelt hast (${T.left} ${T.left === 1 ? 'Würfel' : 'Würfel'}).</p>`;
      let info = '';
      if (A.farkle) info = `<div class="warn fk-farkle">Farkle! Kein Würfel zählt. Die ${T.pts} Zug-Punkte sind weg.</div>`;
      else if (T.roll.length) info = A.keepN
        ? (A.keepScore ? `<div class="fk-sum">Auswahl: <b>${A.keepScore}</b> Punkte (${A.keepN} Würfel)</div>` : `<div class="warn">In der Auswahl sind Würfel, die nicht zählen. Tippe sie ab.</div>`)
        : `<div class="hint">Tippe die Würfel an, die du behältst.</div>`;
      const incomplete = T.roll.length && !A.complete ? `<p class="hint">Es fehlen noch ${T.left - T.roll.length} Würfel, falls du alle eingeben willst. Zum Farkle-Check müssen alle Würfel eingegeben sein.</p>` : '';
      const actions = A.farkle
        ? `<button class="btn gold" data-fk="farkle" style="width:100%">Farkle bestätigen, nächster Spieler</button>`
        : `<div class="row"><button class="btn gold" data-fk="on" ${A.keepScore ? '' : 'disabled'}>Behalten, weiterwürfeln</button><button class="btn" data-fk="bank" ${canBank ? '' : 'disabled'}>Punkte sichern (${total})</button></div>
           ${total > 0 && !canBank ? `<p class="hint">Noch ${need - total} bis zum Einstieg (mind. ${need} zum ersten Sichern).</p>` : ''}`;
      return `<div class="fk-board">${board}</div>
        <div class="fk-turn"><div class="fk-who">${esc(p.n)} ist dran</div>
          <div class="fk-stats"><div><b>${T.pts}</b><small>Zug-Punkte</small></div><div><b>${T.left}</b><small>Würfel übrig</small></div><div><b>${p.s}</b><small>Gesamt</small></div></div>
          <div class="fk-roll">${rollHTML}</div>${info}${incomplete}
          <div class="fk-pad">${[1, 2, 3, 4, 5, 6].map(v => `<button class="fk-die" data-fk="die" data-v="${v}" ${T.roll.length >= T.left ? 'disabled' : ''} aria-label="${v} hinzufügen">${die(v)}</button>`).join('')}</div>
          ${actions}
          <div class="row fk-man"><input id="fk-man" type="text" inputmode="numeric" placeholder="Punkte selbst eintragen"><button class="btn small" data-fk="man">Addieren</button></div>
          <div class="row"><button class="btn small" data-fk="undo" ${hist.length ? '' : 'disabled'}>Rückgängig</button><button class="btn small" data-fk="reset">Spiel beenden</button></div>
        </div>${rulesTable(g.rules)}`;
    }

    function overHTML(g) {
      const rank = [...g.players].sort((a, b) => b.s - a.s);
      return `<h2 class="sec">Spiel beendet</h2><div class="quest-head">${window.rabbit('mustard', 'burst', 'rb-rank')}<div><h2 class="quest-title">${esc(rank[0].n)}</h2><div class="quest-sub">gewinnt mit ${rank[0].s} Punkten</div></div></div>
        <div class="fk-board" style="margin-top:12px">${rank.map((q, i) => `<div class="fk-p ${i === 0 ? 'cur' : ''}"><div class="fk-line"><span>${i + 1}. ${esc(q.n)}</span><b>${q.s}</b></div></div>`).join('')}</div>
        <div class="row"><button class="btn gold" data-fk="again">Revanche (gleiche Spieler)</button><button class="btn" data-fk="new">Neue Runde einrichten</button></div>`;
    }

    function render() {
      const el = $('#farkle'); if (!el) return;
      const g = getG(), act = document.activeElement;
      if (act && act.matches && act.matches('input') && el.contains(act)) return; // nicht während der Eingabe neu zeichnen
      el.innerHTML = !g || showSetup ? setupHTML() : g.over ? overHTML(g) : gameHTML(g);
    }
    function remote() { const g = getG(); if (g && g.turn !== lastTurn) { T = fresh(); lastTurn = g.turn; } render(); }

    function advance(g) { g.turn = (g.turn + 1) % g.players.length; if (g.final != null && g.turn === g.final) g.over = true; }
    function commit(mut) {
      const g = getG(); hist.push(JSON.stringify(g)); if (hist.length > 10) hist.shift();
      mut(g); setG(g); T = fresh(); lastTurn = g.turn; render();
    }
    function startGame(names, r) {
      const players = names.map((n, i) => ({ n: n.trim() || `Spieler ${i + 1}`, s: 0, in: !r.entry, fk: 0 }));
      hist = []; T = fresh(); showSetup = false; setG({ players, turn: 0, rules: { ...r, target: +r.target, entry: +r.entry }, final: null, over: false }); lastTurn = 0; render();
    }

    document.addEventListener('input', e => {
      if (e.target.dataset && e.target.dataset.fkn !== undefined) { setup.names[+e.target.dataset.fkn] = e.target.value; saveSetup(); }
    });
    document.addEventListener('change', e => {
      const k = e.target.dataset && e.target.dataset.fkr; if (!k) return;
      setup.rules[k] = ['target', 'entry'].includes(k) ? +e.target.value : e.target.value; saveSetup();
    });
    $('#farkle').addEventListener('click', e => {
      const t = e.target.closest('[data-fkt]');
      if (t) { setup.rules[t.dataset.fkt] = !setup.rules[t.dataset.fkt]; saveSetup(); return render(); }
      const b = e.target.closest('[data-fk]'); if (!b || b.disabled) return;
      const a = b.dataset.fk, i = +b.dataset.i, g = getG();
      if (a === 'add') { if (setup.names.length < 8) { setup.names.push(''); saveSetup(); render(); } return; }
      if (a === 'rm') { setup.names.splice(i, 1); saveSetup(); return render(); }
      if (a === 'grp') { setup.names = PQ.members().map(PQ.nameOf); if (setup.names.length < 2) setup.names.push(''); saveSetup(); return render(); }
      if (a === 'start') { const names = setup.names.filter(n => n.trim()); if (names.length < 2) return toast('Mindestens 2 Spieler'); return startGame(names, setup.rules); }
      if (a === 'again') return startGame(g.players.map(p => p.n), g.rules);
      if (a === 'new') { showSetup = true; setup.names = g.players.map(p => p.n); setup.rules = { ...DEF_RULES, ...g.rules }; return render(); }
      if (!g) return;
      if (a === 'reset') { if (confirm('Spiel wirklich beenden und löschen?')) { PQ.sync.setEntry(KEY, null); hist = []; T = fresh(); showSetup = true; render(); } return; }
      if (a === 'undo') { const prev = hist.pop(); if (prev) { setG(JSON.parse(prev)); T = fresh(); lastTurn = getG().turn; render(); } return; }
      if (a === 'die') return;
      if (a === 'tog') { T.keep[i] = !T.keep[i]; return render(); }
      if (a === 'del') { T.roll.splice(i, 1); autoKeep(); return render(); }
      if (a === 'man') { const v = parseInt($('#fk-man').value, 10); if (isNaN(v)) return toast('Zahl eingeben'); T.pts += v; return render(); }
      const A = analyze();
      if (a === 'farkle') return commit(gg => { const p = gg.players[gg.turn]; p.fk++; if (gg.rules.pen && p.fk >= 3) { p.s = Math.max(0, p.s - 1000); p.fk = 0; toast('Dreimal Farkle: −1000'); } advance(gg); });
      if (a === 'on') { T.pts += A.keepScore; T.left -= A.keepN; T.roll = []; T.keep = []; if (T.left === 0) { T.left = 6; toast('Heiße Würfel! Alle 6 nochmal'); } return render(); }
      if (a === 'bank') {
        const pts = T.pts + (A.keepScore > 0 ? A.keepScore : 0);
        return commit(gg => { const p = gg.players[gg.turn]; p.s += pts; p.in = true; p.fk = 0; if (p.s >= gg.rules.target && gg.final == null) { gg.final = gg.turn; toast(`${p.n} hat das Ziel erreicht, die anderen haben noch einen Zug`); } advance(gg); });
      }
    });
    // Würfel-Tasten: separat, weil data-v statt data-i
    $('#farkle').addEventListener('click', e => {
      const b = e.target.closest('[data-fk="die"]'); if (!b || b.disabled) return;
      if (T.roll.length >= T.left) return;
      T.roll.push(+b.dataset.v); T.roll.sort((x, y) => x - y); autoKeep(); render();
    });
    return { render, remote };
  };
})();
