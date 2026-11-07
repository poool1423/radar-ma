// Extras de la web pública: novedades, valoración orientativa, validación y memos.
// Se carga al final del body, después del script de la página.
(function () {
  const cfg = window.RD_CFG || {};
  if (!cfg.id) return;
  const RD = window.RD;
  const M = cfg.multiplos;
  const n1 = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
  const x1 = (v) => n1.format(v) + 'x';
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

  // 3. Valoración orientativa de los targets
  dash.draw('tb_valor', (el) => {
    const ts = ok('targets_score'), tg = ok('targets');
    if (!ts || !tg) return;
    const rows = ts.slice().sort((a, b) => b.total - a.total).map((s) => {
      const t = tg.find((x) => x.empresa === s.empresa) || {};
      const [lo, hi] = ev(s.ebitda_est);
      return '<tr><td data-emp="' + esc(s.empresa) + '"></td><td class="rd-num">' + meur(s.ventas_ref) + '</td><td class="rd-num">' + meur(s.ebitda_est) +
        '</td><td class="rd-num"><b>' + (lo == null ? '—' : n1.format(lo) + '–' + n1.format(hi) + ' M€') + '</b></td><td class="rd-mid">' + esc(t.compradores || '') + '</td></tr>';
    });
    el.innerHTML = '<thead><tr><th>Empresa</th><th class="rd-num">Ventas</th><th class="rd-num">EBITDA est.</th><th class="rd-num">Valor empresa (EV)</th><th>Compradores naturales</th></tr></thead><tbody>' + rows.join('') + '</tbody>';
    el.querySelectorAll('td[data-emp]').forEach((td) => (RD && RD.nameBtn ? RD.nameBtn(td, td.dataset.emp) : (td.textContent = td.dataset.emp)));
  });
  dash.draw('valor_nota', (el) => {
    el.innerHTML = 'EV = EBITDA estimado × múltiplo de <b>' + x1(M.bajo) + '</b> a <b>' + x1(M.alto) + '</b>. ' + esc(M.texto) +
      ' Es un rango para ordenar y conversar, no una valoración: el EBITDA es estimado y no se ajusta deuda, caja ni calidad del negocio.';
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
    const [lo, hi] = ev(ts.ebitda_est);
    const alt = (t.compradores || '').split(',').map((s) => s.trim()).filter((s) => s && !p.comprador.startsWith(s) && !s.startsWith(p.comprador.split(' ')[0]));
    const fila = (k, v) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
    return '<div class="memo-k">Memo de originación · ' + esc(cfg.label) + ' · ' + esc(p.fecha_alta || '') + ' · ' + esc(p.id) + '</div>' +
      '<h2>' + esc(p.comprador) + ' → ' + esc(p.target) + '</h2>' +
      '<p class="memo-tesis">' + esc(p.tesis) + '</p>' +
      '<div class="memo-cifras">' +
      '<div><span>Solidez</span><b>' + (ps.total != null ? ps.total + '/10 · ' + esc(solidez(ps.total)) : '—') + '</b></div>' +
      '<div><span>Ventas target</span><b>' + meur(ts.ventas_ref) + '</b><i>' + esc(ts.origen_ventas || '') + '</i></div>' +
      '<div><span>EBITDA estimado</span><b>' + meur(ts.ebitda_est) + '</b><i>margen ' + Math.round(cfg.margen * 100) + '%</i></div>' +
      '<div><span>Valor orientativo (EV)</span><b>' + (lo == null ? '—' : n1.format(lo) + '–' + n1.format(hi) + ' M€') + '</b><i>' + x1(M.bajo) + '–' + x1(M.alto) + ' EBITDA</i></div>' +
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
  dash.draw('memo_lista', (el) => {
    const ps = ok('prop_score'), pr = ok('propuestas');
    if (!ps || !pr) return;
    const orden = pr.slice().sort((a, b) => ((ps.find((x) => x.id === b.id) || {}).total || 0) - ((ps.find((x) => x.id === a.id) || {}).total || 0));
    el.innerHTML = '<span class="ml-t">Memos de originación (imprimibles):</span>' + orden.slice(0, 6).map((p) =>
      '<button type="button" class="ml-b" data-memo="' + esc(p.id) + '">' + esc(p.comprador) + ' → ' + esc(p.target) + '</button>').join('');
  });
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
