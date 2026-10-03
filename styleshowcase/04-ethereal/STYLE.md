# Estilo 04 · Ethereal (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=ethereal`
Familia: Materiales blandos · Modo nativo: claro · Modos: light + dark
Veredicto: **experimental**

## Identidad en tres líneas

1. **El fondo es nubes.** Cuatro manchas radiales muy separadas, sin bordes duros, ancladas con `background-attachment: fixed` para que el cielo se quede quieto al hacer scroll.
2. **Sombras anchas y muy bajas.** Tres capas, difuminado de 24 a 80 px, opacidad entre 0.04 y 0.16, teñidas al violeta. La profundidad se lee como luz, no como una ficha apoyada.
3. **El tiempo se estira.** 220 / 700 / **2200** ms. El reveal del scroll tarda más que en cualquier otro estilo: ese es el efecto, no un ajuste.

## La trampa que este estilo tiene (léela antes de tocar el CSS)

**El degradado NO va en `--bg-page`.**

`components.css` usa ese token como *color*:

```css
.toast { background: var(--text-strong); color: var(--bg-page); }
```

Una imagen de gradiente es un valor inválido para `color`. El texto del toast
se quedaría sin pintar, y solo fallaría ese componente, en silencio, en la
esquina inferior de la pantalla. Por eso `--bg-page` sigue siendo un sólido
(`#f7f6fb`) y las nubes van en `background-image` del body:

```css
[data-style="ethereal"] body.specimen {
  background-image:
    radial-gradient(52rem 40rem at 12% -8%, rgba(190,178,245,.42), transparent 62%),
    radial-gradient(46rem 38rem at 92%  4%, rgba(168,206,238,.38), transparent 60%),
    radial-gradient(60rem 46rem at 68% 42%, rgba(226,178,208,.30), transparent 64%),
    radial-gradient(44rem 36rem at  8% 78%, rgba(176,216,208,.32), transparent 62%);
  background-attachment: fixed, fixed, fixed, fixed;
}
```

> Regla general que sale de acá: **un token que alguna regla usa como color no
> puede llevar una imagen.** En este proyecto hay varios así, y el chequeo
> automático no los cubre: es criterio, no sintaxis.

## El acento invertido (la segunda decisión que no es opcional)

El acento de este estilo es claro por definición (periwinkle). El blanco sobre
lila no llega a AA. Las dos salidas eran romper una de las dos cosas:

| Opción | Qué se rompe |
| --- | --- |
| Oscurecer el lila hasta que el blanco pase | El acento deja de ser etéreo y se vuelve un violeta normal |
| **Invertir el par: lila claro con tinta oscura** | Nada — el lila sigue siendo lila y el texto sigue legible |

```css
.btn-accent {
  background: linear-gradient(140deg, #e2dcfa, #bdb2ee);
  color: #3d3570;          /* 5.55:1 en el extremo más oscuro del degradado */
}
```

En modo oscuro **el acento no se apaga**: sigue siendo claro. Lo que da la vuelta
es el texto, no el fondo. Un periwinkle apagado sobre azul noche se pierde.

## Vocabulario (regla del proyecto, no del estilo)

Ningún componente codifica un dato: los botones se llaman `Primario`,
`Acento`… y los chips `Éxito`, `Aviso`, `Crítico`. Prohibido escribir un estado
## Contraste (verificado con cálculo, no estimado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Tinta `#2b2a45` sobre superficie `#fdfcff` | 13.52:1 | AAA |
| Cuerpo `#4a4863` sobre superficie | 8.57:1 | AAA |
| Secundario `#6b6885` sobre superficie | 5.21:1 | AA |
| **Frontera** `#7d7a99` sobre superficie | 4.02:1 | WCAG 1.4.11 |
| Acento-texto `#5b4fb0` sobre superficie | 6.44:1 | AA |
| Botón de acento `#3d3570` sobre lila `#bdb2ee` | 5.55:1 | AA |
| Primario `#ffffff` sobre índigo `#3a3760` | 11.08:1 | AAA |
| `ok/warn/bad/info-fg` sobre su `-bg` | 6.47–7.80:1 | AA |
| Sólidos con texto blanco (`ok/warn/ember/bad/info`) | 4.83–5.93:1 | AA |
| **Dark**: tinta `#ece9f7` sobre `#1c1b2b` | 14.15:1 | AAA |
| **Dark**: **frontera** `#6b6690` sobre `#1c1b2b` | 3.17:1 | WCAG 1.4.11 |
| **Dark**: acento-texto `#c9c0f5` sobre `#1c1b2b` | 9.94:1 | AAA |

Sin excepciones: **AA** limpio.

> **El texto nunca se mide contra el cielo.** Las tarjetas van en
> `rgba(253,252,255,.82)` para que el cielo se intuye detrás, pero todos los
> ratios de la tabla están calculados contra el blanco `#fdfcff`, no contra el
> degradado. Si alguna vez se baja ese alpha de 0.82, el contraste deja de
> estar garantizado y hay que volver a medirlo entero.

## Efectos compartidos

Enciende **`--fx-glow-soft`** (`0 0 40px rgba(168,152,235,.28)`): un halo difuso
alrededor de las superficies grandes, sin fronteras duras ni resplandor de neón.
Es exactamente el efecto que esta capa ofrece y el único que encaja con "nube".

En modo oscuro **baja a α 0.16**: con el valor de día, sobre una superficie
oscura, se come el filete de los controles.

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| El texto del toast no aparece | Gradiente metido en `--bg-page` | El cielo va en `background-image` del body |
| El texto "flota" sobre el cielo | Tarjetas con alpha muy bajo | Subir a 0.9; medir contra el blanco, no contra el degradado |
| El botón de acento no se lee | Blanco sobre lila | Invertir el par, no oscurecer el lila |
| Los controles pierden el borde | Sombras demasiado bajas | `--line-strong` a 3:1 y aplicarlo a todo lo accionable |
| El halo desaparece en oscuro | Mismo α que de día | Bajar el α en el modo oscuro |
| La página da ScrollBar lateral | `background-attachment: fixed` + scrollbar | `background-clip: padding-box` o aceptar el espacio |
| Cuesta leer una tabla | Aire de portada | Este estilo es de presentación, no de densidad |

## Qué se puede reutilizar (sin adoptar el estilo)

1. **Manchas radiales muy separadas y muy tenues, con `fixed`**: el cielo quieto hace que solo se mueva el contenido, y eso es lo que se percibe como liviandad.
2. **Sombra de tres capas con difuminado enorme y opacidad mínima**, teñida al color de la marca: profundidad que se lee como luz.
3. **Estirar los tres tiempos a la vez**, no uno: el reveal lento es la diferencia perceptible.
4. **Abrir el interlineado para conseguir aire** sin tocar la escala de espaciado (que el contrato deja intacta).
5. **Acento claro con texto oscuro encima**, para no tener que oscurecer un color que existe por ser suave.
de negocio en una etiqueta. Ver el README.