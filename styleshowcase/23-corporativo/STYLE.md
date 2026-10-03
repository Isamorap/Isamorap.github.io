# Estilo 23 · Corporativo (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=corporativo`
Familia: Sistema y razón · Modo nativo: claro · Modos: light + dark
Veredicto: **adoptable** (la línea de base de producto de la familia)

> **Origen.** Este skin adapta un sistema de tokens de producción ya existente
> que era, en esencia, la base del laboratorio. Se trae como muestra para
> documentar qué hace un sistema *sobrio* bien medido. No conserva nombres de
> marca: la tinta es un azul marino genérico y el acento es cobre.

## Identidad en tres líneas

1. **La profundidad la cuenta una sombra teñida al azul marino, en dos capas, nunca negro puro.** La sombra deja de ser una mancha gris y pasa a pertenecer a la familia de la tinta.
2. **El borde que delimita un control se ve de verdad**: `--line-strong` a 3.99:1 sobre papel, para cumplir WCAG 1.4.11. `--line-soft` queda solo para separar.
3. **Un único acento cálido, el cobre, y es escaso**: eyebrow, botón de acento, numerales del menú y anillo de foco. En ningún otro lugar.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="corporativo"]` | `../tokens.css`, `../components.css`, `../gallery.js` |
| Las sombras (teñirlas, escalarlas) | La estructura ni la densidad de ningún componente |
| El grosor visual del filete de control | La escala tipográfica base |
| El estado `:disabled` con color medido | La familia tipográfica (regla del contrato) |
| Los valores de `--skin-*` del puente | La etiqueta de los componentes (ver *Vocabulario*) |

## Receta de bloque (copiable)

```css
/* Sombra de dos capas teñida a la tinta: nunca rgba(0,0,0,.2). */
--shadow-1: 0 1px 2px rgba(6,40,58,.05), 0 4px 14px rgba(6,40,58,.07);
--shadow-2: 0 2px 4px rgba(6,40,58,.06), 0 14px 34px rgba(6,40,58,.13);

/* El hover sube un nivel de sombra; no cambia el color del botón. */
.btn-primary:hover { box-shadow: var(--shadow-2); }

/* Inhabilitado con color medido, no con opacidad. */
.btn:disabled { background: var(--bg-sunken); color: var(--text-soft);
                border-color: var(--line-strong); opacity: 1; }

/* El foco es el acento: es la señal más cara de la pantalla. */
:focus-visible { outline: 2px solid var(--accent-500); outline-offset: 2px; }
```

## Vocabulario (regla del proyecto, no del estilo)

**Ningún componente codifica un dato.** Las familias semánticas se nombran por
su token —éxito, aviso, crítico, información, neutro— y **la etiqueta la elige
el proyecto que adopta el skin**. En el espécimen los botones dicen `Primario`,
`Acento`, `Secundario`… y los chips dicen `Éxito`, `Aviso`, `Crítico`.

Prohibido escribir un estado de negocio (*abierto, cerrado, pendiente,
programado*) en la etiqueta de un botón, pill, chip o barra lateral. Esa
palabra se cuela en el proyecto y después funciona como si fuera el modelo de
datos. El color es del diseño; la palabra es del producto.

## Contraste (verificado con cálculo, no estimado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Tinta `#0f2432` sobre papel `#ffffff` | 15.92:1 | AAA |
| Cuerpo `#3a4c5b` sobre papel | 8.88:1 | AAA |
| Secundario `#64748b` sobre papel | 4.76:1 | AA |
| Faint `#7d93a7` sobre papel | 3.18:1 | decorativo |
| Acento `#c96f2e` sobre papel | 3.62:1 | **no usar como texto** |
| Acento-texto `#96521f` sobre papel | 5.96:1 | AA |
| Primario: blanco sobre marino `#00334e` | 13.26:1 | AAA |
| Botón de acento: blanco sobre `#96521f` | 5.96:1 | AA |
| Destructivo: blanco sobre `#dc2626` | 4.83:1 | AA |
| Barra lateral éxito: blanco sobre `#047857` | 5.48:1 | AA |
| Barra lateral aviso: blanco sobre `#b45309` | 5.02:1 | AA |
| Barra lateral crítica: blanco sobre `#dc2626` | 4.83:1 | AA |
| `ok/warn/bad-fg` sobre su `-bg` | 6.37–6.80:1 | AA |
| **Dark**: tinta `#eef3f7` sobre `#0d1620` | 16.31:1 | AAA |
| **Dark**: primario invertido `#06283a` sobre `#f6f8fa` | 14.37:1 | AAA |
| **Dark**: acento `#b45309` con blanco | 5.02:1 | AA |

Sin excepciones `AA*`. Las dos decisiones que sostienen el AA:
- **Los sólidos semánticos están elegidos por su contraste con texto blanco**, no por saturación. Los de la base (`#10b981`, `#f59e0b`, `#ef4444`) dejaban el texto de la barra lateral en 2.5–3.8:1. Acá el peor caso es 4.83:1.
- **El cobre de superficie se *oscurece* en oscuro** (`#c96f2e` → `#b45309`) porque el botón de acento lleva texto blanco. El color de *texto* de acento se aclara por separado (`#d97a3c`, 5.90:1): son dos decisiones distintas sobre el mismo acento.

> **Sobre `--line-soft` (1.43:1):** es un separador decorativo entre tarjetas, no el límite de un control, así que no le aplica el 3:1 de WCAG 1.4.11. Todo control usa `--line-strong` (3.99:1 en claro, 3.71:1 en oscuro).

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Todo se ve sucio | Sombras negras puras | Teñirlas al color de la tinta |
| Los controles se pierden | `--line-strong` muy pálido | Subirlo a 3:1 mínimo |
| El texto de la barra lateral no se lee | Sólido elegido por saturación | Recalibrar el sólido contra blanco |
| Demasiado color en pantalla | Acento usado como decorado | Dejarlo en eyebrow + acento + foco + menú |
| El primario desaparece en oscuro | Relleno marino sobre fondo marino | Invertir el primario a papel |


## Qué se puede reutilizar en otros proyectos (sin adoptar el estilo)

1. **Sombra teñida a la tinta en dos capas**: el mismo difuminado de la base, pero teñido al azul marino en vez de a un gris neutro. Elimina el tinte sucio de las sombras sin cambiar la escala.
2. **Elegir los sólidos semánticos por contraste con blanco**, no por saturación. Es un cambio de una línea que arregla el texto de cualquier barra, cinta o chip sólido.
3. **`--line-strong` a 3:1 real** para el filete que define un control, y `--line-soft` reservado a separadores. Documentar en el token cuál es cuál.
4. **Inhabilitado con color medido** en vez de `opacity: .45`.
5. **Regla de acento escaso escrita como lista de cuatro lugares**, no como intención.

## Qué NO llevar a producción

- **El primario invertido en oscuro como norma**: funciona porque hay un solo primario por vista; con tres acciones principales invierte la jerarquía.
- **Borde fuerte en tablas densas**: 1px por celda vuelve el dato ilegible.
- **Los sólidos semánticos como color de texto**: están calibrados para admitir blanco encima.
- **"Sobrio" leído como "sin color"**: el gris frío y el cobre *son* la identidad; sin ellos esto es la base pelada.
