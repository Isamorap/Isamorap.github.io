# Estilo 02 · Neumorphism (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=neumorphism`
Familia: Materiales blandos · Modo nativo: claro · Modos: light + dark
Veredicto: **solo-museo** — ver la advertencia de abajo antes de usarlo

## La advertencia que hay que leer primero

El mecanismo central de este estilo —**superficie del mismo color que el
fondo**— choca de frente con la recomendación de no distinguir un control solo
por su sombra. No es un defecto de implementación: es la definición del estilo.

Por eso:

- El veredicto es `solo-museo`. No entra a producción estándar.
- La tinta baja a `#2d3748` (**9.47:1**), muy por debajo de lo que usaría
  cualquier otro estilo, solo para competir contra el plano.
- `--line-strong` sube a **3.63:1** y se aplica a todo lo accionable. En un
  estilo sin planos, ese filete no decora: **es la única frontera verificable**
  del control (WCAG 1.4.11). Es la red de seguridad, y por eso el estilo es
  `AA*` y no `AA`.

Se documenta en lugar de esconderse. Si un proyecto necesita relieve, se toman
las tres recetas de abajo; el resto no se copia.

## Identidad en tres líneas

1. **La superficie y el fondo son el mismo color.** `#e0e5ec` en claro, `#232a35` en oscuro. No hay plano que separe nada.
2. **Todo relieve es un par de sombras**: una clara arriba-izquierda, una oscura abajo-derecha. Y un tercer estado, hundido (`inset`).
3. **Radios grandes** (12/16/24/32) y un terracota `--accent-500 #a8480f` en tres lugares: la marca, el eyebrow y el primario.

## Los tres estados (la receta completa)

```css
/* raised — la base */
--shadow-1: -6px -6px 12px rgba(255,255,255,.85), 6px 6px 12px rgba(163,177,198,.6);

/* hover — un nivel más profundo */
--shadow-2: -9px -9px 18px rgba(255,255,255,.9),  9px 9px 18px rgba(163,177,198,.65);

/* pressed — el signo se invierte: la sombra entra */
--shadow-inset: inset 4px 4px 8px rgba(163,177,198,.6),
                inset -4px -4px 8px rgba(255,255,255,.85);
```

`--shadow-inset` es la **única adición al contrato de tokens** de todo el
muestrario. Se declara como variable para que el hundimiento sea un estado de
primera clase y no un valor repetido en tres selectores.

En `:active` se **anula** el `scale(0.98)` de la base: el hundimiento ya
comunica la presión, y las dos señales a la vez compiten.

## Vocabulario (regla del proyecto, no del estilo)

Ningún componente codifica un dato: los botones se llaman `Primario`,
`Acento`… y los chips `Éxito`, `Aviso`, `Crítico`. Prohibido escribir un estado
de negocio en una etiqueta. Ver el README.

## Contraste (verificado con cálculo)

| Par | Relación | Resultado |
| --- | --- | --- |
| Talla `#2d3748` sobre plano `#e0e5ec` | 9.47:1 | AAA |
| Cuerpo `#3f4a5a` sobre plano | 7.09:1 | AAA |
| Secundario `#556070` sobre plano | 5.04:1 | AA |
| **Frontera** `#6b7688` sobre plano | 3.63:1 | WCAG 1.4.11 |
| Primario: blanco sobre `#b8551a` (extremo claro) | 4.82:1 | AA |
| Primario: blanco sobre `#933f0d` (extremo oscuro) | 7.10:1 | AAA |
| Acento-texto `#8a3d0c` sobre plano | 6.02:1 | AA |
| `ok/warn/bad/info-fg` sobre su `-bg` | 6.51–7.78:1 | AA |
| Barra lateral: blanco sobre `#047857` / `#b45309` / `#dc2626` | 4.83–5.48:1 | AA |
| **Dark**: tinta `#eef1f6` sobre `#232a35` | 12.76:1 | AAA |

## El modo oscuro: el error que hay que evitar

El fallo más común de este estilo es copiar la receta de claro y cambiar solo
el color de fondo. Con negro puro **la sombra se come el componente** y los
controles desaparecen.

Acá la receta es la misma y lo que cambia es el color de las dos sombras:

```css
--shadow-1: -6px -6px 12px rgba(255,255,255,.05), 6px 6px 12px rgba(12,16,22,.6);
```

La luz sube a un gris al 5% (apenas más clara que el plano) y la sombra se tiñe
al azul de la superficie, nunca a negro. Además el primario tiene su propio
degradado, un punto más oscuro que el de claro, porque su extremo claro daba
4.18:1 con blanco.

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Los controles se pierden | Sin `--line-strong` | Subir la frontera a 3:1 |
| Desaparecen en oscuro | Sombra negra sobre fondo oscuro | Teñir la sombra a la superficie |
| El texto cuesta de leer | Tinta de la base | Bajar a `#2d3748` y medir |
| Se pierde el estado presionado | `scale` de la base compitiendo | Anular el scale, dejar solo `inset` |
| La lista larga es ilegible | Relieve como jerarquía | El relieve no codifica datos |

## Qué se puede reutilizar (sin adoptar el estilo)

1. **El estado hundido (`inset`) como cuarta señal** de interacción: comunica el contacto con la superficie y no depende del contraste.
2. **Degradado de 145° para dar volumen a un botón de color** sin abandonar la receta de dos sombras.
3. **Inhabilitado hundido** en vez de apagado: "no disponible" se lee como una posición, no como un color.
4. **Un token propio para el hundimiento** (`--shadow-inset`) en vez de repetir el valor en cada selector.

## Qué NO llevar a producción

- **Superficie del mismo color que el fondo**: es el motivo del veredicto `solo-museo`.
- **Quitar el filete porque "el relieve ya se ve"**: sin el 3:1 el control no tiene frontera verificable.
- **Relieve como jerarquía**: la profundidad no codifica datos; en tablas densas es ruido.
- **Misma receta de sombra con negro puro en oscuro**.
- **Estado seleccionado por color de fondo**: aquí el fondo *es* el del entorno, así que no puede cambiar. Se marca hundiendo.

| **Dark**: **frontera** `#6b7688` sobre `#232a35` | 3.14:1 | WCAG 1.4.11 |
| **Dark**: primario, blanco sobre `#b85a1a` (extremo claro) | 4.65:1 | AA |

> **El asterisco.** Los cinco semáforos conservan su fondo propio
> (`#d7f0e2`, `#fdeecd`, `#fbdcdc`, `#d6ecfa`) en vez de fundirse con el plano.
> Es una excepción consciente: si se funden, dejan de informar y el estilo
> pierde la única información de estado que tiene. Todo lo demás cumple AA.
