const fs = require('fs');
const ruta = process.argv[2];
const css = fs.readFileSync(ruta, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/* Un bloque = un selector seguido de {}, equilibrado contando llaves. El
   ancla ^ es obligatoria: [data-style="x"] aparece dozens de veces y dentro de
   [data-theme="light"][data-style="x"], así que sin ancla el match se va al
   bloque equivocado y devuelve los tokens del otro tema en silencio. */
function bloque(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp("^" + esc + "\\s*\\{", "m"));
  if (!m) throw new Error("bloque no encontrado: " + sel);
  let i = m.index + m[0].length - 1, d = 0, j = i;
  for (;;) {
    if (css[j] === "{") d++;
    else if (css[j] === "}") { d--; if (!d) break; }
    j++;
  }
  return css.slice(i + 1, j);
}

function tokens(bloqueCss) {
  const o = {};
  for (const m of bloqueCss.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}

const ref = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const contrato = Object.keys(ref.tokens);
const puente = Object.keys(ref.puente);
const nativoSel = process.argv[4];
const claroSel = process.argv[5];

const nativo = tokens(bloque(nativoSel));
const claro = tokens(bloque(claroSel));

const pick = (src, keys) => {
  const o = {};
  for (const k of keys) if (src[k] !== undefined) o[k] = src[k];
  return o;
};

const salida = {
  tokens_dark: pick(nativo, contrato),
  tokens_light: pick(claro, contrato),
  puente_dark: pick(nativo, puente),
  puente_light: pick(claro, puente),
  faltan_dark: contrato.filter((k) => !(k in nativo)),
  faltan_light: contrato.filter((k) => !(k in claro)),
};
console.error("nativo --bg-page =", nativo["--bg-page"]);
console.error("claro  --bg-page =", claro["--bg-page"]);
console.error("nativo --skin-on-solid =", nativo["--skin-on-solid"]);
console.error("claro  --skin-on-solid =", claro["--skin-on-solid"]);
console.error("faltan dark:", salida.faltan_dark.join(",") || "(ninguno)");
console.error("faltan light:", salida.faltan_light.join(",") || "(ninguno)");

/* Los tokens que no se redeclaran en un modo (radio, duracion) no son un fallo:
   son tokens que valen lo mismo en los dos temas. Se heredan del bloque nativo
   y se anotan como tales, en vez de inventar un valor para rellenar. */
for (const [modo, propios, heredados] of [
  ["light", salida.tokens_light, salida.tokens_dark],
]) {
  for (const k of salida["faltan_" + modo]) {
    if (heredados[k] !== undefined) propios[k] = heredados[k];
  }
  salida["faltan_" + modo] = contrato.filter((k) => !(k in propios));
}

const doc = {
  $meta: {
    id: process.env.SKIN_ID,
    num: process.env.SKIN_NUM,
    nombre: process.env.SKIN_NOMBRE,
    familia: process.env.SKIN_FAMILIA,
    status: "ready",
    archivos: { skin: "style.css", brief: "STYLE.md" },
    source_of_truth: "style.css",
    nota_hex:
      "Los colores de 8 dígitos son RGBA (#RRGGBBAA). Los de 6 son opacos.",
    nota:
      'Skin de la plantilla Showcase. Solo redefine tokens y overrides dentro de [data-style="' +
      process.env.SKIN_ID +
      '"]; no modifica components.css.',
    trampa: process.env.SKIN_TRAMPA,
  },
  aplicacion: {
    atributo: '[data-style="' + process.env.SKIN_ID + '"]',
    modo_nativo: process.env.SKIN_MODO,
    modos: JSON.parse(process.env.SKIN_MODOS),
    capa_de_modo:
      '[data-theme="light"][data-style="' + process.env.SKIN_ID + '"]',
    alcance_de_esta_muestra: JSON.parse(process.env.SKIN_ALCANCE),
  },
  veredicto: process.env.SKIN_VEREDICTO,
  robar: JSON.parse(process.env.SKIN_ROBAR),
  no_robar: JSON.parse(process.env.SKIN_NO_ROBAR),
  a11y: {
    contraste: process.env.SKIN_A11Y,
    peor_caso: process.env.SKIN_PEOR,
    reglas: JSON.parse(process.env.SKIN_REGLAS),
  },
  vocabulario: {
    regla: process.env.SKIN_VOCAB,
    familias: JSON.parse(process.env.SKIN_FAMILIAS),
  },
  tipografia: JSON.parse(process.env.SKIN_TIPO),
  forma: JSON.parse(process.env.SKIN_FORMA),
  profundidad: JSON.parse(process.env.SKIN_PROF),
  textura: JSON.parse(process.env.SKIN_TEXTURA),
  movimiento: JSON.parse(process.env.SKIN_MOV),
  tokens: salida.tokens_light,
  puente: salida.puente_light,
  modo_dark_tokens: salida.tokens_dark,
  puente_dark: salida.puente_dark,
  paleta: JSON.parse(process.env.SKIN_PALETA),
  nota_tokens: process.env.SKIN_NOTA_TOKENS,
};

if (salida.faltan_dark.length || salida.faltan_light.length) {
  throw new Error(
    "faltan tokens: dark=" + salida.faltan_dark + " light=" + salida.faltan_light,
  );
}
process.stdout.write(JSON.stringify(doc, null, 2) + "\n");