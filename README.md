# Radar M&A · IT y software B2B España

Radar de originación M&A para el mid-market español (IT y software B2B), elaborado por Pol a partir de fuentes públicas y gratuitas.

- `index.html`: la web (se publica con GitHub Pages).
- `data/*.json`: los datos. Se actualizan cada lunes.
- `assets/`: estilos, d3 y el pequeño motor que carga los datos.

Las propuestas comprador → target son hipótesis propias para validar, no recomendaciones de inversión.

## Cómo se genera
`src/` guarda el código fuente: `pagina_dashboard.html` (la misma página que el dashboard de Claude), `dash-lite.js`, `tokens.css` y el tema (`themes/tema.css`). Para regenerar la web:
`python3 src/build_site.py src/pagina_dashboard.html data .`
