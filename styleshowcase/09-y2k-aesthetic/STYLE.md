# 09 · Y2K Aesthetic

Cromo, burbujas y biseles brillantes de fin de milenio.

- **Familia:** retro-digital · **Modo nativo:** claro · **Modos:** light + dark
- **Veredicto:** solo-museo · **Contraste:** AA (verificado en ambos temas)
- **Fuente de verdad:** `style.css` (los tokens y los overrides viven ahí)

## La idea en una frase

La profundidad no viene de una sombra difusa sino de un **bisel de dos tonos**:
luz arriba, sombra abajo. Todo lo demás —radios casi circulares, degradado
metálico, reflejo especular, versalitas con tracking— decorate esa decisión.

## Qué define al estilo

1. **El bisel, no la mancha.** Cada control lleva `inset 0 1px 0` (luz) más
   `inset 0 -2px 0` (sombra). Sin desenfoque. Es lo que separa Y2K de
   neumorphism, que usa la misma idea pero difusa.
2. **Cromo en degradado de tres paradas** en el botón primario:
   `#2f6ad8 → #245cc0 → #1a4fa8` en claro, y **una versión más clara** en oscuro
   (`#dcecff → #bcd8fb → #8ab8ef`). Ver la trampa 2.
3. **Radios casi circulares** (10/16/24/34px) con `pill` como valor habitual.
4. **Reflejo especular en las tarjetas** (`.kitcard::before`), apagado en oscuro.
5. **Tinta azul casi negra** (`#0b1a3d`) en vez de gris: el cromo y el
   bubblegum solo funcionan con una tinta fría encima.
6. **Versalitas con tracking 0.2em** en etiquetas.

## Robar / no robar

**Robar:** el bisel de dos tonos; el degradado de tres paradas; la escala de
radios; el reflejo en superficies grandes; la tinta azul.

**No robar:**
- El bubblegum vivo (`#ff4fa3`) o la lima viva (`#7cb518`) como **texto**:
  dan 3.04:1 y 2.48:1. Son superficies. Como texto van `#c9176f` y `#4f7f00`.
- **Apagar** el cromo en oscuro. Aquí se *aclara*. Si el botón primario se
  quedara azul medio sería el único sólido oscuro del tema, y la tinta que
  necesitan todos los demás no le serviría.
- Sombra difusa grande y de bajo contraste: eso es neumorphism.
- El reflejo `::before` en controles pequeños: en un botón de 40px el brillo
  interior lo vuelve ilegible.
- El degradado en `--bg-page`: `components.css` lo usa como color plano en
  `.toast`.

## Las cuatro trampas de este skin

### 1. `--skin-on-solid` no puede ser un token único

Un sólido de tono medio no admite las dos tintas, y este skin lo repite en los
dos temas:

| Tema | Sólido | Con blanco | Con tinta |
|---|---|---|---|
| Claro | `#0d803d` | **5.03:1** | 4.17:1 |
| Oscuro | `#4ade80` | 1.74:1 | **10.67:1** |

Por eso el token se declara dos veces: blanco en claro, tinta `#06122b` en
oscuro. Es el mismo motivo por el que claymorphism separó los suyos.

### 2. El cromo se aclara en oscuro, no se apaga

`_template/specimen.css:139` aplica `--skin-on-solid` a `.btn-primary`,
`.btn-accent`, `.btn-danger` y `.avatar` **a la vez**, y con más especificidad
que `components.css`. O sea: un solo token de tinta gobierna cuatro sólidos.

En oscuro todos esos sólidos se aclaran y por eso la tinta es oscura. Si
`.btn-primary` se quedara en un azul medio, sería el único sólido oscuro del
tema y su texto quedaría a **2.31:1**. La solución no es un parche de color
sino una decisión de diseño: **el cromo del botón también se aclara**
(`#dcecff → #bcd8fb → #8ab8ef`), que además es lo que el estilo pide, porque en
oscuro sigue siendo metal. Con la tinta del tema da 9.02–15.49:1.

### 3. El color de identidad no puede ser texto

El bubblegum `#ff4fa3` es lo que hace que esto se lea como Y2K, y es
justamente el que **no** puede usarse como texto (3.04:1 sobre blanco). La
misma trampa con la lima (2.48:1). Se quedan en degradados, superficies y
filetes; el texto de acento usa la versión oscura (`#c9176f`, 5.48:1).

El botón de acento lleva su propia tinta `#1a0b2e` (6.10:1) en vez de
`--skin-on-solid`: su superficie ya es clara en ambos temas.

### 4. `.btn-cell-dark` no puede usar `--brand-ink-deep`

Parece el token obvio, pero en oscuro vale `#b9c8e4` (tinta clara): la celda
"oscura" salía clara con texto claro encima. Lleva fondo fijo `#06122b`
(`#01050f` en oscuro). Misma trampa que en maximalism.

## Contraste

Calculado **antes** de escribir el CSS, no después de romperlo. Se mide siempre
contra la superficie resuelta (blanco o azul tinta), nunca contra el degradado
del body ni contra el cromo.

| | Claro | Oscuro |
|---|---|---|
| texto fuerte | 17.08:1 | 15.93:1 |
| cuerpo | 9.18:1 | 10.42:1 |
| soft / faint | 5.22–6.48:1 | 6.43 / 4.90:1 |
| acento (texto) | 5.00:1 | 7.25:1 |
| sólidos | 5.02–5.70:1 (blanco) | 6.72–11.14:1 (tinta) |
| `line-strong` (borde) | 3.16:1 | 3.23:1 |

`--line-strong` se mide a **3:1** y no a 4.5:1 porque es el filete real del
control, no texto. `--text-faint` sí se mide a 4.5:1 porque se usa a 11px, o sea
como texto normal.

Dos valores se oscurecieron porque la primera medición no miraba la superficie
real: `--text-soft`/`--text-faint` estaban a 4.25:1 sobre `--bg-sunken` (más
oscuro que el lienzo, y con texto mono dentro), y `--line-strong` estaba a
2.56:1.

### Una nota sobre la auditoría

`check-contrast.js` marca un texto del pie (13px) en 4.18:1. **Es un artefacto
del instrumento, no un fallo del skin**: el muestreo por píxeles promedia el 15%
de los píxeles más cambiados, y en texto pequeño con antialias eso diluye el
glifo hacia el fondo. Se verificó a mano: el fondo medido es
`rgb(234,241,249)` —exactamente `--bg-page`— y el color de texto declarado da
**5.69:1**. La captura lo confirma legible.

## Modo oscuro

El mismo cromo sobre un **azul profundo** (`#060d20`) en vez de gris. Los
sólidos se aclaran y el acento pasa a `#6aa8ff`. El reflejo especular se apaga
de `#ffffffbf` a `#93b4ff26`: blanco puro sobre azul profundo cantaría
demasiado.

Radios y duraciones **no** se redeclaran: son iguales en los dos temas y se
heredan de la base a propósito.

## Verificación

- `node check-skins.js` → **verde**, sin problemas. Los 3 avisos son
  preexistentes (04-ethereal y 07-cyberpunk), no de este skin.
- `node check-contrast.js y2k-aesthetic` → **146/146 en oscuro** y 145/146 en
  claro, con el único aviso descrito más arriba (artefacto del instrumento,
  verificado a mano).
- Sin efectos compartidos `--fx-*`: el cromo va en overrides propios.
- `style.json` se genera desde `style.css`, así que ficha y CSS no pueden
  desincronizarse.

## Alcance

Los 4 bloques del espécimen. No modifica `components.css`: solo escribe dentro
de `[data-style="y2k-aesthetic"]`.
