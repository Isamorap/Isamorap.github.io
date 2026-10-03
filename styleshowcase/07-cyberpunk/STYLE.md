# Estilo 07 · Cyberpunk (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=cyberpunk`
Familia: Ruido y brutal · Modo nativo: **oscuro** · Modos: dark + light
Veredicto: **solo-museo**

## Identidad en tres líneas

1. **El halo es la profundidad.** No hay elevación neutra: la sombra difusa se
   tiñe del acento, así que un control parece emitir luz en vez de flotar.
2. **Magenta y cian, y solo esos dos.** Son la firma. Un tercer color de neón
   compite y destruye la lectura.
3. **Textura en la superficie, nunca en el texto.** Scanlines y retícula viven
   en el fondo de los paneles; el contenido va siempre por encima.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="cyberpunk"]` | `../tokens.css` y `../components.css` |
| Valores `--fx-*` (efectos compartidos) | La estructura o el orden de ningún componente |
| Puente `--skin-*` | La familia tipográfica (regla del contrato) |

## Efectos compartidos (lo nuevo de este skin)

Este es el **primer estilo que enciende la capa de efectos**. Las bases viven en
`../_template/specimen.css`, sección *EFECTOS COMPARTIDOS*, y son **inertes por
defecto**: cada una vale `none` hasta que un skin escribe un valor. Por eso
añadirlas no cambió ni un píxel de Swiss, Neo-Brutalism ni Glassmorphism.

| Token | Qué hace | Cyberpunk |
| --- | --- | --- |
| `--fx-scanline` | Trama de líneas sobre superficies | Líneas de 2px cada 3px, negro al 36% |
| `--fx-grid` | Retícula de fondo de sección | 32px en dos ejes, cian al 6% |
| `--fx-glow` | Halo en botones | Doble halo cian, 8px y 20px |
| `--fx-glow-soft` | Halo difuso en superficies | 40px al 12% |
| `--fx-cut` | Esquinas recortadas | 12px, asimétrico (HUD) |
| `--fx-glitch-content` | Duplica el texto en pseudoelemento | `attr(data-text)` |

El glitch **no duplica el nodo de texto**: lo copia a un pseudoelemento con
`attr(data-text)`, que inyecta `specimen.js`. El texto real no se mueve, así que
el lector de pantalla y la selección de texto siguen intactos.

## El modo claro no es una inversión

Es la decisión que define a este estilo, y la razón de su veredicto.

Un halo luminoso sobre fondo claro es **ilegible por definición**: no hay forma de
proyectar luz sobre algo que ya emite más luz que el halo. Así que en claro el
estilo **apaga** el neón en vez de invertirlo:

```css
[data-theme="light"][data-style="cyberpunk"] {
  --fx-glow: none;        /* no hay glow en claro */
  --fx-scanline: none;    /* ni scanlines */
  --fx-cut: none;         /* ni esquinas cortadas */
  --fx-glitch-content: none;
  --fx-grid: linear-gradient(#00637a12 1px, #0000 1px), ...; /* retícula sí, más discreta */
}
```

Y el acento se **oscurece** para conservar el carácter sin perder AA: el magenta
`#ff2e97` pasa a `#a80050` (6.67:1) y el cian `#00e5ff` a `#00637a` (6.05:1).

## Contraste (verificado con cálculo, no estimado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Cian `#00e5ff` sobre fondo `#05060a` | 13.17:1 | AAA |
| Magenta `#ff2e97` sobre fondo | 5.87:1 | AA |
| Lila `#c451ff` sobre fondo | 5.76:1 | AA |
| Faint `#7b8aa3` sobre fondo | 5.79:1 | AA |
| Cuerpo `#c3cfe0` sobre fondo | 12.85:1 | AAA |
| Semánticos `-fg` sobre su `-bg` | 6.18–12.12:1 | AA–AAA |
| **Claro**: magenta `#a80050` | 6.67:1 | AA |
| **Claro**: cian `#00637a` | 6.05:1 | AA |

> **El lila se aclara, no se oscurece:** el lila neón habitual (`#b026ff`) da
> **4.40:1** sobre el fondo y queda por debajo de AA. Subido a `#c451ff` llega a
> 5.76:1 conservando el carácter. Es la razón de que el veredicto sea `AA` y no
> `AA*`: no hay excepciones, hay un valor corregido.

## Accesibilidad

- `prefers-reduced-motion` desactiva la animación del glitch; la composición
  estática cian/magenta se conserva.
- El glitch es puramente decorativo y no mueve el texto real.
- `clip-path` solo se aplica a superficies, nunca a controles: el recorte se
  comería el anillo de foco.
- El deshabilitado usa **color medido, no opacidad**, para que el borde llegue al
  3:1 de WCAG 1.4.11.
- Cada estado conserva su etiqueta y su forma: el color acompaña, no informa solo.

## Movimiento

Seco y sin rebote: 90/180/300 ms con `cubic-bezier(.16,1,.3,1)`. El glitch corre en
`steps(1, end)` cada 3,6 s y **el 92% del tiempo no se mueve**: un bucle cerrado
sobre un encabezado que hay leer es ruido, no carácter.

## No robar

- Scanlines sobre texto: la trama nunca pasa por encima del contenido.
- Más de dos neones compitiendo en la misma vista.
- `clip-path` en elementos enfocables.
- Neón como único indicador de estado.
