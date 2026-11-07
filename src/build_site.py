"""Monta la web pública (carpeta site/) a partir de la página del dashboard.

Uso: python3 build_site.py <index_dashboard.html> <carpeta_datos_json> <carpeta_salida>
"""
import json, os, re, shutil, sys

src_html, data_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
here = os.path.dirname(os.path.abspath(__file__))
page = open(src_html, encoding='utf-8').read()
page = page.replace("<meta name='dash-one-writer'>\n", '')
# Supuestos por sector (los fija assets/sectores.js)
for a, z in [("window.RD_VPE = 0.12;", "window.RD_VPE = window.RD_CFG.vpe;"),
             ("window.RD_MARGEN = 0.10;", "window.RD_MARGEN = window.RD_CFG.margen;"),
             ("* 0.12 * 10", "* window.RD_VPE * 10"), ("* 0.10 * 10", "* window.RD_MARGEN * 10"),
             ("empleados × 0,12 M€) y EBITDA estimado (ventas × 10%)", "empleados × ventas por empleado) y EBITDA estimado (ventas × margen)")]:
    assert a in page, a
    page = page.replace(a, z)
m = re.match(r'\s*<style>(.*?)</style>\s*(.*)$', page, re.S)
style, body = m.group(1), m.group(2)

portada = """
<section id='portada' class='portada' hidden>
  <p class='portada-kicker'>Radar de originación M&amp;A · mid-market español</p>
  <h1>¿Qué mercado quieres ver?</h1>
  <p class='portada-lede'>Parejas comprador → target, con sinergias, precedentes y una nota de solidez. Elige un sector.</p>
  <div class='portada-cards'>
    <button type='button' class='portada-card' data-sector='it'><span class='pc-t'>IT y software B2B</span><span class='pc-s'>Software, integradores y ciberseguridad · toda España · se actualiza los lunes</span></button>
    <button type='button' class='portada-card' data-sector='alimentacion'><span class='pc-t'>Alimentación y bebidas</span><span class='pc-s'>Industria familiar y auxiliar · Cataluña o toda España · se actualiza los martes</span></button>
  </div>
  <p class='portada-pie'>Elaborado por Pol a partir de fuentes públicas y gratuitas. Hipótesis para validar, no recomendaciones de inversión.</p>
</section>
"""
bar = """<div id='site-bar' class='site-bar'>
    <label>Sector <select class='site-sector' aria-label='Sector'><option value='it'>IT y software B2B</option><option value='alimentacion'>Alimentación y bebidas</option></select></label>
    <select class='site-region' aria-label='Región' hidden><option value='cat'>Cataluña</option><option value='es'>Toda España</option></select>
    <span class='site-nota'></span>
  </div>
"""
aviso = ("<p class='site-aviso'>Radar de originación M&amp;A elaborado por Pol a partir de fuentes públicas y gratuitas. "
         "Las propuestas comprador → target son hipótesis propias para validar, no recomendaciones de inversión. "
         "Datos actualizados cada <b>lunes</b>.</p>\n")
body = body.replace("  </header>\n", "  </header>\n  " + bar + "  " + aviso + "  <div class='site-novedades' data-draw='novedades'></div>\n", 1)

def inject(body, marker, html, after=True):
    i = body.index(marker)
    j = i + len(marker) if after else i
    return body[:j] + html + body[j:]

def before_section_end(body, sec_id, html):
    i = body.index("id='" + sec_id + "'")
    j = body.index('</section>', i)
    return body[:j] + html + body[j:]

# Memos en Propuestas (tras el párrafo de introducción)
i = body.index("id='propuestas'")
j = body.index('</p>', i) + 4
body = body[:j] + "\n    <div class='site-memos' data-draw='memo_lista'></div>" + body[j:]
# Valoración orientativa en Targets
body = before_section_end(body, 'targets', """
    <div class='rd-card site-valor'>
      <h3>Valoración orientativa</h3>
      <p class='rd-note' data-draw='valor_nota'></p>
      <div class='rd-tablebox'><table class='rd-table' data-draw='tb_valor'></table></div>
    </div>
""")
# Validación de la puntuación en Leyenda
body = before_section_end(body, 'leyenda', """
    <div class='rd-card site-valid'>
      <h3>¿Funciona la puntuación? Validación con empresas ya vendidas</h3>
      <p class='rd-note' data-draw='validacion_resumen'></p>
      <div class='rd-tablebox'><table class='rd-table' data-draw='tb_validacion'></table></div>
    </div>
""")

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
    <button type='button' data-csv='validacion'>Validación</button>
  </div>
  <div class='site-fuentes'></div>
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
<title>Radar M&amp;A · mid-market España</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/tema.css">
<style>{style}</style>
<script src="assets/d3.min.js"></script>
<script src="assets/sectores.js"></script>
<script src="assets/dash-lite.js"></script>
</head>
<body>
<div id="dash-root">
{portada}
{body}
{foot}
<dialog id="memo" class="memo">
  <div class="memo-bar"><button type="button" class="memo-imprimir">Imprimir o guardar en PDF</button><button type="button" class="memo-cerrar">Cerrar</button></div>
  <div class="memo-body"></div>
</dialog>
</div>
<script src="assets/extras.js"></script>
</body>
</html>
"""
os.makedirs(os.path.join(out, 'assets'), exist_ok=True)
os.makedirs(os.path.join(out, 'data'), exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
for f in ('dash-lite.js', 'sectores.js', 'extras.js', 'tokens.css'):
    shutil.copy(os.path.join(here, f), os.path.join(out, 'assets', f))
shutil.copy(os.path.join(here, 'themes', 'tema.css'), os.path.join(out, 'assets', 'tema.css'))
for dp, _, files in os.walk(data_dir):
    rel = os.path.relpath(dp, data_dir)
    if rel.startswith(('.', '_')) and rel != '.':
        continue
    os.makedirs(os.path.join(out, 'data', rel), exist_ok=True)
    for f in files:
        if f.endswith('.json'):
            src_f, dst_f = os.path.join(dp, f), os.path.join(out, 'data', rel, f)
            json.load(open(src_f, encoding='utf-8'))  # valida
            if os.path.abspath(src_f) != os.path.abspath(dst_f):
                shutil.copy(src_f, dst_f)
open(os.path.join(out, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')
print('ok', out)
