# Estilo 11 · Pixel Art (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=pixel-art`
Familia: Retro-digital · Modo nativo: **oscuro** · Modos: dark + light
Veredicto: **experimental**

## Identidad en tres líneas

1. **Sin antialias no hay medias tintas.** Radios a 0, sombras duras
   desplazadas (4/6/8px a negro sólido) y movimiento en `steps()`: todo se
   lee como un sprite.
2. **Paleta limitada de verdad:** negro azulado, blanco fósforo, amarillo
   moneda, verde 1-UP, rojo y azul. Nada más; el resto son grises de la
   misma tinta.
3. **La textura vive en la superficie.** El damero de 4px es
   `background-image` del panel, nunca una capa sobre el texto.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="pixel-art"]` | `../tokens.css` y `../components.css` |
| Overrides con filete grueso y sombra dura | `clip-path` en controles (recorta el foco) |
| Puente `--skin-*` | La familia tipográfica (regla del contrato) |

## Decisiones que definen al estilo

**El botón se hunde, no se eleva.** En `:active` el botón se traslada 2px y
su sombra pasa de 4px a 2px. Es el único "movimiento" que necesita un
botón pixel y reemplaza cualquier transición de sombras:

```css
[data-style="pixel-art"] .btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #000000;
}
```

**La portada se vuelve pixel art sola.** Una línea convierte la imagen del
hero en sprite, sin assets nuevos:

```css
[data-style="pixel-art"] .hero-media img {
  image-rendering: pixelated;
}
```

**El modo claro apaga el dither.** La trama sobre papel crema es ruido, no
carácter, así que en claro solo quedan el filete, la sombra dura y el
amarillo oscurecido (`#776000`, 5.01:1). Esa asimetría es deliberada.

## Contraste (verificado con cálculo, no estimado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Tinta `#f2f2e8` sobre fondo `#101018` | 16.80:1 | AAA |
| Cuerpo `#c9c9d4` sobre fondo | 11.53:1 | AAA |
| Tenue `#8b8b9e` sobre fondo | 5.67:1 | AA |
| Amarillo `#ffd23f` sobre fondo | 13.11:1 | AAA |
| Verde `#41d97e` sobre superficie | 10.32:1 | AAA |
| Rojo `#ff7a7a` sobre superficie | 7.50:1 | AA |
| Botón amarillo con tinta `#101018` | 13.11:1 | AAA |
| Semánticos `-fg` sobre su `-bg` | 6.78–10.70:1 | AA–AAA |
| **Claro**: secundario `#45455a` | 8.7:1 | AA |
| **Claro**: dbar crema sobre `#075c33` | 6.8:1 | AA |
| **Claro**: tinta `#171724` | 14.62:1 | AA |

> **Sin lila por diseño:** la paleta se limita a cinco tintas cromáticas
> (amarillo, verde, rojo, azul + neutros). Un sexto color rompería la
> regla del estilo antes que cualquier contraste.
>
> Medición final en navegador (`node check-contrast.js pixel-art`):
> **0 textos bajo AA sobre 296 nodos**, claro y oscuro. Los tres hallazgos
> del camino (chip sobre scrim, rótulo de celda oscura, secundario claro)
> se corrigieron con tintas medidas, no con excepciones.

## Accesibilidad

- `prefers-reduced-motion` apaga el parpadeo del punto de estado; la
  composición cuadrada se conserva.
- El parpadeo es solo el punto de estado (LED), nunca texto.
- El foco es un bloque de 3px con offset, sin halo: el píxel no emite luz.
- El deshabilitado usa **color medido, no opacidad** (`#8b8b9e` sobre
  `#2a2a3a`), para que el borde llegue al 3:1 de WCAG 1.4.11.
- Cada estado conserva su etiqueta y su forma: el color acompaña, no informa solo.

## Movimiento

A saltos: 120/220/320 ms con `steps(4, end)`. El `:active` hunde el botón
en vez de animar sombras, y el LED parpadea en `steps(2, end)` cada 1,1 s.

## No robar

- `clip-path` en elementos enfocables.
- Dither sobre texto o encima del contenido.
- Amarillo `#ffd23f` como texto pequeño sobre fondo claro (1.8:1).
- `steps()` en reveals largos de layout.
- Parpadeo en bucle sobre texto legible.
