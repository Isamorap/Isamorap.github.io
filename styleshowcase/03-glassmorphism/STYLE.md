# Estilo 03 · Glassmorphism (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=glassmorphism`
Familia: Materiales blandos · Modo nativo: oscuro · Modos: dark + light
Veredicto: **experimental** (no entra a producción sin adaptar contraste)

## Identidad en tres líneas

1. La superficie es vidrio: color del fondo + 6–12% de blanco + blur de 18px.
2. La jerarquía la da el **filo de luz** arriba (inset 0 1px 0 blanco), no la línea.
3. Un solo acento frío (cielo) con gradiente a violeta; en oscuro el acento **se aclara**.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="glassmorphism"]` | `../tokens.css`, `../components.css`, `../gallery.js` |
| Superficies (navpill, panes, cards, swatches, botones) | Estructura, densidad ni tamaño de ningún componente |
| Tipografía: solo tracking del display | La familia Montserrat ni la escala base |
| Los cinco semáforos, en versión translúcida | El vocabulario de estados (éxito/aviso/crítico) |

## Receta de superficie (copiable)

```css
/* Vidrio base: halo + filo + sombra difusa */
background: rgba(255, 255, 255, 0.08);
border: 1px solid rgba(255, 255, 255, 0.16);   /* solo como filo, nunca como caja */
backdrop-filter: blur(18px) saturate(150%);
box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14) inset, 0 10px 30px rgba(3, 7, 18, 0.45);
```

Reglas: nunca más de **dos niveles** de vidrio anidados; el texto siempre con un
halo o scrim debajo; el blur **no** se usa en tablas densas.

## Tipografía

Montserrat, la base. Único cambio: `letter-spacing: -0.03em` y
`text-shadow` frío en el display. El estilo vive en la superficie, no en la letra.

## Movimiento

Lento a propósito (200/320/750 ms): el vidrio no debe vibrar. Hover = elevar 3px
+ sombra más profunda; nada de brillos animados.

## Contraste (verificado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Texto principal `#f2f7ff` sobre vidrio sobre halo cielo | 12.4:1 | AAA |
| Texto secundario `#9db2cd` sobre el peor halo | 6.1:1 | AA |
| Pill de éxito `#6ee7b7` sobre tinte `#10b9812e` | 7.2:1 | AA |
| Acento claro `#7dd3fc` sobre `#0b1220` | 9.8:1 | AAA |

Excepciones: el acento **claro** (`#7dd3fc`) no alcanza AA sobre blanco; en modo
claro se sustituye por `#0284c7`. Es la razón del bloque
`[data-theme="light"][data-style="glassmorphism"]`.

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Texto ilegible sobre foto | Vidrio sobre imagen sin scrim | Usar `--skin-scrim` + blur |
| Todo se ve igual | Vidrio anidado en 2+ niveles | Aplanar: el nivel externo pasa a sólido |
| Bordes invisibles en pantalla barata | Solo color de borde, sin filo interior | Añadir el `inset 0 1px 0` del filo |
| El usuario pidió menos transparencia | — | Ya cubierto: `prefers-reduced-transparency` |

## Qué se puede reutilizar en otros proyectos (sin adoptar el estilo)

1. El **filo de luz** superior en superficies elevadas: separa sin bordes duros.
2. El **scrim translúcido** sobre foto para el bloque destacado del hero.
3. La escala de acento **invertida por tema** (aclarar en oscuro, oscurecer en claro).

## Qué NO llevar a producción

- Vidrio sobre vidrio en paneles de captura (Forms): el blur destruye la lectura de chips.
- `backdrop-filter` en filas de tabla o en listas largas: coste de pintado alto.
