# Estilo 08 · Maximalism (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=maximalism`
Familia: Ruido y brutal · Modo nativo: claro · Modos: light + dark
Veredicto: **experimental**

## Identidad en tres líneas

1. **Tres tipografías, tres trabajos, un bloque cada una.** Serif (Georgia) en
   titulares, sans (Montserrat) en el cuerpo, mono (`--font-mono`) en todo lo
   etiquetado o fechado. Nunca se mezclan dentro del mismo párrafo: ahí es donde
   "varias tipografías" pasa de recurso a ruido ilegible.
2. **La sombra es una lámina, no un difuminado.** Dos capas desplazadas con
   `blur: 0` — magenta debajo, ciruela encima. En neo-brutalism la sombra dura es
   una sola capa negra; aquí son dos colores distintos, una por capa.
3. **Color pleno, nunca pastel.** Magenta `#d6006e` sobre papel crema `#fff6e9`,
   con trama de puntos y dos manchas radiales muy tenues detrás.

## La trampa que este estilo tiene (léela antes de tocar el CSS)

**Los sólidos no admiten la misma tinta en los dos temas.**

En claro, magenta `#d6006e` con tinta oscura da **3.60:1** y con blanco
**5.05:1**: la tinta está descartada. En oscuro los sólidos se aclaran hasta
`--ok-solid: #2f9e4f`, y ese verde da **3.43:1 con blanco** pero **5.40:1 con
tinta**: pasa a ser la contraria. Un único `--skin-on-solid` no puede servir
para los dos temas, así que:

```css
[data-style="maximalism"]           { --skin-on-solid: #ffffff; }  /* claro  */
[data-theme="dark"][data-style=…]   { --skin-on-solid: #1a1114; }  /* oscuro */
```

**Y el botón de acento también cambia de tinta.** El error de diseño aquí es
suponer que el magenta "se queda profundo en los dos temas". No: `.btn-accent`
pinta con `--accent-500`, y ese token **se aclara a `#ff4d9e`** en oscuro, donde
el blanco cae a **3.08:1**. Necesita tinta oscura (**6.00:1**). Por eso va en su
propio token:

```css
[data-style="maximalism"]         { --skin-on-solid: #ffffff; --skin-on-accent: #ffffff; }
[data-theme="dark"][data-style=…] { --skin-on-solid: #1a1114; --skin-on-accent: #1a1114; }
.btn-accent { color: var(--skin-on-accent, #fff); }
```

Mismo motivo que llevó a separar tokens en claymorphism: un sólido de tono
medio no sirve para las dos tintas.

## La tercera trampa: `.btn-cell-dark` no puede usar `--brand-ink-deep`

Parece el token obvio para una celda oscura, pero en oscuro vale `#ffc4e0`
(rosa pálido, porque ahí es tinta de acento). La celda "oscura" salía **rosa
claro con texto claro encima: 1.48:1**. Lleva un valor fijo:

```css
.btn-cell-dark { background: #24081f; border-color: #24081f; }  /* 16.63:1 */
```

Un componente que se llama "dark" no puede tomar su fondo de un token que
cambia de significado entre modos.

## La cuarta trampa: `--text-faint` NO es texto decorativo

Se usa a **11px**, o sea como texto normal, así que se mide a **4.5:1** y no a
3:1. El valor inicial `#8a6a6d` daba **4.49:1** — casi AA, del lado equivocado.
Bajó a `#846266` (**5.00:1**).

También `--line-strong` es el filete real del control (3:1), no decoración:
`#a87f4e` da 3.37:1 en claro y `#8a6a58` da 3.77:1 en oscuro.

## Tercera: el degradado va fuera de `--bg-page`

`components.css` usa ese token como *color* (`.toast { color: var(--bg-page) }`).
`--bg-page` se queda sólido (`#fff6e9`) y la trama va en `background-image`.

## Lo que cambia en oscuro

| | claro | oscuro |
|---|---|---|
| Lienzo | papel crema `#fff6e9` | ciruela `#1c1016` |
| Acento como texto | `#d6006e` (4.80:1) | `#ff4d9e` (6.00:1) |
| Botón de acento | `#d6006e` + blanco | `#ff4d9e` + tinta |
| Tinta sobre sólidos | blanco | oscura (`--skin-on-solid` y `--skin-on-accent`) |
| Sombra | `#d6006e` + `#24081f` | `#7a1f5c` + `#000000` |

Las sombras **invierten su lógica**: en oscuro la lámina de detrás tiene que ser
más clara que el fondo o desaparece, así que el magenta de sombra se apaga.

El oscuro NO es un gris oscuro genérico: es ciruela, y por eso el skin conserva
el carácter de papel impreso en lugar de volverse un tema convencional.

## Archivos

- `style.css` — tokens de claro, puente `--skin-*`, overrides de componente,
  bloque de oscuro. Nunca edita `../components.css`.
- `style.json` — ficha; sus 48 tokens están verificados contra `style.css`.
- Verificación: `node ../check-contrast.js` (texto bajo AA sobre los colores
  resueltos) y `node ../check-skins.js` (integridad del registro).
