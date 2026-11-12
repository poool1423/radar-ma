// Configuración por sector y región. Se carga antes que dash-lite.js.
(function () {
  const q = new URLSearchParams(location.search);
  const SECTORES = {
    it: {
      label: 'IT y software B2B', dir: 'data/', vpe: 0.12, margen: 0.10, dia: 'lunes', regiones: false,
      rango: 'ago-2024 a oct-2026',
      multiplos: { bajo: 5.5, central: 6.9, alto: 10, refs: [], texto: 'Rango de las tres operaciones de la base con EV y EBITDA publicados (5,5x, 6,9x y 10x).' },
      fuentes: 'Baker Tilly Tech M&A España, prensa económica, BORME, CNMV, BME Growth y webs públicas de las empresas.',
    },
    alimentacion: {
      label: 'Alimentación y bebidas', dir: 'data/alimentacion/', vpe: 0.18, margen: 0.08, dia: 'martes', regiones: true,
      rango: 'nov-2024 a nov-2026',
      multiplos: { bajo: 6, central: 7.25, alto: 8.5, refs: [
        { nombre: 'Consumo y retail, España 2025 (media de operaciones)', mult: 8.5, fuente: 'EY-Parthenon', url: 'https://www.ey.com/es_es/newsroom/2026/03/la-actividad-de-m-a-en-consumo-y-retail-aumento-un-25-porciento-en-2025' },
        { nombre: 'Consumo y retail, España 2024 (media de operaciones)', mult: 8.4, fuente: 'EY', url: 'https://www.ey.com/es_es/newsroom/2025/02/aumento--numero-volumen-transacciones-sector-consumo-retail-2024' },
        { nombre: 'Consumo y retail, España media 2015–2025', mult: 9.9, fuente: 'EY-Parthenon', url: 'https://www.ey.com/es_es/newsroom/2026/03/la-actividad-de-m-a-en-consumo-y-retail-aumento-un-25-porciento-en-2025' },
        { nombre: 'Consumo y retail, Europa 2025 (media de operaciones)', mult: 9.0, fuente: 'EY-Parthenon', url: 'https://www.ey.com/es_es/newsroom/2026/03/la-actividad-de-m-a-en-consumo-y-retail-aumento-un-25-porciento-en-2025' },
      ], texto: '8,5x es la media de las operaciones de consumo y retail en España en 2025 según EY-Parthenon; 6x es un supuesto propio de descuento para empresas familiares pequeñas.' },
      mult_ref: 8.5, mult_ref_fuente: 'media de consumo y retail en España en 2025 (EY-Parthenon); en la base solo Deoleo (nov-2026, ~10,4x, muy por encima del rango del radar) publica EV y EBITDA',
      fuentes: 'Alimarket, capital-riesgo.es, Albia IMAP, prensa económica, ranking de elEconomista, ACCIÓ, BORME y webs públicas de las empresas.',
    },
  };
  const s = SECTORES[q.get('s')] ? q.get('s') : null;
  const r = q.get('r') === 'es' ? 'es' : 'cat';
  const cfg = s ? Object.assign({ id: s, region: SECTORES[s].regiones ? r : 'es' }, SECTORES[s]) : { id: null, dir: null, vpe: 0.12, margen: 0.10 };
  window.RD_CFG = cfg;
  window.RD_SECTORES = SECTORES;

  // Filtro de región (solo sectores con regiones): Cataluña deja precedentes con target
  // o comprador catalán, targets catalanes y sus propuestas. Compradores: toda España.
  window.RD_FILTRO = (store) => {
    if (!cfg.regiones || cfg.region !== 'cat') return;
    const cat = (x) => x && x.comunidad === 'Cataluña';
    const f = (id, fn) => { if (store[id] && store[id].status === 'ok') store[id].data = store[id].data.filter(fn); };
    f('deals', (d) => cat(d) || d.comprador_cat === 'Sí');
    f('targets', cat);
    const tn = new Set((store.targets.data || []).map((t) => t.empresa));
    f('propuestas', (p) => tn.has(p.target));
  };

  const go = (params) => {
    const n = new URLSearchParams(location.search);
    Object.entries(params).forEach(([k, v]) => (v == null ? n.delete(k) : n.set(k, v)));
    location.search = n.toString();
  };

  const swapText = (root, from, to) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) if (n.nodeValue.includes(from) && !n.parentElement.closest('.site-bar, select, option')) n.nodeValue = n.nodeValue.split(from).join(to);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('dash-root');
    const portada = document.getElementById('portada');
    if (!portada) return; // páginas sin portada (memo.html)
    if (!s) { document.body.classList.add('sin-sector'); portada.hidden = false; }
    portada.querySelectorAll('[data-sector]').forEach((b) => b.addEventListener('click', () => go({ s: b.dataset.sector })));
    if (!s) return;
    document.title = 'Radar M&A · ' + cfg.label + ' España';

    // Barra de sector y región
    const bar = document.getElementById('site-bar');
    const ss = bar.querySelector('.site-sector');
    ss.value = s; ss.addEventListener('change', () => go({ s: ss.value }));
    const rs = bar.querySelector('.site-region');
    if (cfg.regiones) { rs.hidden = false; rs.value = cfg.region; rs.addEventListener('change', () => go({ r: rs.value })); }
    const nota = bar.querySelector('.site-nota');
    if (cfg.regiones) nota.textContent = cfg.region === 'cat'
      ? 'Vista Cataluña: precedentes con target o comprador catalán, y targets catalanes. Los compradores son de toda España.'
      : 'Vista toda España. El universo de targets empieza por Cataluña y se ampliará.';

    // Textos que dependen del sector
    if (s !== 'it') {
      swapText(root, 'IT y software B2B', cfg.label);
      swapText(root, 'ago-2024 a oct-2026', cfg.rango);
      swapText(root, 'cada lunes', 'cada ' + cfg.dia);
      swapText(root, 'Universo actual: ciberseguridad.', 'Universo actual: empresas familiares catalanas de alimentación y bebidas.');
      swapText(root, 'tamaño en el rango 5–20 M€', 'tamaño en el rango 10–75 M€');
      const dd = [...root.querySelectorAll('#metodo dt')];
      const set = (t, html) => { const x = dd.find((d) => d.textContent === t); if (x) x.nextElementSibling.innerHTML = html; };
      set('Fuentes', 'Solo fuentes gratuitas: ' + cfg.fuentes + ' El enlace de cada operación está en el CSV de Precedentes.');
      set('Ventas estimadas', 'Empleados × <b>' + String(cfg.vpe).replace('.', ',') + '</b> M€ por empleado, calibrado con Cafès Novell, Triticum y Avimosa (0,16–0,22 M€ por empleado).');
      set('EBITDA estimado', 'Para targets privados sin cuentas publicadas: ventas × <b>' + Math.round(cfg.margen * 100) + '%</b> de margen, un supuesto de referencia aún por calibrar con cuentas reales. Orientativo, para filtrar, no para valorar.');
      root.querySelectorAll('.rd-f-comp option').forEach((o) => { if (o.textContent.includes('software')) o.remove(); });
      // Leyenda: rango de tamaño y señal de venta con sucesión
      const lt = root.querySelectorAll('#leyenda-targets tbody tr');
      if (lt[0]) lt[0].cells[1].textContent = '2: ventas publicadas dentro de 10–75 M€ · 1: estimación dentro del rango o dato aproximado · 0: fuera del rango o sin dato';
      if (lt[2]) lt[2].cells[1].textContent = '3: sucesión sin relevo declarada o venta anunciada · 2: generación saliente sin sucesor visible, fondo cerca de su salida o cambios de administrador · 1: empresa familiar estable, sin señales · 0: sin información';
      const card = root.querySelector('#leyenda-targets');
      if (card) {
        const p = document.createElement('p'); p.className = 'rd-note';
        p.innerHTML = '<b>Sucesión.</b> En alimentación el relevo generacional es el principal motivo de venta: en la biblioteca de precedentes, la columna <i>sucesion</i> marca las ventas en que la familia vendió por falta de relevo, y la señal de venta de cada target puntúa lo que se sabe de su generación al frente.';
        card.appendChild(p);
      }
    }
    const av = document.querySelector('.site-aviso b'); if (av) av.textContent = cfg.dia;
    const fu = document.querySelector('.site-fuentes'); if (fu) fu.textContent = 'Fuentes: ' + cfg.fuentes + ' El enlace de cada dato está en su CSV.';
  });
})();
