# 06 · Cybercore

Terminal industrial: mono, rejilla y verde sobre negro.

- **Familia:** ruido-brutal · **Modo nativo:** oscuro · **Modos:** dark + light
- **Veredicto:** solo-museo · **Contraste:** AA (verificado en ambos temas)
- **Fuente de verdad:** `style.css` (los tokens y los overrides viven ahí)

## La idea en una frase

La profundidad no viene de una sombra sino de una **línea de 1px verde al
borde**: el panel se ve *encendido*, no elevado. Todo lo demás —monoespaciada
en todo el árbol, radio 0, rejilla de 16px en el fondo, sombra que es un halo
del mismo verde— decora esa decisión.

## Qué define al estilo

1. **El resplandor en vez de la sombra.** `--shadow-*` no difumina nada:
   es `0 0 0 1px` del verde de acento más un halo del mismo color. La
   profundidad sale del color.
2. **La rejilla es el suelo, no un adorno.** Vive en el `background-image` del
   body a 16px, no dentro de un componente.
3. **Monoespaciada en todo el árbol**, incluidos botones y chips, porque
   `components.css` pone la sans ahí y sin declararlo el skin solo afecta al
   texto corrido.
4. **Radio 0 en toda la escala, avatar incluido.** Un círculo en el avatar
   rompe el relato de carcasa cortada.
5. **MAYÚSCULAS con tracking** en etiquetas y botones — lo contrario de 12-swiss,
   donde son un recurso escaso.
6. **Instantáneo.** `--dur-1: 0ms`.

## Robar / no robar

**Robar:** la rejilla como fondo real; el resplandor de una sola tinta; la
monoespaciada declarada en todas partes, no solo en el body; el radio 0 con
el avatar dentro; las mayúsculas como voz; el instante como semántica.

**No robar:**
- El fósforo `#00ff9c` como texto de acento en claro: cae a **2.2:1**. Como
  texto va `#00663f` (6.25:1).
- Declarar el acento una sola vez para los dos modos. El nativo puede ser
  texto y el de claro no: mismo motivo que el bubblegum en 09.
- Medir `--line-strong` a 4.5:1 por costumbre: es filete de control, le
  corresponde **3:1** (WCAG 1.4.11).
- El borde grueso negro de 05-neo-brutalism. Aquí el borde es de 1px verde y
  lo que marca es la rejilla. Copiar el 05 sería copiar su marca, no la de este.
- La rejilla o el resplandor dentro de `--bg-page`: `components.css` lo usa
  como color plano en `.toast`.

## Las cinco trampas de este skin

### 1. `--skin-on-solid` no puede ser un token único

Al revés que en 09, aquí el nativo es el **oscuro**, y en un tema negro todos
los sólidos se aclaran. Por eso la tinta sobre sólido es oscura:

| Sólido | Con blanco | Con tinta `#04140d` |
|---|---|---|
| `#00ff9c` (fosforo) | 1.33:1 | **14.21:1** |
| `#ffb000` (aviso) | 1.83:1 | **10.32:1** |
| `#ff4d5e` (crítico) | 3.24:1 | **5.83:1** |

En claro el primario se oscurece a `#00734a`, que con blanco da 5.91:1, y la
tinta se invierte. De ahí las dos declaraciones.

### 2. El acento no puede ser un token único tampoco

El fósforo da 15.03:1 sobre el lienzo oscuro: es de los pocos acentos del
proyecto que **sí** puede ser texto en su modo nativo. En claro cae a 2.2:1.
Cada modo necesita su valor, y hay que medirlo por separado en cada uno.

### 3. `--line-strong` se mide a 3:1, no a 4.5:1

Es el filete real del control, no texto. Los verdes "bonitos" del panel
(`#2c4a3f`, 2.06:1) se quedan en `--line-soft`. El valor que sí llega es
`#3d6b58` (3.28:1) en oscuro y `#6b8878` (3.43:1) en claro.

### 4. El bloque nativo **no** lleva `[data-theme="dark"]`

En 09 el claro era el por defecto y el oscuro una capa encima. Aquí es al
revés: `[data-style="cybercore"]` **es** el oscuro, y el claro va en
`[data-theme="light"][data-style="cybercore"]`. El espécimen fuerza
`data-theme` sobre la página y el orden de cascada manda: poner el oscuro
como capa superior lo dejaba sin aplicar.

### 5. Una regla `[data-style] .dbar` pisa los estados de la barra lateral

   `components.css` reparte el color con `.dbar-ok` / `.dbar-warn` /
   `.dbar-bad` → `--ok-solid` / `--warn-solid` / `--bad-solid`, que son
   selectores de clase sola (0,1,0). Una regla `[data-style="cybercore"] .dbar`
   tiene (0,1,1) y gana siempre: con `background: #00ff9c` dejaba **las tres
   barras en fósforo**, y el bloque 04 dejaba de demostrar lo que dice
   demostrar. La barra de familia es información; por eso aquí **no se fija su
   fondo**, solo su radio. El color sale del token.

   El corolario: al dejar de pisar el estado apareció un fallo de contraste que
   el hardcodeo tapaba. `--warn-solid` en claro era `#b07d00` —un ámbar
   atractivo— y con la tinta blanca de `--skin-on-solid` daba **3.63:1** sobre
   la barra de aviso. Se oscureció a `#8a6200` (5.49:1).

## Contraste

Calculado **antes** de escribir el CSS. Se mide contra la superficie resuelta,
nunca contra la rejilla ni contra el resplandor.

| | Dark (nativo) | Light |
|---|---|---|
| texto fuerte | 17.85:1 | 16.71:1 |
| cuerpo | 12.19:1 | 11.01:1 |
| soft | 8.80:1 | 7.86:1 (`#315045`) |
| faint | 7.15:1 | 5.09:1 (4.63:1 sobre `--bg-sunken`) |
| acento | 15.03:1 | 5.23:1 |
| semánticos fg sobre su bg | 8.58–10.50:1 | 6.49–7.99:1 |
| sólidos con su tinta | 5.83–14.21:1 | 5.49–5.91:1 |
| barra de estado (`.dbar`) | 5.83–10.85:1 | 5.49–5.91:1 |
| `line-strong` (borde) | 3.28:1 | 3.43:1 |

Las dos últimas filas son la misma medición mirada de otro modo: la barra de
familia es el único componente que pinta un **sólido** con la tinta de
`--skin-on-solid`, así que los sólidos se miden contra esa tinta y no contra el
fondo del panel.

`--text-faint` se mide a 4.5:1 porque se usa a 11px. En claro quedó en
`#4b6d5e` (4.63:1 sobre `--bg-sunken`, que es más oscuro que el lienzo); los
candidatos más claros caían a 3.85:1 ahí.

## Modo claro

No es "el oscuro invertido": es **papel de terminal**. Rejilla en verde oscuro
al 4% de alfa, superficies en gris verdoso muy claro, y el acento pasa a
`#00734a`. El resplandor se apaga a un anillo de 1px, porque sobre fondo claro
un halo verde se lee como mancha.

Radios y duraciones **no** se redeclaran: valen lo mismo en los dos temas y se
heredan del bloque nativo a propósito.

## Verificación

- `node check-skins.js` → **verde**. 11 skins con ficha; los 3 avisos son
  preexistentes (04-ethereal y 07-cyberpunk), ninguno de este skin.
- `node check-contrast.js cybercore` → **146/146 en oscuro y 146/146 en claro**,
  0 textos bajo AA sobre 292 nodos.
- Capturas revisadas a mano en los dos temas (`/tmp/au/06-dark.png`,
  `/tmp/au/06-light.png`): rejilla, monoespaciada, radio 0 y resplandor se ven
  como se describe arriba.
- Sin efectos compartidos `--fx-*`.
- `style.json` se genera desde `style.css`, así que ficha y CSS no pueden
  desincronizarse.

### Cuatro fallos reales que encontró la verificación

Quedan escritos porque son la parte útil del registro:

1. **`.dbar` perdía el color por estado** (trampa 5): la barra salía siempre en
   fósforo porque un override con más especificidad pisaba a `.dbar-warn` y
   `.dbar-bad`. Al arreglarlo apareció el fallo de `--warn-solid` en claro
   (3.63:1), que el hardcodeo había tapado.
2. **`--skin-on-scrim-soft` en claro daba 1.52:1.** `.btn-cell-dark` sigue
   siendo una celda oscura en los dos modos, pero el token estaba en tinta
   oscura. Ese token solo se usa ahí (`specimen.css:150`), así que va claro.
3. **Las barras de espaciado eran invisibles en oscuro.** `.space-bar i` se
   rellena con `--brand-ink`, que aquí es la tinta casi negra sobre un panel
   casi negro. No se arregla moviendo `--brand-ink` (el mismo token pinta
   `.btn-primary` y `.avatar` con texto blanco encima), sino dándoles el acento:
   son decoración y el acento les sobra.

También se oscureció `--text-soft` en claro (`#3d5f50` → `#315045`): el pie lo
usa a 13px sobre el lienzo **con la rejilla encima**, y el muestreo por píxeles
daba 4.45:1. Analíticamente eran 6.29:1, pero la medición es la que manda.

## Alcance

Los 4 bloques del espécimen. No modifica `components.css`: solo escribe dentro
de `[data-style="cybercore"]`.

> Nota de proceso: `_build-style-json.js` genera esta ficha **leyendo
> `style.css`**, no a mano, para que tokens y ficha no puedan desincronizarse.
> Si se edita el CSS hay que reejecutarlo.