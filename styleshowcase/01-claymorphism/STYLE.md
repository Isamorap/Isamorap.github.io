# Estilo 01 · Claymorphism (indicaciones para agentes IA)

Ficha: `style.json` · Skin: `style.css` · Registro: `../index.json`
Plantilla que viste este estilo: `../_template/specimen.html?style=claymorphism`
Familia: Materiales blandos · Modo nativo: claro · Modos: light + dark
Veredicto: **experimental** · Contraste: **AA\*** (excepción medida, ver abajo)

## Identidad en tres líneas

1. **Ningún filete.** El límite entre dos superficies lo dibuja una **sombra doble**: una clara arriba-izquierda (`-6px -6px 12px #fffaf2`) y otra oscura abajo-derecha (`6px 6px 12px #cec2b0`), sobre un fondo **del mismo tono** que el objeto.
2. **El hover hunde, no levanta.** Pasa a `box-shadow: inset`. Es el gesto que define este estilo y el único de la casa que lo hace.
3. **Radios grandes y siempre parejos** (14 / 20 / 26 / 34px), y **movimiento blando sin rebote**.

## Qué toca y qué no

| Toca | No toca |
| --- | --- |
| Tokens dentro de `[data-style="claymorphism"]` | `../tokens.css`, `../components.css`, `../gallery.js` |
| `border: 0` + receta de sombra en los componentes | Estructura, densidad ni tamaño de ningún componente |
| `inset` en hover y active | La familia tipográfica (regla del contrato) |
| La capa de modo `[data-theme="dark"][data-style=...]` | El vocabulario de estados ni la escala tipográfica base |

## Receta de bloque (copiable)

```css
/* La receta completa: sin borde, con dos sombras en diagonal. */
border: 0;
border-radius: 26px;
box-shadow:
  7px 7px 14px #cec2b0,   /* sombra: abajo-derecha */
  -7px -7px 14px #fffaf2;  /* luz:    arriba-izquierda */

/* Hover: HUNDIR. La sombra clara desaparece y la oscura entra. */
&:hover {
  transform: translateY(1px);
  box-shadow:
    inset 4px 4px 8px rgba(120, 105, 84, 0.32),
    inset -3px -3px 7px rgba(255, 255, 255, 0.7);
}
```

Reglas: **el fondo debe participar del volumen** (si el lienzo fuera blanco, la
sombra clara no tendría contra qué leerse); `--shadow-*` **no se anula nunca a
`none`** aquí, porque en este estilo la sombra *es* la estructura; y el
deshabilitado se resuelve con **color medido** (`#7a6e5d`), nunca con opacidad.

## Tipografía

Montserrat, la base, sin cambios de familia. El carácter sale del **peso 800** y
del **interletrado corto (`-0.02em`)**, no de otra tipografía. Las mayúsculas se
reservan para etiquetas. El redondeo de las esquinas del texto acompaña al radio
de las superficies; no es una tipografía redondeada.

## Movimiento

Blando y **sin rebote** (160/240/320 ms, `cubic-bezier(.34,.9,.4,1)`). El hover
hunde 1px y el active hunde 2px: la plastilina **cede, no salta**. Con
`prefers-reduced-motion` se anula el desplazamiento y se conserva la forma.

## Contraste (verificado con cálculo, no estimado)

| Par | Relación | Resultado |
| --- | --- | --- |
| Tinta `#3b3226` sobre arcilla `#efe9e0` | 10.4:1 | AAA |
| Cuerpo `#4a4033` sobre arcilla | 8.4:1 | AAA |
| Secundario `#655946` sobre arcilla | 5.7:1 | AA |
| Faint `#6e6250` sobre arcilla | 4.9:1 | AA |
| Acento-texto `#8f3d10` sobre arcilla | 6.1:1 | AA |
| Acento `#ad4a15` con texto blanco | 5.6:1 | AA |
| Semánticos `-fg` sobre `-bg` | 5.2–7.6:1 | AA–AAA |
| **Dark**: tinta `#f7f2ea` sobre `#332d26` | 12.2:1 | AAA |
| **Dark**: `#2b1a0c` sobre acento `#ff9a5c` | 8.0:1 | AAA |

### La excepción que da nombre al `AA*`

Los filetes **no llegan al 3:1 de WCAG 1.4.11**:

| Filete | Sobre arcilla | Sobre arcilla oscura |
| --- | --- | --- |
| `--line-soft` | 1.37:1 | 1.28:1 |
| `--line-strong` | 2.28:1 | 1.86:1 |

Es el **precio directo de la receta**: en este estilo el contorno de un control
lo dibuja la sombra, no la línea. Por eso `AA*` y no `AA`, y por eso el veredicto
es `experimental` y no `adoptable`. **Consecuencia práctica:** cualquier control
cuyo contorno sea *solo* filete queda por debajo del umbral y necesita una segunda
señal (relleno, cambio de tono o sombra). Si algún día se quiere un control así,
hay que oscurecer su filete aunque se rompa la receta.

El **deshabilitado** queda en 3.8:1 (claro) y 4.5:1 (oscuro), por debajo de AA,
pero WCAG 1.4.3 **exime a los componentes inactivos** del contraste mínimo. Aun
así se resolvió con color medido y no con opacidad, para que el control siga
leyéndose como control.

## Qué rompe y cómo se arregla

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Todo se ve plano y sucio | Lienzo blanco o muy claro | El fondo debe ser del mismo tono que el objeto |
| Los elementos desaparecen en pantalla de bajo contraste | Sin filetes, el límite depende solo de la sombra | Subir el contraste del texto o añadir un filete a ese control |
| Botones que parecen pegados al fondo | Radio pequeño con sombra grande | Radio y distancia de sombra van juntos |
| Ruido visual en tablas densas | Radio de 34px por celda | Bajar a 8–12px en superficies de datos |
| Hundido ilegible en modo oscuro | La sombra clara desaparece | Compensar con una sombra oscura más profunda |

## Qué se puede reutilizar en otros proyectos (sin adoptar el estilo)

1. **El hover que hunde** (`inset`) en vez de levantar: un gesto blando que ningún
   otro estilo de la casa tiene, y funciona bien en superficies pequeñas.
2. **La sombra doble como jerarquía completa**, cuando se quiere volumen sin borde.
3. **Campos de formulario hundidos** frente a todos los demás, que los dibujan
   elevados: invierte la expectativa y se lee al instante.
4. **Deshabilitado con color medido** en vez de `opacity`: conserva AA y sobrevive
   a cualquier fondo.

## Qué NO llevar a producción

- **La receta completa en un producto real**: sin filetes, los límites se vuelven
  dependientes de la sombra y se pierden en pantallas de bajo contraste.
- **El radio grande por defecto**: 34px en tablas densas o listas de datos divide
  cada fila en islas y destruye la alineación.
- **La sombra doble en superficies pequeñas**: por debajo de unos 40px de lado, el
  par de sombras se come el interior y el elemento se ensucia.
- **Clay en alto contraste o impresión**: el volumen depende de gradientes suaves
  y se aplana por completo.

