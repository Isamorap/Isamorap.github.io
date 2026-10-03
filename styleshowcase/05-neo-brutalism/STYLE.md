# Estilo 05 · Neo-Brutalism (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=neo-brutalism`
Familia: Ruido y brutal · Modo nativo: claro · Modos: light + dark
Veredicto: **adoptable** (el único de la familia con licencia para producción)

## Identidad en tres líneas

1. Todo borde es **negro y de 3px**; el radio es **0** en los cinco niveles, incluida la pill.
2. La elevación es **sombra dura** (4/8/12px sin blur) y el press la reduce a 1px.
3. Un solo acento eléctrico (amarillo) y **tinta negra encima**: el contraste no se discute.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="neo-brutalism"]` | `../tokens.css`, `../components.css`, `../gallery.js` |
| Grosor de borde, radio y sombra de los componentes | Estructura, densidad ni tamaño de ningún componente |
| Caja alta (mayúsculas) en display y acciones | El vocabulario de estados ni la familia tipográfica |
| Los cinco semáforos, en versión sólida | La escala tipográfica base |

## Receta de bloque (copiable)

```css
/* Bloque impreso: borde grueso + sombra dura */
border: 3px solid #111111;
border-radius: 0;
box-shadow: 4px 4px 0 #111111;
/* Press mecánico */
.btn:hover  { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 #111111; }
.btn:active { transform: translate(2px, 2px);   box-shadow: 1px 1px 0 #111111; }
```

Reglas: **un solo acento por pantalla** (si todo es amarillo, nada lo es); el
texto sobre color sólido es siempre tinta `#111111`, nunca blanco; disabled es un
sólido gris (no opacidad al 45%).

## Tipografía

Montserrat, la base. El estilo se construye con **peso 800 + mayúsculas +
interletrado** (`-0.03em` en display, `0.04em` en acciones, `0.16em` en eyebrow).
No se cambia la familia: eso mantiene el estilo a una variable de distancia de
la base.

## Movimiento

Corto y seco (120/180/420 ms, `cubic-bezier(.2,.8,.2,1)`). El hover **aleja** el
bloque 2px y el press lo **hunde**: el botón se siente mecánico, no fluido.

## Contraste (verificado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Tinta `#111111` sobre acento `#ffe500` | 16.1:1 | AAA |
| Tinta `#111111` sobre rojo `#ff4d4d` | 6.8:1 | AA |
| Tinta `#111111` sobre verde `#2fbf71` | 9.8:1 | AA |
| Cuerpo `#1f1f1f` sobre papel `#f4f1e8` | 15.3:1 | AAA |
| Secundario `#454545` sobre papel | 7.9:1 | AAA |

Sin excepciones: es el estilo **más fácil de verificar** de todo el muestrario.

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Interfaz agresiva en captura larga | Demasiados bloques con borde 3px | Reservar el borde grueso a CONTENEDORES, no a cada campo |
| El acento pierde fuerza | Más de un amarillo por pantalla | Un acento por vista (misma regla que `.btn-primary`) |
| Sombra dura recortada al borde de pantalla | Sombra sin margen | Dejar ≥8px de aire alrededor de cada bloque |
| Nada se ve deshabilitado | `opacity: .45` sobre fondo claro | Ya cubierto: disabled es sólido gris |

## Qué se puede reutilizar en otros proyectos (sin adoptar el estilo)

1. La **sombra dura** en un solo nivel (4px) para tarjetas de captura: elevación sin color.
2. El **press mecánico** (`translate` + sombra reducida) en botones: feedback más honesto que `scale(.98)`.
3. **Disabled como sólido gris** en vez de opacidad: se lee en cualquier fondo.
4. Mayúsculas + interletrado **solo** en eyebrow y micro-etiquetas (junto al borde de 1px).

## Qué NO llevar a producción

- Radio 0 en toda una app de marca: se pierde calidez.
- Borde 3px en filas de tabla: la densidad se vuelve ruido.
- Rejilla de fondo en pantallas de captura: compite con las cifras.
