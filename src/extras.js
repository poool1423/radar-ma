// Extras de la web pública: novedades, valoración orientativa, validación y memos.
// Se carga al final del body, después del script de la página.
(function () {
  const cfg = window.RD_CFG || {};
  if (!cfg.id) return;
  const RD = window.RD;
  const M = cfg.multiplos;
  const n1 = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
  const n2 = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
  const x1 = (v) => n2.format(v) + 'x';
  const ebOf = (s) => (s && s.ventas_ref != null ? s.ventas_ref * cfg.margen : null);
  const meur = (v) => (v == null || isNaN(v) ? '—' : n1.format(v) + ' M€');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (id) => { const g = dash.data(id); return g.status === 'ok' ? g.data : null; };
  const ev = (ebitda) => (ebitda == null ? [null, null] : [ebitda * M.bajo, ebitda * M.alto]);
  const solidez = (t) => (RD && RD.solidez ? RD.solidez(t) : '');

  // 1. Novedades de los últimos 7 días (a partir del registro de cambios)
  dash.draw('novedades', (el) => {
    const reg = ok('registro');
    if (!reg) { el.textContent = ''; return; }
    const fechas = reg.map((r) => r.fecha).filter(Boolean).sort();
    const ultima = fechas[fechas.length - 1];
    const lim = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const rec = reg.filter((r) => r.fecha >= lim).slice(-6).reverse();
    const item = (r) => '<li><b>' + esc(r.entidad) + '</b> · ' + esc(r.campo) + (r.valor_nuevo != null ? ': ' + esc(r.valor_nuevo) : '') + (r.motivo ? ' <span>(' + esc(r.motivo) + ')</span>' : '') + '</li>';
    el.innerHTML = rec.length
      ? '<div class="nv-t">Novedades de los últimos 7 días</div><ul>' + rec.map(item).join('') + '</ul>'
      : '<div class="nv-t">Sin cambios en los últimos 7 días</div><p>Última actualización: ' + esc(ultima || '—') + '. La próxima revisión es el ' + esc(cfg.dia) + '.</p>';
  });

  // 2. Múltiplo de referencia cuando la base no tiene operaciones con EV y EBITDA
  if (cfg.mult_ref) {
    dash.draw('k_mult', (el) => {
      el.textContent = x1(cfg.mult_ref);
      const sub = el.parentElement.querySelector('.rd-tile-sub');
      if (sub) sub.textContent = 'Referencia de mercado: ' + cfg.mult_ref_fuente;
      const lab = el.parentElement.querySelector('.rd-tile-label');
      if (lab) lab.textContent = 'EV / EBITDA de referencia';
    });
  }

  // 3. Valoración orientativa de los targets: EBITDA × múltiplo = EV
  const evc = (eb) => (eb == null ? null : eb * M.central);
  dash.draw('tb_valor', (el) => {
    const ts = ok('targets_score'), tg = ok('targets');
    if (!ts || !tg) return;
    const f = (v) => (v == null ? '—' : n1.format(v));
    const rows = ts.slice().sort((a, b) => b.total - a.total).map((s) => {
      const t = tg.find((x) => x.empresa === s.empresa) || {};
      const eb = ebOf(s); const [lo, hi] = ev(eb);
      return '<tr><td data-emp="' + esc(s.empresa) + '"></td><td class="rd-num">' + f(s.ventas_ref) + '</td><td class="rd-num">' + Math.round(cfg.margen * 100) + '%</td><td class="rd-num"><b>' + (eb == null ? '—' : n2.format(eb)) +
        '</b></td><td class="rd-num">' + x1(M.bajo) + '</td><td class="rd-num">' + f(lo) + '</td><td class="rd-num">' + x1(M.central) + '</td><td class="rd-num"><b>' + f(evc(eb)) +
        '</b></td><td class="rd-num">' + x1(M.alto) + '</td><td class="rd-num">' + f(hi) + '</td></tr>';
    });
    el.innerHTML = '<thead><tr><th>Empresa</th><th class="rd-num">Ventas</th><th class="rd-num">Margen EBITDA</th><th class="rd-num">EBITDA est.</th>' +
      '<th class="rd-num">Múlt. bajo</th><th class="rd-num">EV bajo</th><th class="rd-num">Múlt. central</th><th class="rd-num">EV central</th><th class="rd-num">Múlt. alto</th><th class="rd-num">EV alto</th></tr></thead><tbody>' + rows.join('') + '</tbody>';
    el.querySelectorAll('td[data-emp]').forEach((td) => (RD && RD.nameBtn ? RD.nameBtn(td, td.dataset.emp) : (td.textContent = td.dataset.emp)));
  });
  dash.draw('valor_nota', (el) => {
    el.innerHTML = 'Cifras en M€. <b>EV = EBITDA × múltiplo</b>. EBITDA = ventas × margen de referencia (' + Math.round(cfg.margen * 100) + '%), porque los targets no publican su EBITDA. Múltiplos: bajo <b>' + x1(M.bajo) + '</b>, central <b>' + x1(M.central) + '</b> y alto <b>' + x1(M.alto) + '</b>. ' + esc(M.texto) +
      ' Es un rango para ordenar y conversar, no una valoración: no se ajusta deuda, caja ni calidad del negocio. De dónde salen los múltiplos: tabla de comparables de abajo.';
  });

  // 3b. Comparables: operaciones de la base con EV y EBITDA + referencias de mercado
  dash.draw('tb_comps', (el) => {
    const deals = ok('deals');
    if (!deals) return;
    const f = (v) => (v == null ? '—' : n1.format(v));
    const ops = deals.filter((d) => d.ev && d.ebitda).map((d) => ({ tipo: 'Operación', nombre: d.comprador + ' → ' + d.target, fecha: d.fecha, ev: d.ev, eb: d.ebitda, mult: d.ev / d.ebitda, fuente: d.fuente }));
    const refs = (M.refs || []).map((r) => ({ tipo: 'Referencia de mercado', nombre: r.nombre, fecha: '', ev: null, eb: null, mult: r.mult, fuente: r.url, fnombre: r.fuente }));
    const all = ops.concat(refs);
    const link = (r) => (/^https?:/.test(r.fuente || '') ? '<a href="' + esc(r.fuente) + '" target="_blank" rel="noopener">' + esc(r.fnombre || 'Fuente') + '</a>' : esc(r.fuente || ''));
    const rows = all.map((r) => '<tr><td>' + esc(r.tipo) + '</td><td>' + esc(r.nombre) + '</td><td>' + esc(r.fecha) + '</td><td class="rd-num">' + f(r.ev) + '</td><td class="rd-num">' + f(r.eb) +
      '</td><td class="rd-num"><b>' + x1(r.mult) + '</b></td><td>' + link(r) + '</td></tr>');
    const ms = ops.map((o) => o.mult).sort((a, b) => a - b);
    const med = ms.length ? (ms.length % 2 ? ms[ms.length >> 1] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2) : null;
    el.innerHTML = '<thead><tr><th>Tipo</th><th>Comparable</th><th>Fecha</th><th class="rd-num">EV (M€)</th><th class="rd-num">EBITDA (M€)</th><th class="rd-num">EV / EBITDA</th><th>Fuente</th></tr></thead><tbody>' +
      (rows.join('') || '<tr><td colspan="7">Sin comparables todavía.</td></tr>') + '</tbody>' +
      '<tfoot><tr><td colspan="7" class="rd-note">Operaciones de la base con EV y EBITDA publicados: <b>' + ops.length + '</b>' + (med != null ? ' · mediana <b>' + x1(med) + '</b>' : '') +
      '. Con menos de unas diez operaciones el rango es solo orientativo; las referencias de mercado son medias de operaciones de todos los tamaños y suelen quedar por encima de lo que se paga por empresas pequeñas.</td></tr></tfoot>';
  });

  // 4. Validación de la puntuación con empresas que ya se vendieron
  dash.draw('tb_validacion', (el) => {
    const v = ok('validacion');
    if (!v || !v.length) { el.innerHTML = '<tbody><tr><td>Sin datos de validación todavía.</td></tr></tbody>'; return; }
    const rows = v.map((r) => '<tr><td><b>' + esc(r.target) + '</b><br><span class="rd-note">' + esc(r.comprador) + ' · ' + esc(r.fecha_venta) + '</span></td><td class="rd-num">' +
      [r.pts_tamano, r.pts_compradores, r.pts_senal, r.pts_datos].join(' · ') + '</td><td class="rd-num"><b>' + r.total + '</b></td><td>' + esc(r.prioridad) + '</td><td class="rd-wide">' + esc(r.por_que) + '</td></tr>');
    el.innerHTML = '<thead><tr><th>Empresa vendida</th><th class="rd-num">Tam · Comp · Señal · Datos</th><th class="rd-num">Total</th><th>Prioridad</th><th>Por qué</th></tr></thead><tbody>' + rows.join('') + '</tbody>';
  });
  dash.draw('validacion_resumen', (el) => {
    const v = ok('validacion');
    if (!v || !v.length) { el.textContent = ''; return; }
    const media = v.filter((r) => r.total >= 5).length, alta = v.filter((r) => r.total >= 8).length;
    const senal = v.filter((r) => r.pts_senal <= 1).length;
    el.innerHTML = 'De <b>' + v.length + '</b> empresas que se vendieron, <b>' + media + '</b> habrían salido con prioridad media o alta y <b>' + alta +
      '</b> con prioridad alta. El criterio más débil es la señal de venta: en <b>' + senal + '</b> de ' + v.length +
      ' casos no había ninguna señal pública antes de la venta. Límites: la puntuación se ha reconstruido después de conocer la venta (sesgo de retrospectiva) y solo se miran empresas que sí se vendieron; falta comprobar cuántas empresas con nota alta no se venden.';
  });

  // 5. Memos de originación
  const memoHTML = (p) => {
    const ts = (ok('targets_score') || []).find((x) => x.empresa === p.target) || {};
    const t = (ok('targets') || []).find((x) => x.empresa === p.target) || {};
    const c = (ok('compradores') || []).find((x) => x.comprador === p.comprador) || {};
    const ps = (ok('prop_score') || []).find((x) => x.id === p.id) || {};
    const eb = ebOf(ts); const [lo, hi] = ev(eb);
    const alt = (t.compradores || '').split(',').map((s) => s.trim()).filter((s) => s && !p.comprador.startsWith(s) && !s.startsWith(p.comprador.split(' ')[0]));
    const fila = (k, v) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
    return '<div class="memo-k">Memo de originación · ' + esc(cfg.label) + ' · ' + esc(p.fecha_alta || '') + ' · ' + esc(p.id) + '</div>' +
      '<h2>' + esc(p.comprador) + ' → ' + esc(p.target) + '</h2>' +
      '<p class="memo-tesis">' + esc(p.tesis) + '</p>' +
      '<div class="memo-cifras">' +
      '<div><span>Solidez</span><b>' + (ps.total != null ? ps.total + '/10 · ' + esc(solidez(ps.total)) : '—') + '</b></div>' +
      '<div><span>Ventas target</span><b>' + meur(ts.ventas_ref) + '</b><i>' + esc(ts.origen_ventas || '') + '</i></div>' +
      '<div><span>EBITDA estimado</span><b>' + (eb == null ? '—' : n2.format(eb) + ' M€') + '</b><i>margen ' + Math.round(cfg.margen * 100) + '%</i></div>' +
      '<div><span>EV central</span><b>' + meur(evc(eb)) + '</b><i>' + (eb == null ? '—' : n2.format(eb) + ' M€') + ' × ' + x1(M.central) + ' · rango ' + (lo == null ? '—' : n1.format(lo) + '–' + n1.format(hi) + ' M€') + '</i></div>' +
      '</div><table class="memo-t">' +
      fila('Tipo', esc(p.tipo_estrategico)) +
      fila('Target', esc([t.sede, t.subsector].filter(Boolean).join(' · ')) + '<br>' + esc(t.propiedad || '')) +
      fila('Comprador', esc([c.sede, c.respaldo].filter(Boolean).join(' · ')) + '<br>' + esc(c.tamano || '') + (c.ticket ? '<br>Ticket habitual: ' + esc(c.ticket) : '')) +
      fila('Sinergias', esc(p.sinergias)) +
      fila('Accionistas', esc(p.accionistas)) +
      fila('Procesos', esc(p.procesos)) +
      fila('Precedentes', esc(p.precedentes)) +
      fila('Señal de venta', esc(t.senal || '—')) +
      fila('Compradores alternativos', esc(alt.join(', ') || '—')) +
      fila('Riesgos', esc(p.riesgo)) +
      fila('Puntos', esc(p.por_que)) +
      fila('Siguiente paso', esc(p.siguiente_paso)) +
      (p.modelo ? fila('Modelo', '<a href="' + esc(p.modelo) + '" download>Descargar el modelo en Excel (valoración, sinergias e impacto en el comprador)</a>') : '') +
      '</table><p class="memo-pie">Hipótesis propia elaborada con fuentes públicas; no es una recomendación de inversión. Valor orientativo con EBITDA estimado. Fuente del target: ' + esc(t.fuente || '—') + '</p>';
  };
  // Botón "Memo" en cada tarjeta de propuesta con solidez de 7 o más
  const ponerMemos = () => {
    const ps = ok('prop_score');
    if (!ps) return;
    document.querySelectorAll('#propuestas-lista > article[id^="prop-"]').forEach((card) => {
      if (card.querySelector('.rd-memo-btn')) return;
      const pid = card.id.slice(5);
      const sc = ps.find((x) => x.id === pid);
      if (!sc || sc.total < 7) return;
      const a = document.createElement('a');
      a.className = 'rd-memo-btn';
      a.href = 'memo.html?s=' + encodeURIComponent(cfg.id) + '&id=' + encodeURIComponent(pid);
      a.target = '_blank'; a.rel = 'noopener';
      a.title = 'Abrir el memo de originación (pitch book)';
      a.textContent = 'Memo ↗';
      const pair = card.querySelector('.rd-pair');
      if (pair) pair.after(a); else card.prepend(a);
    });
  };
  const lista = document.getElementById('propuestas-lista');
  if (lista) new MutationObserver(ponerMemos).observe(lista, { childList: true });
  document.addEventListener('radar:loaded', ponerMemos);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-memo]');
    if (b) {
      const p = (ok('propuestas') || []).find((x) => x.id === b.dataset.memo);
      if (!p) return;
      const d = document.getElementById('memo');
      d.querySelector('.memo-body').innerHTML = memoHTML(p);
      d.showModal();
      return;
    }
    if (e.target.closest('.memo-cerrar')) document.getElementById('memo').close();
    if (e.target.closest('.memo-imprimir')) window.print();
  });
})();

// Filtros por columna en las tablas de datos (Targets, Compradores, Precedentes, Cambios)
(function () {
  if (!(window.RD_CFG || {}).id) return;
  const TABLAS = ['tb_targets', 'tb_compradores', 'tb_deals', 'tb_cambios'];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const setup = (tbody) => {
    const table = tbody.closest('table');
    const head = table && table.tHead && table.tHead.rows[0];
    if (!head || table.dataset.filtros) return;
    table.dataset.filtros = '1';
    const fr = table.tHead.insertRow(-1);
    fr.className = 'rd-filtros';
    const ncol = head.cells.length;
    const ctrls = [];
    for (let i = 0; i < ncol; i++) {
      const th = document.createElement('th');
      fr.appendChild(th);
      ctrls.push({ th, el: null, tipo: null });
    }
    const info = document.createElement('div');
    info.className = 'rd-filtros-info';
    const box = table.closest('.rd-tablebox') || table;
    box.parentNode.insertBefore(info, box);

    const celdas = () => [...tbody.rows].filter((r) => r.cells.length === ncol);
    const aplicar = () => {
      const rows = celdas();
      let vis = 0;
      rows.forEach((r) => {
        const ok = ctrls.every((c, i) => {
          if (!c.el || !c.el.value) return true;
          const txt = norm(r.cells[i].textContent);
          return c.tipo === 'select' ? txt === norm(c.el.value) : txt.includes(norm(c.el.value));
        });
        r.hidden = !ok;
        if (ok) vis++;
      });
      const activos = ctrls.filter((c) => c.el && c.el.value).length;
      info.innerHTML = 'Mostrando <b>' + vis + '</b> de ' + rows.length + ' filas' + (activos ? ' · <button type="button" class="rd-filtros-limpiar">Quitar filtros</button>' : ' · filtra con la fila bajo los títulos de las columnas');
    };
    const construir = () => {
      const rows = celdas();
      if (!rows.length) { aplicar(); return; } // tabla aún sin dibujar (pestaña oculta)
      ctrls.forEach((c, i) => {
        const vals = [...new Set(rows.map((r) => r.cells[i].textContent.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
        const largo = vals.some((v) => v.length > 60);
        // El tipo de filtro se decide una vez, con la tabla completa, y no cambia después
        const tipo = c.tipo || (!largo && vals.length > 0 && vals.length <= 20 && vals.length < rows.length ? 'select' : 'text');
        const prev = c.el ? c.el.value : '';
        if (tipo === 'select' && prev && !vals.includes(prev)) vals.push(prev);
        if (tipo !== c.tipo) {
          c.th.replaceChildren();
          c.el = document.createElement(tipo === 'select' ? 'select' : 'input');
          if (tipo === 'text') { c.el.type = 'search'; c.el.placeholder = 'Filtrar…'; c.el.addEventListener('input', aplicar); }
          else c.el.addEventListener('change', aplicar);
          c.el.setAttribute('aria-label', 'Filtrar ' + head.cells[i].textContent.trim());
          c.th.appendChild(c.el);
          c.tipo = tipo;
        }
        if (tipo === 'select') {
          c.el.innerHTML = '<option value="">Todos</option>' + vals.map((v) => '<option>' + v.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</option>').join('');
          c.el.value = prev;
        } else c.el.value = prev;
      });
      fr.querySelectorAll('th').forEach((th) => { th.style.top = head.offsetHeight + 'px'; });
      aplicar();
    };
    info.addEventListener('click', (e) => {
      if (!e.target.closest('.rd-filtros-limpiar')) return;
      ctrls.forEach((c) => { if (c.el) c.el.value = ''; });
      aplicar();
    });
    new MutationObserver(construir).observe(tbody, { childList: true });
    construir();
  };
  const iniciar = () => TABLAS.forEach((n) => document.querySelectorAll('tbody[data-draw="' + n + '"]').forEach(setup));
  document.addEventListener('radar:loaded', iniciar);
  // Al cambiar de pestaña la tabla se dibuja por primera vez: recalcular la altura de la cabecera
  document.addEventListener('click', (e) => { if (e.target.closest('[data-tab]')) requestAnimationFrame(() => document.querySelectorAll('.rd-filtros th').forEach((th) => { const h = th.closest('thead').rows[0]; th.style.top = h.offsetHeight + 'px'; })); });
})();
