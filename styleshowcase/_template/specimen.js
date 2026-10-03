/* ==========================================================================
   ESPÉCIMEN — carga los skins y le da vida a la muestra. Sin dependencias.
   1) lee ?style=<id> y ?theme=<light|dark>
   2) inyecta UNA HOJA POR CADA SKIN CONSTRUIDO, no solo el pedido
   3) el aislamiento lo da [data-style] en <html>: cada skin escribe solo
      dentro del suyo, así que todos conviven en el mismo documento
   4) cambiar de estilo es cambiar ese atributo: sin recargar la página
   5) cinta de museo, paleta, tokens en vivo, tema, menú y chips
   --------------------------------------------------------------------------
   Por qué todos juntos y no solo el pedido: son ~96 KB en total y es lo que
   permite conmutar al instante. La alternativa —cargar y descargar hojas—
   obligaba a recargar, y recargar es lo que Borra el estado del lector
   (scroll, menú abierto, chips pulsados). El atributo se pone en <html>, que
   es ancestro de todo, así que alcanza con uno solo.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var pedido = params.get("style");
  var est = (pedido && window.STYLE_get(pedido)) || window.STYLE_get("glassmorphism");
  if (!est) return;
  /* Un estilo declarado pero todavía sin skin dejaba la página pelada: el
     <link> daba 404 y [data-style] no definía nada. Por la lista del pie ya no
     se puede llegar (esas opciones van deshabilitadas), pero por URL sí. */
  var faltaba = est.status === "ready" ? null : est.nombre;
  if (faltaba) est = window.STYLE_get("glassmorphism");

  /* Un skin declara los modos que implementa (ver [5] en el registro). Si la URL
     pide uno que no está, se usa su modo nativo en vez de dejar la página a medio
     definir: es el mismo criterio que usa el toggle al deshabilitarse. */
  var pedidoTema = params.get("theme");
  var tema = (pedidoTema === "light" || pedidoTema === "dark") && est.modos.indexOf(pedidoTema) > -1
    ? pedidoTema
    : est.modo;

  /* ---- 1. Todos los skins construidos entran al <head>, en orden de registro ----
     El que se está viendo no necesita ninguna regla extra: gana porque es el
     único cuyo [data-style] coincide con el de <html>. */
  var vivos = window.STYLE_ready();
  vivos.forEach(function (e) {
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "../" + e.carpeta + "/style.css";
    document.head.appendChild(l);
  });

  root.setAttribute("data-style", est.id);
  root.setAttribute("data-theme", tema);

  /* El efecto de glitch duplica el texto con `attr(data-text)` en un
     pseudoelemento, así que el original debe quedar disponible como atributo.
     Es una copia, no un reemplazo: el nodo de texto sigue siendo el que se
     lee en pantalla. */
  document.querySelectorAll(".type-display").forEach(function (el) {
    if (!el.getAttribute("data-text")) el.setAttribute("data-text", el.textContent);
  });

  /* ---- 2. Cinta de museo (se repinta en cada cambio de estilo) ---- */
  function txt(id, valor) {
    var el = document.getElementById(id);
    if (el) el.textContent = valor;
  }
  function pintarCinta() {
    document.title = est.nombre + " · Espécimen del muestrario";
    txt("tapeNum", est.num);
    txt("tapeNombre", est.nombre);
    txt("tapeFamilia", est.familiaNombre);
    txt("tapeModo", "modo nativo: " + (est.modo === "dark" ? "oscuro" : "claro"));
    txt("tapeA11y", "contraste " + est.a11y);
    txt("tapeVeredicto", est.veredicto);
    txt("heroEyebrow", "Muestra " + est.num + " · " + est.nombre);
    /* Los tres enlaces de la cinta cambian de href, no de texto: son <a>, y su
       etiqueta ("style.css"…) es la misma para todos los estilos. */
    href("linkCss", "../" + est.carpeta + "/style.css");
    href("linkJson", "../" + est.carpeta + "/style.json");
    href("linkMd", "../" + est.carpeta + "/STYLE.md");
  }
  function href(id, valor) {
    var el = document.getElementById(id);
    if (el) el.href = valor;
  }

  /* ---- 3. Copiar con respaldo: en file:// el clipboard no siempre está ---- */
  var toast = document.querySelector(".toast");
  var timer = null;
  function aviso(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast show";
    clearTimeout(timer);
    timer = setTimeout(function () { toast.className = "toast"; }, 1600);
  }
  function copiar(texto, etiqueta) {
    function ok() { aviso((etiqueta || texto) + " copiado"); }
    function respaldo() {
      var t = document.createElement("textarea");
      t.value = texto;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); ok(); } catch (e) { aviso(texto); }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok, respaldo);
    } else {
      respaldo();
    }
  }
  /* Aviso diferido: solo se usa si se pidió por URL un estilo sin skin (ver
     arriba). Va acá porque el toast y aviso() se definen recién ahora. */
  if (faltaba) setTimeout(function () { aviso("«" + faltaba + "» todavía no tiene skin — se muestra Glassmorphism"); }, 400);



  /* ---- 4. Paleta del skin (viene del registro, no del CSS) ---- */
  var caja = document.getElementById("swatchGroups");
  function pintarPaleta(id) {
    if (!caja) return;
    caja.innerHTML = "";
    (window.STYLE_PALETAS[id] || []).forEach(function (grupo) {
      var div = document.createElement("div");
      var h = document.createElement("h3");
      h.textContent = grupo.grupo;
      var grid = document.createElement("div");
      grid.className = "swatches";
      grupo.colores.forEach(function (par) {
        var b = document.createElement("button");
        b.className = "swatch";
        b.type = "button";
        b.title = "Copiar " + par[1];
        b.innerHTML = '<i style="background:' + par[1] + '"></i><span>' + par[0] + " · " + par[1] + "</span>";
        b.addEventListener("click", function () { copiar(par[1]); });
        grid.appendChild(b);
      });
      div.appendChild(h);
      div.appendChild(grid);
      caja.appendChild(div);
    });
  }

  /* ---- 5. Tema: solo tiene sentido si el estilo declara los dos modos ----
     El toggle se habilita o deshabilita POR ESTILO: uno que solo trae un modo
     no puede alternar, así que el botón se apaga y explica por qué. */
  var toggle = document.getElementById("themeToggle");
  function pintarTema() {
    var oscuro = root.getAttribute("data-theme") === "dark";
    var icono = toggle && toggle.querySelector(".material-symbols-outlined");
    if (icono) icono.textContent = oscuro ? "light_mode" : "dark_mode";
    document.querySelectorAll("img[data-dark-src]").forEach(function (img) {
      if (!img.getAttribute("data-light-src")) img.setAttribute("data-light-src", img.getAttribute("src"));
      img.src = oscuro ? img.getAttribute("data-dark-src") : img.getAttribute("data-light-src");
    });
  }
  function estadoToggle() {
    if (!toggle) return;
    var libre = est.modos.length > 1;
    toggle.disabled = !libre;
    toggle.title = libre ? "Cambiar tema"
      : "Este estilo solo define el modo " + (est.modo === "dark" ? "oscuro" : "claro");
    toggle.style.opacity = libre ? "" : "0.5";
    toggle.style.cursor = libre ? "" : "not-allowed";
  }
  pintarTema();
  if (toggle) {
    toggle.addEventListener("click", function () {
      if (est.modos.length < 2) return;
      root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
      pintarTema();
      pintarHint();
      marcarURL();
    });
  }

  /* ---- 6. Menú de bloques ---- */
  var menuBtn = document.getElementById("menuBtn");
  var menuList = document.getElementById("menuList");
  function cerrarMenu() {
    if (menuList) menuList.hidden = true;
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }
  if (menuBtn && menuList) {
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var abrir = menuList.hidden;
      menuList.hidden = !abrir;
      menuBtn.setAttribute("aria-expanded", String(abrir));
    });
    menuList.addEventListener("click", function (e) { if (e.target.closest("a")) cerrarMenu(); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".navmenu")) cerrarMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarMenu(); });
  }

  /* ---- 7. Chips de estado: un activo por tarjeta y la barra obedece ---- */
  function familiaDe(btn) {
    if (btn.classList.contains("is-ok")) return "ok";
    if (btn.classList.contains("is-warn")) return "warn";
    return "bad";
  }
  document.querySelectorAll(".kitcard").forEach(function (card) {
    var chips = card.querySelectorAll(".ck button");
    var barra = card.querySelector(".dbar");
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        chips.forEach(function (otro) { otro.classList.remove("is-on"); });
        btn.classList.add("is-on");
        if (!barra) return;
        barra.className = "dbar dbar-" + familiaDe(btn);
        barra.innerHTML = "<span>" + btn.textContent.trim() + "</span>";
      });
    });
  });

  /* ---- 8. Lectura de tokens en vivo (cuando el skin ya cargó) ---- */
  function leerTokens() {
    var cs = getComputedStyle(root);
    function tok(n) { return cs.getPropertyValue(n).trim(); }
    var mono = document.getElementById("typeMono");
    if (mono) {
      mono.textContent = "--text-strong: " + tok("--text-strong") + "; --accent-500: " + tok("--accent-500") + ";";
    }
    var spec = document.getElementById("btnSpec");
    if (spec) {
      spec.innerHTML = "<strong>btn</strong> · --radius-pill: " + tok("--radius-pill") +
        " · --shadow-1: " + tok("--shadow-1") + " · --dur-2: " + tok("--dur-2");
    }
    /* Las tres pastillas de motion dicen el tiempo que realmente llevan, no el
       de la base. Sin esto, un skin que estira el tiempo (Ethereal a 2200ms)
       muestra una pastilla que tarda 2.2 s rotando y rotula "650ms". Como
       `leerTokens` se vuelve a llamar en cada cambio de estilo, la etiqueta
       sigue al skin activo sin recargar. */
    document.querySelectorAll(".motion-chip[data-tok]").forEach(function (chip) {
      var v = tok(chip.getAttribute("data-tok"));
      if (v) chip.textContent = v;
    });
  }
  /* La llamada se hace desde §11 (primer pintado) y desde `irA`, porque ahora
     hay varias hojas y ninguna es "la" hoja del skin: el que manda es el que
     coincide con [data-style]. Esperar a que las hojas carguen es lo que hace
     que los tokens leídos sean los del skin y no los de la base. */

  /* ---- 9. Selector de estilo del pie --------------------------------------
     Cambiar de muestra sin volver a la galería. El <select> es nativo: teclado,
     lector de pantalla y móvil salen gratis. Al elegir NO se recarga: se mueve
     `data-style` y el skin correspondiente empieza a mandar. Antes recargaba, y
     recargar era lo único posible porque solo había una hoja en la página; con
     todas cargadas, recargar sería tirar a la basura el estado del lector
     (scroll, menú abierto, chips pulsados) para ganar nada.
     La URL se actualiza igual con `replaceState`, así que sigue siendo
     compartible. Sin hash a propósito. */
  var pick = document.getElementById("stylePick");
  var prev = document.getElementById("pickPrev");
  var next = document.getElementById("pickNext");
  var copyBtn = document.getElementById("pickCopy");
  var hint = document.getElementById("pickHint");

  /* La URL es la que se copia y la que se abre al mandar a alguien. Se escribe
     con replaceState (y no pushState) para no llenar el historial de cada
     estilo que se mira. En file:// puede estar restringido en algún
     navegador: por eso va envuelta, y si falla el conmutado sigue funcionando. */
  function marcarURL() {
    var q = "?style=" + encodeURIComponent(est.id) + "&theme=" + root.getAttribute("data-theme");
    try { history.replaceState(null, "", location.pathname + q); }
    catch (e) { /* sin historial: el estilo cambia igual, solo no queda en la URL */ }
  }

  /* ‹ › solo entre estilos con skin. Los rótulos se recalculan en cada cambio
     porque dependen de dónde esté el cursor en la lista. */
  function actualizarPaso() {
    if (!prev || !next) return;
    if (vivos.length < 2) {
      prev.disabled = next.disabled = true;
      prev.title = next.title = "Todavía hay un solo estilo con skin";
      return;
    }
    var i = vivos.map(function (e) { return e.id; }).indexOf(est.id);
    if (i < 0) i = 0;
    var atras = vivos[(i - 1 + vivos.length) % vivos.length];
    var adelante = vivos[(i + 1) % vivos.length];
    prev.disabled = next.disabled = false;
    prev.title = "Estilo anterior: " + atras.nombre;
    next.title = "Estilo siguiente: " + adelante.nombre;
    prev.setAttribute("aria-label", "Estilo anterior: " + atras.nombre);
    next.setAttribute("aria-label", "Estilo siguiente: " + adelante.nombre);
    prev.onclick = function () { irA(atras.id); };
    next.onclick = function () { irA(adelante.id); };
  }

  /* ---- 10. Conmutar en vivo: el punto único donde cambia el estilo ----
     Todo lo que depende del estilo pasa por acá, para que no queden partes
     que reacciona a un cambio y partes que no. */
  function irA(id) {
    var nuevo = window.STYLE_get(id);
    if (!nuevo || nuevo.status !== "ready" || id === est.id) return;

    est = nuevo;
    root.setAttribute("data-style", est.id);

    /* El tema NO se arrastra a ciegas: si el estilo nuevo no declara el modo
       que estaba activo, cae a su modo nativo. Sin esto, mirar un estilo en
       claro y saltar a uno nativo oscuro deja la página a medio definir. */
    if (est.modos.indexOf(root.getAttribute("data-theme")) === -1) {
      root.setAttribute("data-theme", est.modo);
    }

    pintarCinta();
    pintarPaleta(est.id);
    pintarTema();
    estadoToggle();
    pintarHint();
    if (pick) pick.value = est.id;
    actualizarPaso();
    leerTokens();
    marcarURL();
  }

  if (pick) {
    Object.keys(window.STYLE_FAMILIAS).forEach(function (clave) {
      var grupo = document.createElement("optgroup");
      grupo.label = window.STYLE_FAMILIAS[clave];
      window.STYLE_ESTILOS.forEach(function (fila) {
        var e = window.STYLE_get(fila[1]);
        if (e.familia !== clave) return;
        var op = document.createElement("option");
        op.value = e.id;
        op.textContent = e.num + " · " + e.nombre + (e.status === "ready" ? "" : " — pendiente");
        op.disabled = e.status !== "ready";
        grupo.appendChild(op);
      });
      if (grupo.childElementCount) pick.appendChild(grupo);
    });
    pick.value = est.id;
    pick.addEventListener("change", function () { irA(pick.value); });
  }

  actualizarPaso();
  if (copyBtn) copyBtn.addEventListener("click", function () { copiar(location.href, "enlace"); });

  /* El pie anuncia el estado actual, así que se repinta: si solo se pintara una
     vez al cargar, diría el tema inicial y quedaría mintiendo en cuanto se
     tocara el toggle. */
  function pintarHint() {
    if (!hint) return;
    hint.textContent = window.STYLE_ESTILOS.length + " estilos declarados · " + vivos.length +
      " con skin construido · " + (window.STYLE_ESTILOS.length - vivos.length) +
      " pendientes (deshabilitados en la lista) · cambia en caliente y deja la URL en ?style= y ?theme=" +
      root.getAttribute("data-theme");
  }
  pintarHint();

  /* ---- 11. Primer pintado ----
     Las hojas se piden al empezar, así que la paleta y la lectura de tokens se
     pintan recién cuando llegaron: si se hicieran de entrada, medirían los
     tokens de la base y no los del skin. */
  pintarCinta();
  pintarPaleta(est.id);
  estadoToggle();
  function alCargar() {
    setTimeout(function () { pintarPaleta(est.id); leerTokens(); }, 30);
  }
  if (document.styleSheets && document.styleSheets.length) alCargar();
  else window.addEventListener("load", alCargar);
})();
