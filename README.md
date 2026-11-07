# Radar M&A · IT y software B2B España

Radar de originación M&A para el mid-market español (IT y software B2B), elaborado por Pol a partir de fuentes públicas y gratuitas.

- `index.html`: la web (se publica con GitHub Pages).
- `data/*.json`: datos de IT y software B2B. Se actualizan cada lunes.
- `data/alimentacion/*.json`: datos de alimentación y bebidas (industria familiar y auxiliar). Se actualizan cada martes.
- La portada deja elegir sector (`?s=it` o `?s=alimentacion`); en alimentación, `?r=cat` (Cataluña, por defecto) o `?r=es` (toda España). La configuración está en `src/sectores.js`.
- `assets/`: estilos, d3 y el pequeño motor que carga los datos.

Las propuestas comprador → target son hipótesis propias para validar, no recomendaciones de inversión.

## Cómo se genera
`src/` guarda el código fuente: `pagina_dashboard.html` (la misma página que el dashboard de Claude), `dash-lite.js`, `tokens.css` y el tema (`themes/tema.css`). Para regenerar la web:
`python3 src/build_site.py src/pagina_dashboard.html data .`
