/* check-contrast.js · auditoría de contraste WCAG AA del espécimen.
   -------------------------------------------------------------------------
   Va aparte de check-skins.js a propósito: el contraste lo define WCAG sobre
   los colores RESUELTOS, no sobre lo que el skin declara. Un skin puede
   cumplir el contrato de tokens y aun así romperlo en una regla suelta — el
   caso real fue `.btn-cell { background:#fff }` sin equivalente en oscuro, que
   dejó un botón fantasma a 1.09:1. Eso no lo ve un chequeo estático.

   Uso:  node check-contrast.js                (los skins con ficha)
         node check-contrast.js neo-brutalism  (solo ese)
   Si no hay navegador disponible avisa y sale con 0: es una comprobación
   opcional y no debe romper un entorno sin él.
   --------------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const SPECIMEN = "file://" + path.join(RAIZ, "_template", "specimen.html");

const srgb = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// AA: 4.5 texto normal, 3.0 texto grande (>=24px, o >=18.66px bold).
const needOf = (px, w) => (px >= 24 || (px >= 18.66 && w >= 700) ? 3 : 4.5);

function cargarPlaywright() {
  const rutas = [
    path.join(RAIZ, "node_modules", "playwright-core"),
    "/home/isa/Proyectos/Reportes_Montaña/node_modules/playwright-core",
  ];
  for (const r of rutas) {
    try {
      return require(r);
    } catch (e) {
      /* siguiente ruta */
    }
  }
  return null;
}

/* Se evalúa dentro de la página. Un nodo por texto visible, con su contraste
   ya resuelto. Tres decisiones que costaron errores en versiones previas:
     · el fondo se compone hacia arriba con las alfa REALES;
     · el recorrido NO se corta en el primer color opaco antes de mirar si
       hay degradado: cyberpunk y neo-brutalism pintan la página con un
       background-image en <html>, no con un background-color;
     · si el camino no llega a un color opaco, la página se lee de <html> y
       de --bg-page, porque hay skins que no la ponen en el body. */
function medirEnPagina() {
  const s2 = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = (c) => 0.2126 * s2(c[0]) + 0.7152 * s2(c[1]) + 0.0722 * s2(c[2]);
  const R = (a, c) => {
    const x = L(a);
    const y = L(c);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  const colorDePagina = () => {
    const hb = getComputedStyle(document.documentElement);
    const m = (hb.backgroundColor || "").match(/[0-9.]+/g);
    if (m && m.length >= 3 && (m.length < 4 || +m[3] > 0)) return [+m[0], +m[1], +m[2]];
    const pg = hb.getPropertyValue("--bg-page").trim();
    if (pg && pg[0] === "#" && pg.length >= 7) {
      return [0, 2, 4].map((i) => parseInt(pg.slice(1 + i, 3 + i), 16));
    }
    const bm = (getComputedStyle(document.body).backgroundColor || "").match(/[0-9.]+/g);
    if (bm && bm.length >= 3) return [+bm[0], +bm[1], +bm[2]];
    return [255, 255, 255];
  };

  const res = [];
  document.querySelectorAll("body *").forEach((el) => {
    if (!el.childNodes.length) return;
    const t = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (t.length < 2) return;
    const c = getComputedStyle(el);
    if (c.visibility === "hidden" || c.display === "none") return;
    if (parseFloat(c.opacity) < 0.5) return;
    // WCAG 1.4.3 exime a los controles inactivos: no tienen que cumplir.
    if (el.disabled) return;
    const fm = (c.color || "").match(/[0-9.]+/g);
    if (!fm) return;
    if (fm.length === 4 && +fm[3] < 0.5) return;
    const fg = fm.slice(0, 3).map(Number);
    if (fg.length < 3) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.top < 0 || r.left < 0) return;
    if (r.left + r.width > 1280) return;

    const capas = [];
    let grad = false;
    let n = el;
    let opaco = null;
    while (n) {
      const cn = getComputedStyle(n);
      if (cn.backgroundImage && cn.backgroundImage !== "none") grad = true;
      const m = (cn.backgroundColor || "").match(/[0-9.]+/g);
      if (m && (m.length < 4 || +m[3] > 0)) {
        capas.push([+m[0], +m[1], +m[2], m.length < 4 ? 1 : +m[3]]);
      }
      if (m && m.length < 4) {
        opaco = n;
        break;
      }
      n = n.parentElement;
    }
    if (!opaco) {
      let m2 = el;
      while (m2) {
        const c2 = getComputedStyle(m2);
        if (c2.backgroundImage && c2.backgroundImage !== "none") grad = true;
        m2 = m2.parentElement;
      }
    }
    let base = colorDePagina();
    for (let i = capas.length - 1; i >= 0; i--) {
      const f = capas[i];
      base = [0, 1, 2].map((k) => f[k] * f[3] + base[k] * (1 - f[3]));
    }
    res.push({
      t: t.slice(0, 40),
      px: parseFloat(c.fontSize),
      w: parseInt(c.fontWeight) || 400,
      grad,
      r: +R(fg, base).toFixed(2),
      // caja del glifo, para el muestreo por píxeles si hace falta
      x: Math.round(r.left) + 1,
      y: Math.round(r.top) + 1,
      bw: Math.round(r.width) - 2,
      bh: Math.round(r.height) - 2,
    });
  });
  return res;
}

/* Muestreo por píxeles, para lo que tiene degradado.
   El método analítico no puede describir un background-image: con degradado el
   `background-color` es transparente y el fondo compuesto cae al color de
   página, dando ratios de 1.0-1.4 que no son reales (era el caso de
   .btn-primary, que es un degradado). Para esos se mide la captura.

   La tinta se saca de la DIFERENCIA entre la captura con texto y la misma
   captura con el texto transparentado: la diferencia es exactamente el glifo,
   así que las esquinas redondeadas —que no cambian— no pueden contaminarla.
   Es la misma corrección que hizo falta tras ver el primer reporte dar 1.47:1
   en un botón con texto negro sobre crema. */
function muestrearPorPixeles(txt, bg, cajas, needFn) {
  const W = bg.width;
  const a = txt.data;
  const b = bg.data;
  const s = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = (i, d) => 0.2126 * s(d[i]) + 0.7152 * s(d[i + 1]) + 0.0722 * s(d[i + 2]);
  return cajas.map((c) => {
    const x0 = Math.max(0, c[0]);
    const y0 = Math.max(0, c[1]);
    const x1 = Math.min(W, c[0] + c[2]);
    const y1 = Math.min(W && bg.height, c[1] + c[3]);
    const canales = [[], [], []];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (W * y + x) << 2;
        canales[0].push(b[i]);
        canales[1].push(b[i + 1]);
        canales[2].push(b[i + 2]);
      }
    }
    if (canales[0].length < 12) return null;
    const bgPx = canales.map((ch) => {
      ch.sort((u, v) => u - v);
      return ch[ch.length >> 1];
    });
    const cambiados = [];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (W * y + x) << 2;
        const d = Math.abs(L(i, a) - L(i, b));
        if (d > 0.04) cambiados.push({ i, d });
      }
    }
    if (cambiados.length < 3) return null;
    cambiados.sort((p, q) => q.d - p.d);
    const k = Math.max(1, Math.round(cambiados.length * 0.15));
    let r = 0;
    let g = 0;
    let bl = 0;
    for (let j = 0; j < k; j++) {
      const i = cambiados[j].i;
      r += a[i];
      g += a[i + 1];
      bl += a[i + 2];
    }
    const sr = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const Li = (x) => 0.2126 * sr(x[0]) + 0.7152 * sr(x[1]) + 0.0722 * sr(x[2]);
    const la = Li([r / k, g / k, bl / k]);
    const lb = Li(bgPx);
    return +(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2));
  });
}


async function main() {
  const pw = cargarPlaywright();
  if (!pw) {
    console.log("check-contrast · no hay navegador disponible: se omite (no es un fallo).");
    return 0;
  }
  const idx = JSON.parse(fs.readFileSync(path.join(RAIZ, "index.json"), "utf8"));
  // index.json envuelve la lista en "estilos" (junto a $meta, familias, palette).
  const lista = Array.isArray(idx) ? idx : idx.estilos || idx.skins || [];
  const pedidos = process.argv.slice(2);
  const estilos = lista.filter(
    (e) => e.status === "ready" && (!pedidos.length || pedidos.includes(e.id))
  );
  if (!estilos.length) {
    console.log("check-contrast · no hay skins con ficha que revisar.");
    return 0;
  }

  const b = await pw.chromium.launch({
    channel: "chromium-headless-shell",
    args: ["--allow-file-access-from-files"],
  });
  let fallos = 0;
  let total = 0;

  for (const e of estilos) {
    for (const theme of ["light", "dark"]) {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 1400 } });
      const p = await ctx.newPage();
      await p.goto(SPECIMEN + "?style=" + e.id + "&theme=" + theme, { waitUntil: "networkidle" });
      await p.addStyleTag({
        content: "*,*::before,*::after{animation:none!important;transition:none!important}",
      });
      await p.evaluate(() => document.querySelectorAll(".rv").forEach((x) => x.classList.add("in")));
      await p.waitForTimeout(300);

      const filas = await p.evaluate(medirEnPagina);

      // Los nodos con degradado se remiden por píxeles: el color compuesto no
      // describe un fondo que es una imagen. La captura tiene que cubrir toda
      // la página, así que primero se estira el viewport a la altura real.
      const conGrad = filas.filter((f) => f.grad);
      if (conGrad.length) {
        const alto = await p.evaluate(() => document.documentElement.scrollHeight);
        await p.setViewportSize({ width: 1280, height: Math.min(alto, 16000) });
        await p.waitForTimeout(300);
        const shotTxt = await p.screenshot();
        await p.addStyleTag({
          content: "body,body *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}",
        });
        await p.waitForTimeout(200);
        const shotBg = await p.screenshot();
        const u = (buf) => "data:image/png;base64," + buf.toString("base64");
        const pixeles = await p.evaluate(
          async ([a, c, cajas, fn]) => {
            const dec = (url) =>
              new Promise((res, rej) => {
                const im = new Image();
                im.onload = () => {
                  const cv = document.createElement("canvas");
                  cv.width = im.width;
                  cv.height = im.height;
                  const cx = cv.getContext("2d", { willReadFrequently: true });
                  cx.drawImage(im, 0, 0);
                  res(cx.getImageData(0, 0, cv.width, cv.height));
                };
                im.onerror = () => rej(new Error("captura ilegible"));
                im.src = url;
              });
            const muestrear = eval("(" + fn + ")");
            const ia = await dec(a);
            const ic = await dec(c);
            return muestrear(ia, ic, cajas);
          },
          [u(shotTxt), u(shotBg), conGrad.map((f) => [f.x, f.y, f.bw, f.bh]), muestrearPorPixeles.toString()]
        );
        conGrad.forEach((f, i) => {
          if (pixeles[i] !== null && pixeles[i] !== undefined) f.r = pixeles[i];
        });
      }
      const malos = filas.filter((x) => x.r < needOf(x.px, x.w) - 0.005);
      total += filas.length;
      fallos += malos.length;

      // No todos los registros traen "carpeta" (07-cyberpunk no lo tiene en
      // index.json); se reconstruye a partir del número para no imprimir
      // "undefined" en el informe.
      const carpeta = e.carpeta || e.n + "-" + e.id;
      const etiqueta = (carpeta + "/" + theme).padEnd(28);
      console.log(
        etiqueta +
          (malos.length
            ? "x " + malos.length + "/" + filas.length +
              " - peor " + Math.min.apply(null, malos.map((m) => m.r)).toFixed(2) + ":1"
            : "ok " + filas.length + " nodos")
      );
      malos
        .sort((a, c) => a.r - c.r)
        .slice(0, 3)
        .forEach((m) => {
          console.log("      " + m.r.toFixed(2) + ":1 (necesita " + needOf(m.px, m.w) + ') "' + m.t + '"');
        });
      await ctx.close();
    }
  }

  await b.close();
  console.log(
    "\ncheck-contrast · " + fallos + " texto(s) bajo AA sobre " + total +
      " nodos (" + estilos.length + " skins x 2 temas)."
  );
  return fallos ? 1 : 0;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((err) => {
    console.error("check-contrast · fallo:", err.message);
    process.exitCode = 1;
  });
