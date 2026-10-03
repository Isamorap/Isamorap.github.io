# Estilo 12 · Swiss Design (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=swiss`
Familia: Sistema y razón · Modo nativo: claro · Modos: light + dark
Veredicto: **adoptable** (el primero de la familia en entrar a producción)

## Identidad en tres líneas

1. **Cero sombra.** La elevación se cuenta con el **grosor del filete**: 1px separa, 2px marca lo accionable, 4px marca el acento.
2. **Un solo color propio**: el rojo `#e1121c`. Todo lo demás es negro, blanco y sus grises.
3. **Una sola familia tipográfica** (Montserrat, la de la base) y **alineación a la izquierda**: nada de centrar, nada de interletrado amplio salvo en etiquetas.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="swiss"]` | `../tokens.css`, `../components.css`, `../gallery.js` |
| Grosor de filete, radio y sombra de los componentes | Estructura, densidad ni tamaño de ningún componente |
| Presión tipográfica (peso, interletrado, line-height) | La familia tipográfica (regla del contrato) |
| Anulación explícita de `--shadow-*` a `none` | El vocabulario de estados ni la escala tipográfica base |

## Receta de bloque (copiable)

```css
/* El filete reemplaza a la sombra: el peso dice qué tan importante es. */
border: 1px solid #d8d8d8;   /* separación */
border: 2px solid #0f0f0f;   /* elemento accionable */
border: 4px solid #0f0f0f;   /* acento / acción principal */
box-shadow: none;            /* SIEMPRE: la profundidad no se dibuja */

/* Press sin desplazamiento: el estado cambia de tinta, no de posición. */
.btn-primary         { background:#fff; color:#0f0f0f; border:4px solid #0f0f0f; }
.btn-primary:hover   { background:#0f0f0f; color:#fff; }
```

Reglas: **el acento es un recurso escaso** (un `--accent-500` por vista, misma
disciplina que Neo-Brutalism pero al revés: aquí el rojo se usa para *marcar*,
no para rellenar); el texto de acento va con `--accent-700`, nunca con
`--accent-500`; el foco es un filete de 2px con `offset: 0`, sin halo.

## Tipografía

Montserrat, la base, sin cambios de familia. El carácter sale de tres decisiones:
**peso 800**, **interletrado cerrado (`-0.03em`)** en display y **line-height 0.95**
para comprimir. Las **mayúsculas son un recurso escaso**: solo eyebrow, numerals
de menú y etiquetas del sistema, con interletrado `0.18em`. Esto es
deliberadamente lo contrario que Neo-Brutalism, que las usa en todo el sistema:
el contraste entre ambos estilos es intencionado.

## Movimiento

Casi nulo (90/120/120 ms, `cubic-bezier(.2,0,0,1)`). El hover **no desplaza**
nada: invierte la tinta. Es la diferencia entre "la interfaz reacciona" (Neo) y
"la interfaz informa" (Swiss).

## Contraste (verificado con cálculo, no estimado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Tinta `#0f0f0f` sobre papel `#ffffff` | 19.2:1 | AAA |
| Cuerpo `#1a1a1a` sobre papel | 17.4:1 | AAA |
| Secundario `#525252` sobre papel | 7.8:1 | AAA |
| Acento `#e1121c` sobre papel | 4.9:1 | AA (justo) |
| Acento-texto `#a30d15` sobre papel | 8.0:1 | AAA |
| Deshabilitado `#6e6e6e` sobre papel | 5.1:1 | AA |
| Faint `#737373` sobre papel | 4.7:1 | AA |
| info/warn/ok/bad `-fg` sobre su `-bg` | 6.2–8.0:1 | AA–AAA |
| **Dark**: tinta `#ffffff` sobre `#0f0f0f` | 19.2:1 | AAA |
| **Dark**: acento-texto `#ff8f95` sobre `#0f0f0f` | 8.8:1 | AAA |

Sin excepciones `AA*`: el modo oscuro solo **aclara el acento** (`#e1121c` sobre
negro no llegaba a AA → `#ff4a52`); el resto es inversión pura. El deshabilitado
se resolvió con **color medido, no opacidad**: el texto conserva AA y el filete
llega al 3:1 que pide WCAG 1.4.11.

> **Sobre `--line-soft` (1.43:1):** es un filete decorativo de separación entre
> tarjetas, no el límite de un control, así que no le aplica el 3:1 de WCAG
> 1.4.11 (esa exigencia es para el borde que *define* un componente
> interactivo). Todos los controles usan `--line-strong` (#0f0f0f) o el filete de
> 2px, y ambos superan el umbral. Si algún día un `--line-soft` pasa a delimitar
> un control, hay que oscurecerlo.

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Pantalla plana, sin jerarquía | Eliminar toda sombra y no usar el grosor | Volver a la escala 1/2/4px del filete |
| El rojo deja de ser acento | Colorear superficies además de marcas | Reservar `--accent-500` a UNA vista |
| Tabla ilegible | Filete en cada celda | Filete solo en contenedores, nunca en celdas |
| Foco invisible sobre un control rojo | Foco del color del fondo | El foco es tinta, no acento |

## Qué se puede reutilizar en otros proyectos (sin adoptar el estilo)

1. **Escala de filetes 1/2/4** como sistema de jerarquía: sustituye a las sombras sin perder elevación.
2. **Botón primario como filete grueso** en vez de bloque relleno: marca la acción sin gastar superficie de color.
3. **Foco de 2px con offset 0**: un anillo que calca la forma del control, en vez de un halo difuminado.
4. **Deshabilitado con color medido** en vez de `opacity`: conserva AA y sobrevive a cualquier fondo.
5. **Chip activo que se invierte a tinta**: la selección es un hecho, no un matiz de color.

## Qué NO llevar a producción

- **Cero sombra como norma absoluta**: sin relieve, dos superficies contiguas se funden.
- **Filete negro en tablas densas**: 1px por celda vuelve el dato ilegible.
- **Un solo acento para toda la app**: los cinco semáforos son información y necesitan su color.
- **Todo en mayúsculas**: es un recurso de etiquetas, no un estilo de interfaz completo.