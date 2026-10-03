# Style Showcase

22 lenguajes visuales sobre **la misma plantilla agnóstica de componentes**,
más una **línea de base de producto** (estilo 23) para tener una referencia sobria
y medida al lado de las corrientes artísticas.
No hay build, no hay dependencias y funciona 100% estático.

Abrir `index.html` con doble clic (funciona en `file://`).

## Qué hay

| Archivo | Rol |
| --- | --- |
| `index.html` | Galería: una ficha por estilo, con preview vivo de componentes reales |
| `registry.js` | Registro de los 23 estilos (fuente para la UI) |
| `index.json` | Espejo máquina del registro (para agentes IA) |
| `gallery.css` / `gallery.js` | Chrome de la galería: no es un estilo, es el índice |
| `_template/specimen.html` | **La plantilla**: los 4 bloques que se visten con cada estilo, con el selector de estilo en el pie |
| `_template/specimen.css` | Estructura del espécimen + puente a tokens y variables temáticas |
| `check-skins.js` | Guardián del contrato: aislamiento, tokens, registro ↔ espejo. Corre con `node check-skins.js` |
| `check-contrast.js` | Contraste real de cada texto contra WCAG AA, medido en el navegador. Opcional: `node check-contrast.js [skin]` |
| `_template/specimen.js` | Carga todos los skins, conmute con `?style=` sin recargar, y pinta paleta, tema, chips y lectura de tokens |
| `<num>-<id>/style.css` | El skin: tokens + overrides, todo dentro de `[data-style="<id>"]` |
| `<num>-<id>/style.json` | Ficha máquina del estilo (tokens, a11y, veredicto, puente) |
| `<num>-<id>/STYLE.md` | Indicaciones para agentes IA y humanos (identidad visual, contrastes, qué robar) |
| `assets/cover.svg` | Portada abstracta del hero del espécimen. Es el único binario del proyecto: SVG en texto plano, sin foto ni marca ajena |

## Cómo funciona el interruptor

1. El espécimen lee `?style=<id>` (por defecto, `glassmorphism`).
2. Inyecta **una hoja por cada skin construido**, no solo el pedido.
3. Pone `data-style="<id>"` y `data-theme="<modo nativo>"` en `<html>`.

**Todos los skins están en la página a la vez.** El aislamiento lo da el
atributo `data-style` de `<html>`: cada skin escribe únicamente dentro de
`[data-style="<id>"]`, así que los otros no aplican nada. Ese atributo es la
única razón por la que conviven sin pisarse, y por eso está prohibido
desacotarlo.

Son ~96 KB de CSS en total. A cambio, cambiar de estilo es mover un atributo:
instantáneo, y sin perder el scroll, el menú abierto ni los chips pulsados.

El skin gana la cascada porque `[data-style="<id>"]` empata en especificidad con
`:root` de `tokens.css` y las hojas de skin van después en el orden. Los modos se
resuelven con `[data-theme="light"][data-style="<id>"]` (más específico).

Como un skin define variables, **también funciona en un `<div>`**: por eso los
previews de la galería son componentes reales sin iframes. La galería carga los
mismos skins de golpe, cada ficha en su propio `div` con su `data-style`.

## Cambiar de estilo sin volver a la galería

El pie del espécimen tiene el selector: los 23 estilos agrupados por familia (los
que todavía no tienen skin van deshabilitados), botones `‹ ›` para saltar entre
los construidos y un botón para copiar el enlace.

Es **chrome del museo**, igual que la cinta de arriba: colores, radios y tiempos
fijos, para que elegir un estilo no dependa del estilo que estás eligiendo (los
skins reescriben `--radius-*`, `--dur-*` y los colores; por eso no se usan acá).

Al elegir **no se recarga la página**: se mueve `data-style` y el skin
correspondiente empieza a mandar. La URL se actualiza igual con
`replaceState`, así que el enlace sigue siendo compartible (`?style=<id>&theme=…`).
Si se pide por URL un estilo sin skin, cae a `glassmorphism` y avisa en pantalla.

Al cambiar de estilo, el tema **no se arrastra a ciegas**: si el estilo destino
no declara el modo que estaba activo, cae a su modo nativo. El toggle de tema se
habilita o deshabilita según los modos que declare cada estilo.

> Antes esto recargaba. Recargar era la única opción cuando solo había una hoja
> en la página; con todas cargadas, sería tirar el estado del lector a la basura
> para no ganar nada.

## `check-skins.js`: el guardián del contrato

```bash
node check-skins.js     # sale con código 1 si algo está mal
```

No hay build, así que las invariantes se comprueban con un script suelto. Es
`node`, nada más.

Comprueba, sobre cada skin construido:

1. **Todo selector lleva su `[data-style="<id>"]`**. Un selector suelto se
   filtraría a los otros estilos *en silencio*: la página no da error, solo otro
   estilo se ve mal.
2. **Las llaves están balanceadas**. Contarlas no alcanza para validar CSS —una
   regla sin cerrar se traga todo lo que sigue y el navegador lo descarta sin
   decir nada— pero sí atrapa el caso obvio.
3. **No hay `!important`** (aviso, no error: no rompe el aislamiento, pero
   suele significar que no se encontró la forma de ganar la cascada).
4. **Los 14 tokens `--skin-*` están**. El resto puede heredarse de la base a
   propósito (07-cyberpunk no toca `--ember-*`).
5. **La ficha no contradice al registro**: el veredicto y el contraste salen del
   registro, así que si divergen del `style.json`, el museo está mintiendo.
6. **Registro ↔ `index.json`**: mismas filas, mismos campos, mismas paletas. La
   galería lee `registry.js` y un agente lee `index.json`; si divergen, uno ve un
   color y el otro copia otro.
7. **Ninguna etiqueta de componente lleva vocabulario de datos** (el aviso
   completo vive en `index.json` y en el README).

## `check-contrast.js`: el contraste, medido de verdad

```bash
node check-contrast.js                # los 8 skins, claro y oscuro
node check-contrast.js neo-brutalism  # uno solo
```

Va aparte porque `check-skins.js` **no puede** validar el contraste: WCAG lo
define sobre los colores *resueltos*, y un skin puede declarar bien sus 14
tokens y aun así romperlo en una regla suelta. El caso real fue
`.btn-cell { background: #fff }` sin equivalente en oscuro: el botón fantasma
del skin neo-brutalism quedaba a **1.09:1**, ilegible, y ningún chequeo de
texto lo detectaba.

Recorre cada nodo de texto del espécimen, compone el fondo hacia arriba con las
alfa reales y compara contra el mínimo que toca (4.5:1, o 3.0:1 en texto
grande). Si el elemento tiene degradado, su `background-color` es transparente
y el color compuesto no describe nada: ahí se mide la captura, tomando la tinta
como la *diferencia* entre la captura con texto y la misma captura con el texto
transparentado.

Exime los controles deshabilitados (WCAG 1.4.3 los exonera) y avisa —con salida
0— si no encuentra navegador: es una comprobación opcional y no debe romper un
entorno sin él.

Estado actual: **103 textos bajo AA sobre 2336 nodos**, todos en la banda
3.3–4.5:1 y ninguno por debajo de 3:1. Los siete skins siguientes pasan limpios
en al menos un tema:

| skin | light | dark |
| --- | --- | --- |
| claymorphism · neumorphism · swiss · corporativo | ✓ | ✓ |
| neo-brutalism · cyberpunk | ✓ | ✗ 2 textos a 3.93:1 |
| glassmorphism | ✗ | ✗ |
| ethereal | ✗ 31 textos a 3.7:1+ | ✓ |


## Reglas del contrato (lo que un skin puede y no puede)

| Puede | No puede |
| --- | --- |
| Redefinir tokens dentro de `[data-style="<id>"]` | Tocar `tokens.css` o `components.css` base |
| Escribir overrides scoped a `[data-style="<id>"] …` | Selectores globales sueltos (se filtrarían a la galería) |
| Usar la escala tipográfica y los espaciados base | Inventar valores de espaciado caóticos |
| Definir `--skin-*` para propiedades visuales extendidas | Requerir red, build o dependencias de empaquetado |
| Encender los efectos compartidos `--fx-*` (halo, scanlines, retícula, esquinas, glitch) | Escribir selectores globales o alterar `components.css` |

### Efectos compartidos (`--fx-*`)

Además del color, un skin puede encender **efectos** mediante los tokens `--fx-*`,
definidos en `_template/specimen.css` (sección *EFECTOS COMPARTIDOS*): `--fx-scanline`,
`--fx-grid`, `--fx-glow`, `--fx-glow-soft`, `--fx-cut` y `--fx-glitch-content`.

Son **inertes por defecto**: todas valen `none` hasta que un skin escribe un
valor, así que añadir la capa no cambió ni un píxel de los estilos existentes.
`07-cyberpunk` es el primero en usarlas. Al añadir un efecto nuevo, decláralo
como `none` en el `var()` para que siga siendo inocuo por defecto.

### Tokens de color de la base

Los nombres son neutros a propósito: el proyecto no hereda la paleta de ninguna marca,
así que un skin puede reescribirlos sin arrastrar vocabulario ajeno.

| Familia | Tokens | Rol |
| --- | --- | --- |
| Tinta | `--brand-ink`, `--brand-ink-deep`, `--brand-paper` | Marca y planos de fondo pesados |
| Acento | `--accent-100/500/700` | El único color cálido (botón de acento, eyebrow) |
| Soporte | `--support-100/500/700` | Verde de superficies e ilustración |
| Frío | `--cool-100/500/700` | Color de información |
| Semánticos | `--ok-*`, `--warn-*`, `--ember-*`, `--bad-*`, `--info-*` | Familias universales: éxito / aviso / crítico / información / neutro |

## Vocabulario: ningún componente codifica un dato

Regla del laboratorio, no de un estilo: **la etiqueta la elige el proyecto, el
color lo pone el token.**

En el espécimen los botones se llaman `Primario`, `Acento`, `Secundario`,
`Fantasma`, `Destructivo` — el nombre de su **variante de diseño** — y los
chips, pills y barras laterales usan el nombre de su **familia de token**
(`Éxito`, `Aviso`, `Crítico`, `Neutro`).

Está prohibido escribir un estado de negocio (*abierto, cerrado, pendiente,
programado*) en la etiqueta de un botón, pill, chip o barra lateral. Esa palabra
se cuela en el proyecto copiando el espécimen y después termina funcionando como
si fuera el modelo de datos: la UI hereda un dominio que no le corresponde. Si
un proyecto necesita esas palabras, las pone en su capa de contenido, encima de
estos componentes, nunca dentro del diseño.

## Añadir un estilo (7 pasos)

1. Elegir la fila del registro en `registry.js` e implementar `style.css` en `<num>-<id>/`.
2. Crear `<num>-<id>/style.json` (tokens, `a11y`, `veredicto`, `puente`, `palette`).
3. Crear `<num>-<id>/STYLE.md` (identidad, receta copiable, contraste, qué rompe, qué robar).
4. Copiar la `palette` al registro: `registry.js` (`STYLE_PALETAS`) **y** `index.json`.
5. Cargar la lista `modos` en la fila del registro: `[]` = pendiente, `["light","dark"]` = listo.
6. Abrir `_template/specimen.html?style=<id>` en claro y en oscuro, a 1280 y a 390.
7. Verificar contraste y accesibilidad.

## Estado

| Listos | Pendientes |
| --- | --- |
| `01-claymorphism` (claro nativo, AA*) · `02-neumorphism` (claro nativo, AA*) · `03-glassmorphism` (oscuro nativo, AA) · `04-ethereal` (claro nativo, AA) · `05-neo-brutalism` (claro nativo, AA) · `07-cyberpunk` (oscuro nativo, AA) · `12-swiss` (claro nativo, AA) · `23-corporativo` (claro nativo, AA) | 15 estilos declarados en `index.json`, sin skin todavía |

## Estilos con skin

| # | Estilo | Familia | Qué aporta |
| --- | --- | --- | --- |
| 01 | Claymorphism | Materiales blandos | Radios enormes, luz interior, cero línea dura |
| 02 | Neumorphism | Materiales blandos | Relieve de dos sombras sobre un mismo plano |
| 03 | Glassmorphism | Materiales blandos | Superficies translúcidas y filo de luz |
| 04 | Ethereal | Materiales blandos | Cielo de nubes, sombras anchas, tiempo estirado |
| 05 | Neo-Brutalism | Ruido y brutal | Filete negro grueso, radio 0, sombra desplazada |
| 07 | Cyberpunk | Ruido y brutal | Neón, scanlines, densidad de HUD |
| 12 | Swiss | Sistema y razón | Rejilla, filete como jerarquía, cero sombra |
| 23 | Corporativo | Sistema y razón | Línea de base de producto: sombra teñida, borde a 3:1, un acento |
