// dash-lite: versión mínima del entorno del dashboard para la web pública.
// Carga los JSON de /data, calcula los "calc" y ejecuta los "draw" de la página.
(function () {
  const DATASETS = ['deals', 'compradores', 'targets', 'propuestas', 'empresas', 'registro'];
  const store = {};      // id -> {status, data}
  const calcs = {};      // id -> {inputs, fn}
  const draws = {};      // name -> fn
  let ready = false;

  DATASETS.forEach((id) => { store[id] = { status: 'loading', data: [] }; });

  const computeCalcs = () => {
    const pending = Object.keys(calcs);
    let guard = 0;
    while (pending.length && guard++ < 50) {
      for (let i = pending.length - 1; i >= 0; i--) {
        const id = pending[i];
        const c = calcs[id];
        const ins = c.inputs.map((x) => store[x]);
        if (ins.some((x) => !x)) continue;
        if (ins.some((x) => x.status === 'error')) { store[id] = { status: 'error', data: [] }; pending.splice(i, 1); continue; }
        if (ins.some((x) => x.status !== 'ok')) continue;
        try { store[id] = { status: 'ok', data: c.fn(...ins.map((x) => x.data)) }; }
        catch (e) { console.error('calc', id, e); store[id] = { status: 'error', data: [] }; }
        pending.splice(i, 1);
      }
    }
  };

  const runDraw = (name) => {
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      if (el.closest('[hidden]')) return;
      try { fn(el); } catch (e) { console.error('draw', name, e); }
    });
  };
  const runAll = () => Object.keys(draws).forEach(runDraw);

  window.dash = {
    get colors() {
      const cs = getComputedStyle(document.documentElement);
      const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
      return [v('--rd-accent', '#c4673f'), v('--rd-accent-2', '#3d6fb4'), '#5a9a62', '#b48a2c', '#8a5bb4', '#3a9aa0', '#b4505f', '#6f7a86'];
    },
    data: (id) => store[id] || { status: ready ? 'missing' : 'loading', data: [] },
    calc: (id, def) => { calcs[id] = def; store[id] = { status: 'loading', data: [] }; },
    draw: (name, fn) => {
      if (typeof fn === 'function') { draws[name] = fn; if (ready) runDraw(name); }
      else runDraw(name);
    },
    onData: () => {},
    loader: () => {},
    setLink: (name) => {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* sin historial */ }
      requestAnimationFrame(runAll);
    },
    params: () => ({}),
    setParams: () => {},
    resetParams: () => {},
    refresh: () => {},
  };

  const load = () => Promise.all(DATASETS.map((id) =>
    fetch('data/' + id + '.json', { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { store[id] = { status: 'ok', data: Array.isArray(d) ? d : (d.rows || d.data || []) }; })
      .catch((e) => { console.error('dataset', id, e); store[id] = { status: 'error', data: [] }; })
  ));

  window.addEventListener('DOMContentLoaded', () => {
    ready = true;
    runAll();
    load().then(() => { computeCalcs(); runAll(); document.dispatchEvent(new Event('radar:loaded')); });
  });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(runAll, 150); });
  window.RADAR_STORE = store;
})();
