"""Monta la web pública (carpeta site/) a partir de la página del dashboard.

Uso: python3 build_site.py <index_dashboard.html> <carpeta_datos_json> <carpeta_salida>
"""
import json, os, re, shutil, sys

src_html, data_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
here = os.path.dirname(os.path.abspath(__file__))
page = open(src_html, encoding='utf-8').read()
page = page.replace("<meta name='dash-one-writer'>\n", '')
m = re.match(r'\s*<style>(.*?)</style>\s*(.*)$', page, re.S)
style, body = m.group(1), m.group(2)

aviso = ("<p class='site-aviso'>Radar de originación M&amp;A elaborado por Pol a partir de fuentes públicas y gratuitas. "
         "Las propuestas comprador → target son hipótesis propias para validar, no recomendaciones de inversión. "
         "Datos actualizados cada lunes.</p>\n")
body = body.replace("  </header>\n", "  </header>\n  " + aviso, 1)

foot = """
<footer class='site-foot'>
  <div>Descargar los datos (CSV):</div>
  <div class='site-dl'>
    <button type='button' data-csv='propuestas'>Propuestas</button>
    <button type='button' data-csv='targets'>Targets</button>
    <button type='button' data-csv='compradores'>Compradores</button>
    <button type='button' data-csv='empresas'>Fichas de empresa</button>
    <button type='button' data-csv='deals'>Precedentes</button>
    <button type='button' data-csv='registro'>Cambios</button>
  </div>
  <div>Fuentes: Baker Tilly Tech M&amp;A España, prensa económica, BORME, CNMV, BME Growth y webs públicas de las empresas. El enlace de cada dato está en su CSV.</div>
</footer>
<script>
  document.querySelectorAll('[data-csv]').forEach((b) => b.addEventListener('click', () => {
    const g = window.dash.data(b.dataset.csv);
    if (g.status !== 'ok' || !g.data.length) return;
    const cols = [...new Set(g.data.flatMap((r) => Object.keys(r)))];
    const esc = (v) => { const s = v == null ? '' : String(v); return /[";\\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '\\ufeff' + [cols.join(';'), ...g.data.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'radar-ma-' + b.dataset.csv + '.csv';
    a.click();
  }));
</script>
"""

html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Radar M&amp;A · IT y software B2B España</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/tema.css">
<style>{style}</style>
<script src="assets/d3.min.js"></script>
<script src="assets/dash-lite.js"></script>
</head>
<body>
<div id="dash-root">
{body}
{foot}
</div>
</body>
</html>
"""
os.makedirs(os.path.join(out, 'assets'), exist_ok=True)
os.makedirs(os.path.join(out, 'data'), exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
for f in ('dash-lite.js', 'tokens.css'):
    shutil.copy(os.path.join(here, f), os.path.join(out, 'assets', f))
shutil.copy(os.path.join(here, 'themes', 'tema.css'), os.path.join(out, 'assets', 'tema.css'))
for f in os.listdir(data_dir):
    if f.endswith('.json'):
        json.load(open(os.path.join(data_dir, f), encoding='utf-8'))  # valida
        shutil.copy(os.path.join(data_dir, f), os.path.join(out, 'data', f))
open(os.path.join(out, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')
print('ok', out)
