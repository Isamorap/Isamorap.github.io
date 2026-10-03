/* ==========================================================================
   check-skins.js — el guardián del contrato de aislamiento
   --------------------------------------------------------------------------
   Los skins conviven TODOS en el mismo documento: el espécimen y la galería
   los cargan de golpe. Se separan únicamente porque cada uno escribe dentro
   de `[data-style="<id>"]`, y ese atributo es la única razón de que no se pisen.

   Si un selector se escapa —un `.btn { }` suelto, un `:root`, un `*`— se
   filtra a los otros estilos y a la galería entera. Y se filtra EN SILENCIO:
   la página no da error, simplemente otro estilo se ve mal. Eso no se
   detecta leyendo, por eso está en un script.

   Correr:  node check-skins.js      (sale con código 1 si algo está mal)
   No hay build ni dependencias: es un script suelto que se lee y se ejecuta.
   ========================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

/* El registro no usa APIs de navegador, así que un `window` vacío basta para
   reutilizarlo como fuente de verdad en lugar de releer las carpetas. */
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "registry.js"), "utf8"));

const estilos = global.window.STYLE_ready();
const declarados = global.window.STYLE_ESTILOS.length;
const problemas = [];
const avisos = [];

/* Quita comentarios. */
function sinComentarios(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/* Extrae los selectores de estilo de verdad, con un parserito propio.
   La primera versión de esto usaba `match(/[^{}]+\{/g)` y daba 141 falsos
   positivos: se comía las declaraciones del bloque anterior, partía las listas
   de selectores por la coma y contaba los `0%`, `50%` de un @keyframes como si
   fueran selectores. Un chequeo que grita al pedo acaba ignorado, así que
   acá se camina el CSS respetando las llaves.
   Devuelve solo los selectores de ESTILO: ni at-rules, ni @keyframes, ni sus
   hij percentages, ni reglas que contienen otras reglas. */
function selectoresDeEstilo(css) {
  const s = sinComentarios(css);
  const out = [];
  let buf = "";
  let profundidad = 0;
  const pila = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") {
      const sel = buf.trim();
      buf = "";
      const ctx = {
        sel,
        esAt: sel.startsWith("@"),
        esKeyframes: /^@(-webkit-)?keyframes\b/i.test(sel),
        enKeyframes: pila.some((p) => p.esKeyframes),
        teniaHijos: false,
      };
      if (pila.length) pila[pila.length - 1].teniaHijos = true;
      pila.push(ctx);
      profundidad++;
      continue;
    }
    if (ch === "}") {
      const ctx = pila.pop();
      profundidad--;
      if (ctx && !ctx.esAt && !ctx.esKeyframes && !ctx.enKeyframes && !ctx.teniaHijos) {
        out.push(ctx.sel);
      }
      buf = "";
      continue;
    }
    buf += ch;
  }
  return out;
}

/* El contrato de tokens que todo skin debe declarar. Se lee de un skin que ya
   existe (12-swiss) para no mantener una lista a mano que se desincronice. */
function leerContrato() {
  const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "12-swiss", "style.json"), "utf8"));
  return { tokens: Object.keys(ref.tokens), puente: Object.keys(ref.puente) };
}
const contrato = leerContrato();
const espejo = JSON.parse(fs.readFileSync(path.join(__dirname, "index.json"), "utf8"));

function revisarSkin(e) {
  const ruta = path.join(__dirname, e.carpeta, "style.css");
  const css = fs.readFileSync(ruta, "utf8");
  const prefijo = `[data-style="${e.id}"]`;

  /* ---- 1. Todo selector tiene que llevar el prefijo del skin ----
     Se busca CON `includes`, no con `startsWith`: la capa de modo oscuro es
     `[data-theme="dark"][data-style="<id>"]`, que empieza por el tema y sigue
     siendo perfectamente válida (es más específica, y el skin la necesita). */
  for (const sel of selectoresDeEstilo(css)) {
    for (const parte of sel.split(",")) {
      const s = parte.trim();
      if (!s) continue;
      if (!s.includes(prefijo)) problemas.push(`${e.carpeta}: selector fuera de scope → ${s}`);
    }
  }

  /* ---- 2. Llaves balanceadas ----
     Contar llaves NO alcanza para validar CSS: una regla sin cerrar se traga
     todo lo que viene después y el navegador descarta el resto en silencio.
     Esto solo atrapa el caso obvio; el resto lo delata el navegador. */
  let profundidad = 0;
  let linea = 1;
  for (const ch of css) {
    if (ch === "\n") linea++;
    if (ch === "{") profundidad++;
    if (ch === "}") {
      profundidad--;
      if (profundidad < 0) {
        problemas.push(`${e.carpeta}: llave de cierre de más (línea ${linea})`);
        profundidad = 0;
      }
    }
  }
  if (profundidad !== 0) problemas.push(`${e.carpeta}: llaves sin cerrar (quedan ${profundidad} abiertas)`);

  /* ---- 3. !important: no rompe el aislamiento por sí solo —el prefijo del
     selector sigue decidiendo a qué elemento aplica— pero casi siempre
     significa "no encontré la forma de ganar la cascada", y la cascada se
     gana con especificidad. Queda como aviso, no como error. */
  const importantes = (css.match(/!important/g) || []).length;
  if (importantes > 0) {
    avisos.push(`${e.carpeta}: ${importantes} uso(s) de !important — no rompe el aislamiento, pero conviene mirarlo`);
  }

  /* ---- 4. Tokens: el puente es obligatorio, el resto puede heredarse ----
     Los 14 `--skin-*` SÍ tienen que estar: los lee `_template/specimen.css` y
     si faltan, el espécimen se ve a medias sin avisar. El resto del contrato
     es distinto: un skin puede callar un token y heredarlo de la base a
     propósito (07-cyberpunk no toca `--ember-*`, por ejemplo). Eso es
     válido, no un error, así que va como aviso. */
  const heredados = [];
  for (const t of contrato.puente) {
    if (!css.includes(`${t}:`)) problemas.push(`${e.carpeta}: falta el token del puente ${t}`);
  }
  for (const t of contrato.tokens) {
    if (!css.includes(`${t}:`)) heredados.push(t.replace(/^--/, ""));
  }
  if (heredados.length) {
    avisos.push(`${e.carpeta}: hereda ${heredados.length} token(s) de la base (${heredados.slice(0, 5).join(", ")}${heredados.length > 5 ? "…" : ""})`);
  }

  const fx = [...new Set(css.match(/--fx-[a-z0-9-]+/g) || [])];
  if (fx.length) {
    avisos.push(`${e.carpeta}: enciende efectos compartidos ${fx.join(", ")} — debe estar justificado en su STYLE.md`);
  }

  /* ---- 6. La ficha tiene que existir y no contradecir al registro ----
     El veredicto y el contraste que muestra la cinta del espécimen salen del
     registro: si divergen del style.json, el museo está mintiendo. */
  const ficha = JSON.parse(fs.readFileSync(path.join(__dirname, e.carpeta, "style.json"), "utf8"));
  if (ficha.$meta.id !== e.id) problemas.push(`${e.carpeta}: style.json declara id "${ficha.$meta.id}"`);
  if (ficha.$meta.num !== e.num) problemas.push(`${e.carpeta}: style.json declara num "${ficha.$meta.num}"`);
  if (ficha.$meta.familia !== e.familia) problemas.push(`${e.carpeta}: style.json declara familia "${ficha.$meta.familia}"`);
  if (ficha.$meta.status !== "ready") problemas.push(`${e.carpeta}: style.json dice status "${ficha.$meta.status}" pero el registro lo tiene como listo`);
  if (!fs.existsSync(path.join(__dirname, e.carpeta, "STYLE.md"))) problemas.push(`${e.carpeta}: falta STYLE.md`);
  if (ficha.veredicto !== e.veredicto) problemas.push(`${e.carpeta}: veredicto "${ficha.veredicto}" en style.json vs "${e.veredicto}" en el registro`);
  if (ficha.a11y && ficha.a11y.contraste !== e.a11y) problemas.push(`${e.carpeta}: contraste "${ficha.a11y.contraste}" en style.json vs "${e.a11y}" en el registro`);
}

/* Todos los skins con skin, uno por uno. */
estilos.forEach(revisarSkin);

/* ---- 7. Las paletas del registro y del espejo deben ser las mismas ----
   La galería lee registry.js y un agente lee index.json: si divergen, la
   galería muestra un color y el agente copia otro. */
for (const [id, grupos] of Object.entries(global.window.STYLE_PALETAS)) {
  if (!espejo.palette[id]) {
    avisos.push(`index.json no trae la paleta de "${id}" (no rompe la galería, que lee registry.js)`);
    continue;
  }
  for (const g of grupos) {
    const enJson = espejo.palette[id][g.grupo];
    if (!enJson) {
      problemas.push(`paleta de "${id}": falta el grupo "${g.grupo}" en index.json`);
      continue;
    }
    for (const [nombre, hex] of g.colores) {
      if (enJson[nombre] !== hex) {
        problemas.push(`paleta de "${id}": "${nombre}" es ${hex} en registry.js y ${enJson[nombre]} en index.json`);
      }
    }
  }
}

/* ---- 8. El registro y el espejo tienen que llevar las mismas filas ---- */
const filas = global.window.STYLE_ESTILOS;
if (filas.length !== espejo.estilos.length) {
  problemas.push(`registro: ${filas.length} filas vs ${espejo.estilos.length} estilos en index.json`);
}
for (const fila of filas) {
  const e = global.window.STYLE_get(fila[1]);
  const enJson = espejo.estilos.find((x) => x.id === e.id);
  if (!enJson) {
    problemas.push(`"${e.id}" está en registry.js pero no en index.json`);
    continue;
  }
  const esperados = {
    n: e.num, nombre: e.nombre, familia: e.familia,
    modo: e.modo, a11y: e.a11y, veredicto: e.veredicto, resumen: e.resumen,
  };
  for (const [k, v] of Object.entries(esperados)) {
    if (enJson[k] !== v) problemas.push(`"${e.id}": ${k} es "${v}" en el registro y "${enJson[k]}" en index.json`);
  }
  if (JSON.stringify(enJson.modos) !== JSON.stringify(e.modos)) {
    problemas.push(`"${e.id}": modos distintos entre el registro y index.json`);
  }
  if (e.status !== enJson.status) {
    problemas.push(`"${e.id}": status "${e.status}" en el registro y "${enJson.status}" en index.json`);
  }
}

/* ---- 9. Ninguna etiqueta de componente puede llevar un dato de negocio ----
   La regla del laboratorio: el color lo pone el token, la palabra la elige el
   proyecto. Es lo que se colaba antes ("abierto", "cerrado", "pendiente"). */
const plantilla = path.join(__dirname, "_template", "specimen.html");
if (fs.existsSync(plantilla)) {
  const html = fs.readFileSync(plantilla, "utf8");
  const prohibidas = ["Activo", "Pendiente", "Detenido", "Programado", "Guardar", "Cancelar", "Inactivo", "Abierto", "Cerrado", "Completado"];
  for (const palabra of prohibidas) {
    if (new RegExp(`>\\s*${palabra}\\s*<`).test(html)) {
      problemas.push(`_template/specimen.html: la etiqueta "${palabra}" es vocabulario de datos`);
    }
  }
}

/* =========================================================================
   AUDITORÍA DE CONTRASTE (opcional, requiere navegador)
   -------------------------------------------------------------------------
   El chequeo estático de arriba NO puede validar el contraste: WCAG lo
   define sobre los colores RESUELTOS, y un skin puede declarar bien todos
   sus tokens y aun así Romperlo en una regla (por ejemplo `.btn-cell {
   background:#fff }` sin equivalente en oscuro). Por eso esto mide de verdad,
   en el navegador, con el método de /tmp/au (validado contra casos de
   contraste analítico conocido).

   Uso:  node check-contrast.js            (los 8 skins, claro y oscuro)
         node check-contrast.js neo-brutalism
   No se ejecuta desde check-skins.js porque necesita playwright-core, que no
   es una dependencia del proyecto (se resuelve desde node_modules ajeno).
   ========================================================================= */

const ok = problemas.length === 0;
console.log(`check-skins · ${estilos.length} skins con ficha de ${declarados} declarados`);
if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}):`);
  avisos.forEach((a) => console.log("  · " + a));
}
if (ok) {
  console.log("\n✓ Los skins respetan el aislamiento por [data-style].");
  console.log("✓ Contrato de tokens completo en los " + estilos.length + " skins.");
  console.log("✓ Registro, fichas y index.json dicen lo mismo.");
  console.log("✓ Ninguna etiqueta de componente lleva vocabulario de datos.");
} else {
  console.log(`\n✗ ${problemas.length} problema(s):`);
  problemas.forEach((p) => console.log("  · " + p));
}
/* process.exitCode y no process.exit(): con la salida en un pipe, process.exit()
   mata el proceso antes de que stdout se vacíe y se pierde todo el texto. */
process.exitCode = ok ? 0 : 1;

