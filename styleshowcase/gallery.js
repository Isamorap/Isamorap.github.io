/* ==========================================================================
   GALERÍA — índice del muestrario. Sin dependencias, sin fetch (file:// ok).
   - inyecta la hoja de cada skin listo (una vez)
   - pinta una ficha por estilo, con preview vivo (componentes reales dentro
     de un div con [data-style] y [data-theme] = el modo nativo del estilo)
   - filtros por familia y por estado
   ========================================================================== */
(function () {
  "use strict";

  var estilos = window.STYLE_ESTILOS.map(function (f) { return window.STYLE_get(f[1]); });
  var grid = document.getElementById("gGrid");

  /* ---- 1. Las hojas de los skins listos entran una sola vez ---- */
  estilos.forEach(function (e) {
    if (e.status !== "ready") return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = e.carpeta + "/style.css";
    document.head.appendChild(l);
  });

  /* ---- 2. Cabecera: contadores ---- */
  var ready = estilos.filter(function (e) { return e.status === "ready"; });
  function dato(id, valor) {
    var el = document.getElementById(id);
    if (el) el.textContent = valor;
  }
  dato("mTotal", estilos.length);
  dato("mListos", ready.length);
  dato("mPendientes", estilos.length - ready.length);
  dato("mFamilias", Object.keys(window.STYLE_FAMILIAS).length);

  /* ---- 3. Piezas de la ficha ---- */
  function tag(texto, clase) {
    return '<span class="g-tag ' + (clase || "") + '">' + texto + "</span>";
  }
  function swatches(e) {
    var hexs = [];
    (window.STYLE_PALETAS[e.id] || []).forEach(function (g) {
      g.colores.forEach(function (c) { hexs.push(c[1]); });
    });
    return hexs.slice(0, 7).map(function (h) {
      return '<i style="background:' + h + '"></i>';
    }).join("");
  }
  function preview(e) {
    if (e.status !== "ready") {
      return '<div class="g-prev"><div class="g-prev-vacio">sin skin todavía<br>carpeta ' + e.carpeta + "</div></div>";
    }
    return '<div class="g-prev"><div class="g-pv" data-style="' + e.id + '" data-theme="' + e.modo + '">' +
      '<div class="g-pv-nav"><span class="g-pv-dot"></span><span class="g-pv-bar"></span>' +
      '<span class="g-pv-bar is-short"></span></div>' +
      '<p class="g-pv-title">Muestra de estilo</p>' +
      '<p class="g-pv-sub">espécimen ' + e.num + " · " + e.familiaNombre + "</p>" +
      '<div class="g-pv-row"><button class="btn btn-primary" type="button">Primario</button>' +
      '<button class="btn btn-ghost" type="button">Fantasma</button></div>' +
      '<div class="g-pv-row"><span class="pill pill-ok">Éxito</span>' +
      '<span class="pill pill-warn">Aviso</span><span class="pill pill-bad">Crítico</span></div>' +
      '<div class="g-pv-sw">' + swatches(e) + "</div>" +
      "</div></div>";
  }
  function acciones(e) {
    if (e.status !== "ready") {
      return '<p class="g-pendiente">pendiente · declarado en index.json</p>';
    }
    return '<a href="_template/specimen.html?style=' + e.id + '">Abrir espécimen →</a>' +
      '<a class="g-suave" href="' + e.carpeta + '/style.css">style.css</a>' +
      '<a class="g-suave" href="' + e.carpeta + '/style.json">style.json</a>' +
      '<a class="g-suave" href="' + e.carpeta + '/STYLE.md">STYLE.md</a>';
  }
  function ficha(e) {
    var a11yClase = e.a11y === "AA" ? "is-aa" : e.a11y === "AA*" ? "is-aa-star" : "";
    return '<article class="g-card ' + (e.status === "ready" ? "" : "is-planned") + '">' +
      preview(e) +
      '<div class="g-body">' +
      '<p class="g-name"><b>' + e.num + "</b><strong>" + e.nombre + "</strong></p>" +
      '<p class="g-resumen">' + e.resumen + "</p>" +
      '<div class="g-tags">' +
      tag(e.familiaNombre) +
      tag("contraste " + e.a11y, a11yClase) +
      tag(e.veredicto, e.veredicto === "adoptable" ? "is-adoptable" : "") +
      tag(e.modo === "dark" ? "nativo oscuro" : "nativo claro") +
      "</div>" +
      '<div class="g-acciones">' + acciones(e) + "</div>" +
      "</div></article>";
  }

  /* ---- 4. Filtros ---- */
  var fFamilia = "todas";
  var fEstado = "todos";
  document.querySelectorAll("[data-familia]").forEach(function (b) {
    b.addEventListener("click", function () {
      fFamilia = b.getAttribute("data-familia");
      document.querySelectorAll("[data-familia]").forEach(function (o) { o.classList.remove("is-on"); });
      b.classList.add("is-on");
      pintar();
    });
  });
  document.querySelectorAll("[data-estado]").forEach(function (b) {
    b.addEventListener("click", function () {
      fEstado = b.getAttribute("data-estado");
      document.querySelectorAll("[data-estado]").forEach(function (o) { o.classList.remove("is-on"); });
      b.classList.add("is-on");
      pintar();
    });
  });

  /* ---- 5. Pintar ---- */
  function pintar() {
    if (!grid) return;
    var lista = estilos.filter(function (e) {
      var okFamilia = fFamilia === "todas" || e.familia === fFamilia;
      var okEstado = fEstado === "todos" || e.status === fEstado;
      return okFamilia && okEstado;
    });
    grid.innerHTML = lista.length
      ? lista.map(ficha).join("")
      : '<p class="g-vacio">Sin estilos en ese filtro.</p>';
  }
  pintar();
})();
