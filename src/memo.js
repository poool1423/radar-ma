// Memo de originación en formato pitch book (memo.html?s=<sector>&id=<propuesta>)
(function () {
  const cfg = window.RD_CFG || {};
  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('pb');
  const MIN = 7;
  const SOL = [[9, 'Alta'], [7, 'Media-alta'], [5, 'Media'], [3, 'Media-baja'], [0, 'Baja']];
  const CODIGOS = ['Orión', 'Vega', 'Lyra', 'Altair', 'Deneb', 'Rigel', 'Sirio', 'Antares', 'Capella', 'Polaris', 'Atlas', 'Cygnus'];
  const n1 = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
  const n2 = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const meur = (v, d) => (v == null || isNaN(v) ? 'n.d.' : (d ? n2 : n1).format(v) + ' M€');
  const xm = (v) => n2.format(v) + 'x';
  const frases = (s) => String(s || '').split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ0-9#])/).map((x) => x.trim()).filter(Boolean);
  const ul = (arr) => '<ul class="b">' + arr.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const fail = (msg) => { root.innerHTML = '<div class="slide"><div></div><div class="s-body"><h4>Memo no disponible</h4><p>' + msg + '</p><p><a href="./">Volver al radar</a></p></div><div></div></div>'; };

  if (!cfg.id || !id) { fail('Falta el sector o la propuesta en el enlace.'); return; }
  const get = (n) => fetch(cfg.dir + n + '.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : []));
  Promise.all(['propuestas', 'targets', 'compradores', 'empresas', 'deals'].map(get)).then(([P, T, C, E, D]) => {
    const p = P.find((x) => x.id === id);
    if (!p) { fail('No existe la propuesta ' + esc(id) + '.'); return; }
    const t = T.find((x) => x.empresa === p.target) || {};
    const c = C.find((x) => x.comprador === p.comprador) || {};
    const et = E.find((x) => x.empresa === p.target) || {};
    const disp = Number(t.pts_senal || 0);
    const total = Number(p.pts_encaje) + Number(p.pts_precedentes) + Number(p.pts_capacidad) + disp;
    const sol = (SOL.find(([m]) => total >= m) || [0, ''])[1];
    if (total < MIN) { fail('La propuesta ' + esc(p.comprador) + ' → ' + esc(p.target) + ' tiene una solidez de ' + total + '/10. Solo se preparan memos a partir de ' + MIN + '/10 (media-alta o alta).'); return; }

    const codigo = 'Proyecto ' + (p.codigo || CODIGOS[(parseInt(String(p.id).replace(/\D/g, ''), 10) || 0) % CODIGOS.length]);
    const M = cfg.multiplos;
    const dato = t.ventas_dato == null || t.ventas_dato === '' ? null : Number(t.ventas_dato);
    const est = t.empleados ? Number(t.empleados) * cfg.vpe : null;
    const ventas = dato != null ? dato : est;
    const origen = dato != null ? 'publicadas' + (t.anio_dato ? ' ' + t.anio_dato : '') : (est != null ? 'estimadas con la plantilla' : 'sin dato');
    const eb = ventas != null ? ventas * cfg.margen : null;
    const evl = eb != null ? eb * M.bajo : null, evc = eb != null ? eb * M.central : null, evh = eb != null ? eb * M.alto : null;
    const aliases = String(c.alias_deals || c.comprador || '').split('|').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const dealsComprador = D.filter((d) => aliases.some((a) => String(d.comprador).toLowerCase().includes(a)));
    const clave = String(t.subsector || '').split(/[ (,]/)[0].toLowerCase();
    const dealsSector = D.filter((d) => clave && String(d.subsector || '').toLowerCase().includes(clave) && !dealsComprador.includes(d));
    const compsOps = D.filter((d) => d.ev && d.ebitda).map((d) => ({ n: d.comprador + ' → ' + d.target, m: d.ev / d.ebitda, f: d.fecha }));
    const compsRefs = (M.refs || []).map((r) => ({ n: r.nombre, m: r.mult, f: r.fuente }));
    const comps = compsOps.concat(compsRefs);
    const alt = String(t.compradores || '').split(',').map((s) => s.trim()).filter((s) => s && !aliases.some((a) => s.toLowerCase().includes(a)));
    const hoy = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
    let pag = 0; const PAGS = 8;
    const slide = (kicker, title, body, fuente) => {
      pag++;
      return '<section class="slide"><div class="s-head"><div class="s-kicker">' + esc(kicker) + '</div><h2 class="s-title">' + esc(title) + '</h2></div>' +
        '<div class="s-body">' + body + '</div><div class="s-foot"><span><b>' + esc(codigo) + '</b> · Borrador para discusión · Estrictamente confidencial</span><span>' +
        esc(fuente || 'Fuentes públicas; estimaciones propias') + '</span><span>' + pag + ' / ' + PAGS + '</span></div></section>';
    };
    const kpi = (l, v, s) => '<div class="kpi"><span>' + esc(l) + '</span><b>' + v + '</b>' + (s ? '<i>' + esc(s) + '</i>' : '') + '</div>';
    const kv = (rows) => '<table class="t kv">' + rows.filter((r) => r[1]).map(([k, v]) => '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>').join('') + '</table>';
    const dealRows = (arr, max) => arr.slice(0, max).map((d) => '<tr><td>' + esc(d.fecha) + '</td><td>' + esc(d.comprador) + '</td><td>' + esc(d.target) + '</td><td>' + esc(d.subsector) + '</td><td class="num">' + (d.ventas ? n1.format(d.ventas) : '—') + '</td></tr>').join('');

    // 1. Portada
    pag++;
    let html = '<section class="slide cover"><div><div class="cv-k">Radar de originación M&amp;A · ' + esc(cfg.label) + '</div><h1>' + esc(codigo) + '</h1>' +
      '<div class="cv-s">Idea de originación: posible adquisición de ' + esc(p.target) + ' por ' + esc(p.comprador) + '</div><div class="cv-line"></div>' +
      '<div class="cv-meta">Solidez ' + total + '/10 · ' + esc(sol) + '<br>Operación ' + esc(String(p.tipo_estrategico || '').toLowerCase()) + '<br>' + esc(hoy) + '</div></div>' +
      '<div class="cv-foot"><span>Borrador para discusión · Estrictamente confidencial</span><span>Elaborado por Pol con fuentes públicas. Hipótesis para validar, no recomendación de inversión.</span></div></section>';

    // 2. Resumen ejecutivo
    html += slide('Resumen ejecutivo', p.tesis,
      '<div class="cols c32"><div><h4>Por qué tiene sentido</h4>' + ul(frases(p.por_que)) + '<h4>Por qué ahora</h4><p>' + esc(t.senal || 'Sin señal pública de venta.') + '</p><h4>Riesgo principal</h4><p>' + esc(frases(p.riesgo)[0] || '—') + '</p><h4>Siguiente paso</h4><p>' + esc(frases(p.siguiente_paso)[0] || '—') + '</p></div>' +
      '<div><div class="kpis">' + kpi('Solidez', total + '/10', sol) + kpi('Ventas del target', meur(ventas), origen) + kpi('EBITDA estimado', meur(eb, true), 'margen ' + Math.round(cfg.margen * 100) + '%') +
      kpi('Valor orientativo (EV)', meur(evc), meur(evl) + ' – ' + meur(evh)) + '</div>' +
      '<div class="box"><p><b>Comprador:</b> ' + esc(p.comprador) + (c.respaldo ? ' (' + esc(c.respaldo) + ')' : '') + '</p><p><b>Target:</b> ' + esc(p.target) + ' · ' + esc(t.sede || '') + '</p><p><b>Tipo:</b> ' + esc(p.tipo_estrategico) + '</p></div></div></div>');

    // 3. El target
    const crit = [['Tamaño', t.pts_tamano, 2], ['Compradores naturales', t.pts_compradores, 3], ['Señal de venta', t.pts_senal, 3], ['Calidad de datos', t.pts_datos, 2]];
    html += slide('Perfil del target', p.target + ': ' + (frases(et.descripcion)[0] || t.subsector || ''),
      '<div class="cols c2"><div>' + kv([['Sede', t.sede], ['Fundada', et.fundada], ['Actividad', t.subsector], ['Propiedad', t.propiedad], ['Ventas', meur(ventas) + ' (' + origen + ')'], ['Plantilla', t.empleados ? t.empleados + ' personas' : ''], ['EBITDA estimado', meur(eb, true)]]) +
      '<p class="note">' + esc(t.notas || '') + '</p></div><div><h4>Puntos clave</h4>' + ul(String(et.claves || '').split('|').filter(Boolean)) +
      '<h4>Puntuación del target</h4><div class="score">' + crit.map(([l, v, mx]) => '<span>' + l + '</span><div class="bar"><i style="width:' + (100 * Number(v || 0) / mx) + '%"></i></div><b>' + Number(v || 0) + '/' + mx + '</b>').join('') + '</div></div></div>',
      'Fuente: ' + (t.fuente || et.fuente || 'pública'));

    // 4. El comprador y el encaje
    html += slide('Perfil del comprador y encaje', p.comprador + ' busca ' + String(c.hueco || c.perfil_target || 'crecer por compras').replace(/^./, (m) => m.toLowerCase()),
      '<div class="cols c2"><div>' + kv([['Tipo', c.tipo], ['Sede', c.sede], ['Accionista', c.respaldo], ['Tamaño y compras', c.tamano], ['Ticket habitual', c.ticket]]) + '</div>' +
      '<div><table class="t"><tr><th style="width:50%">Lo que busca ' + esc(p.comprador) + '</th><th>Lo que aporta ' + esc(p.target) + '</th></tr>' +
      '<tr><td>' + esc(c.perfil_target || '—') + '</td><td>' + esc([t.subsector, meur(ventas) + ' de ventas', t.sede].filter(Boolean).join(' · ')) + '</td></tr>' +
      '<tr><td>' + esc(c.patron || '—') + '</td><td>' + esc(frases(p.procesos)[0] || '—') + '</td></tr>' +
      '<tr><td>' + esc(c.senales ? 'Señales que vigila: ' + c.senales : '—') + '</td><td>' + esc(t.senal || '—') + '</td></tr></table>' +
      '<p class="note" style="margin-top:4mm">Encaje ' + p.pts_encaje + '/3 · Precedentes ' + p.pts_precedentes + '/2 · Capacidad ' + p.pts_capacidad + '/2 · Disponibilidad ' + disp + '/3</p></div></div>',
      'Fuente: ' + (c.fuente || 'pública'));

    // 5. Sinergias y accionistas
    const sinBox = p.sinergias_ebitda ? '<div class="kpis" style="grid-template-columns:1fr 1fr 1fr">' + kpi('Sinergias de EBITDA', meur(p.sinergias_ebitda, true), 'a velocidad de crucero') +
      kpi('Valor de las sinergias', meur(p.sinergias_ebitda * M.central), '× ' + xm(M.central)) + kpi('EV + sinergias', meur(evc + p.sinergias_ebitda * M.central), 'precio máximo teórico') + '</div>' : '';
    html += slide('Sinergias e impacto para los accionistas', 'La operación crea valor si ' + p.comprador + ' paga menos de lo que valen el negocio y sus sinergias',
      sinBox + '<div class="cols c3"><div class="box"><h4>Sinergias</h4>' + ul(frases(p.sinergias)) + '</div><div class="box"><h4>Accionistas</h4>' + ul(frases(p.accionistas)) +
      '</div><div class="box"><h4>Procesos e integración</h4>' + ul(frases(p.procesos)) + '</div></div>' + (p.sinergias_nota ? '<p class="note">' + esc(p.sinergias_nota) + '</p>' : ''),
      p.modelo ? 'Detalle en el modelo Excel: ' + p.modelo : 'Estimaciones propias');

    // 6. Valoración: football field + comparables
    const bars = [];
    if (eb != null) {
      bars.push({ l: 'Múltiplos del radar (' + xm(M.bajo) + '–' + xm(M.alto) + ')', a: evl, b: evh, c: evc });
      if (comps.length) { const ms = comps.map((x) => x.m); bars.push({ l: 'Comparables (' + xm(Math.min(...ms)) + '–' + xm(Math.max(...ms)) + ')', a: eb * Math.min(...ms), b: eb * Math.max(...ms) }); }
      const lo = Math.max(cfg.margen - 0.02, 0.01), hi = cfg.margen + 0.02;
      bars.push({ l: 'Margen ' + Math.round(lo * 100) + '–' + Math.round(hi * 100) + '% a ' + xm(M.central), a: ventas * lo * M.central, b: ventas * hi * M.central });
      if (p.sinergias_ebitda) bars.push({ l: 'Con sinergias', a: evc, b: evc + p.sinergias_ebitda * M.central });
    }
    const rawMax = Math.max(...bars.map((x) => x.b), 1) * 1.08;
    const pw = Math.pow(10, Math.floor(Math.log10(rawMax / 4)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * pw).find((s) => rawMax / s <= 6);
    const vmax = Math.ceil(rawMax / step) * step;
    const W = 640, L = 175, R = 20, rowH = 46, H = bars.length * rowH + 40;
    const X = (v) => L + (W - L - R) * v / vmax;
    const ticks = []; for (let v = 0; v <= vmax + 1e-9; v += step) ticks.push(v);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '">' + ticks.map((v) => '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="10" y2="' + (H - 24) + '" stroke="#e3dfd6"/><text x="' + X(v) + '" y="' + (H - 8) + '" font-size="10" text-anchor="middle" fill="#5b6577">' + n1.format(v) + '</text>').join('');
    bars.forEach((b, i) => {
      const y = 18 + i * rowH;
      svg += '<text x="' + (L - 10) + '" y="' + (y + 15) + '" font-size="11" text-anchor="end" fill="#1c2330">' + esc(b.l) + '</text>' +
        '<rect x="' + X(b.a) + '" y="' + y + '" width="' + Math.max(X(b.b) - X(b.a), 2) + '" height="22" rx="3" fill="' + (i === 0 ? '#13294b' : i === bars.length - 1 && p.sinergias_ebitda ? '#b08a3e' : '#5d7499') + '"/>' +
        '<text x="' + (X(b.a) - 4) + '" y="' + (y + 15) + '" font-size="10" text-anchor="end" fill="#5b6577">' + n1.format(b.a) + '</text>' +
        '<text x="' + (X(b.b) + 4) + '" y="' + (y + 15) + '" font-size="10" fill="#5b6577">' + n1.format(b.b) + '</text>' +
        (b.c ? '<line x1="' + X(b.c) + '" x2="' + X(b.c) + '" y1="' + (y - 3) + '" y2="' + (y + 25) + '" stroke="#b08a3e" stroke-width="2.5"/>' : '');
    });
    svg += '<text x="' + W / 2 + '" y="' + (H + 2) + '" font-size="9" text-anchor="middle" fill="#5b6577"></text></svg>';
    html += slide('Valoración orientativa', 'Valor empresa central de ' + meur(evc) + ': ' + meur(eb, true) + ' de EBITDA estimado × ' + xm(M.central),
      '<div class="cols c32"><div class="ff"><h4>Rangos de valor empresa (M€)</h4>' + svg + '<p class="note">Línea dorada: valor central. ' + esc(M.texto) + '</p></div>' +
      '<div><h4>Comparables</h4><table class="t"><tr><th>Referencia</th><th class="num">EV/EBITDA</th></tr>' + comps.map((x) => '<tr><td>' + esc(x.n) + (x.f ? ' <span class="note">(' + esc(x.f) + ')</span>' : '') + '</td><td class="num">' + xm(x.m) + '</td></tr>').join('') + '</table>' +
      '<p class="note">EBITDA estimado con un margen de referencia, no publicado. Sin ajustes de deuda, caja ni capital circulante: es un rango para conversar, no una valoración.</p></div></div>',
      'Múltiplos: base de precedentes del radar y referencias de mercado citadas');

    // 7. Precedentes y alternativas
    html += slide('Precedentes y compradores alternativos', 'El comprador ya ha hecho operaciones parecidas y hay alternativas si no avanza',
      '<div class="cols c32"><div><h4>Compras de ' + esc(p.comprador) + ' en la base</h4><table class="t"><tr><th>Fecha</th><th>Comprador</th><th>Target</th><th>Subsector</th><th class="num">Ventas (M€)</th></tr>' +
      (dealRows(dealsComprador, 5) || '<tr><td colspan="5">Sin compras registradas en la base.</td></tr>') + '</table>' +
      (dealsSector.length ? '<h4 style="margin-top:5mm">Otras operaciones del mismo subsector</h4><table class="t"><tr><th>Fecha</th><th>Comprador</th><th>Target</th><th>Subsector</th><th class="num">Ventas (M€)</th></tr>' + dealRows(dealsSector, 4) + '</table>' : '') +
      '</div><div><h4>Precedentes citados</h4>' + ul(frases(p.precedentes)) + '<h4>Compradores alternativos</h4>' + (alt.length ? alt.map((a) => '<span class="chip">' + esc(a) + '</span>').join('') : '<p>—</p>') + '</div></div>',
      'Fuente: biblioteca de precedentes del radar');

    // 8. Riesgos y próximos pasos
    html += slide('Riesgos y próximos pasos', 'Antes de presentar la idea hay que confirmar los datos clave del target',
      '<div class="cols c2"><div><h4>Riesgos</h4>' + ul(frases(p.riesgo)) + '<h4>Próximos pasos</h4>' + ul(frases(p.siguiente_paso).concat(['Confirmar ventas y EBITDA con las cuentas anuales del Registro Mercantil.', 'Preparar una aproximación discreta al accionista a través de un contacto común.'])) + '</div>' +
      '<div><h4>Cómo se ha puntuado la solidez</h4><table class="t"><tr><th>Criterio</th><th class="num">Puntos</th></tr><tr><td>Encaje</td><td class="num">' + p.pts_encaje + ' / 3</td></tr><tr><td>Precedentes</td><td class="num">' + p.pts_precedentes + ' / 2</td></tr><tr><td>Capacidad</td><td class="num">' + p.pts_capacidad + ' / 2</td></tr><tr><td>Disponibilidad del target</td><td class="num">' + disp + ' / 3</td></tr><tr><td><b>Total</b></td><td class="num"><b>' + total + ' / 10 · ' + esc(sol) + '</b></td></tr></table>' +
      '<p class="note" style="margin-top:5mm">Documento elaborado con fuentes públicas y gratuitas y estimaciones propias. Las cifras estimadas están marcadas como tales. No es una recomendación de inversión ni implica conocimiento de la intención de las empresas mencionadas.</p></div></div>');

    root.innerHTML = html;
    document.title = codigo + ' · ' + p.comprador + ' → ' + p.target;
  }).catch((e) => { console.error(e); fail('No se pudieron cargar los datos.'); });
})();
