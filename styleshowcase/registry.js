/* ==========================================================================
   MUESTRARIO DE ESTILOS — registro único (fuente para la UI)
   --------------------------------------------------------------------------
   Este archivo alimenta `index.html` (galería) y
   `_template/specimen.html` (espécimen). Es la versión "para humanos"
   del registro; el espejo para agentes IA es `index.json`.
   Si cambia un estilo se cambian LOS DOS: no hay build a propósito, el
   muestrario se abre con doble clic, sin dependencias ni red.

   Fila de STYLE_ESTILOS (posicional):
   [0] num       orden canónico y prefijo de carpeta ("03" -> "03-glassmorphism")
   [1] id        identificador = atributo [data-style] y parámetro ?style=
   [2] nombre    nombre público del estilo
   [3] familia   clave de STYLE_FAMILIAS
   [4] modo      modo nativo en que fue diseñado ("light" | "dark")
   [5] modos     modos que su style.css implementa ([] = todavía no existe)
   [6] a11y      contraste ("AA" | "AA*" = con excepciones documentadas)
   [7] veredicto "adoptable" | "experimental" | "solo-museo"
   [8] resumen   qué es el estilo en una línea
   ========================================================================== */

window.STYLE_FAMILIAS = {
  "materiales-blandos": "Materiales blandos",
  "ruido-brutal": "Ruido y brutal",
  "retro-digital": "Retro-digital",
  "sistema-razon": "Sistema y razón",
  "materia-impresa": "Materia impresa",
  "ornamento-historia": "Ornamento e historia"
};

window.STYLE_ESTILOS = [
  ["01", "claymorphism", "Claymorphism", "materiales-blandos", "light", ["light", "dark"], "AA*", "experimental",
    "Plastilina: radios enormes, luz interior y cero línea dura."],
  ["02", "neumorphism", "Neumorphism", "materiales-blandos", "light", ["light", "dark"], "AA*", "solo-museo",
    "Relieve tallado en el mismo color del fondo; contraste bajo por diseño."],
  ["03", "glassmorphism", "Glassmorphism", "materiales-blandos", "dark", ["dark", "light"], "AA", "experimental",
    "Vidrio: superficies translúcidas, blur de fondo y un filo de luz arriba."],
  ["04", "ethereal", "Ethereal", "materiales-blandos", "light", ["light", "dark"], "AA", "experimental",
    "Nubes: gradientes suaves, mucho aire y movimiento lentísimo."],
  ["05", "neo-brutalism", "Neo-Brutalism", "ruido-brutal", "light", ["light", "dark"], "AA", "adoptable",
    "Borde negro grueso, radio 0 y sombra dura desplazada."],
  ["06", "cybercore", "Cybercore", "ruido-brutal", "dark", ["dark", "light"], "AA", "solo-museo",
    "Terminal industrial: mono, rejilla y verde sobre negro."],
  ["07", "cyberpunk", "Cyberpunk", "ruido-brutal", "dark", ["dark", "light"], "AA", "solo-museo",
    "Neón magenta/cian, scanlines y densidad de HUD."],
  ["08", "maximalism", "Maximalism", "ruido-brutal", "light", ["light", "dark"], "AA", "experimental",
    "Todo importa: varias tipografías, capas y color saturado."],
  ["09", "y2k-aesthetic", "Y2K Aesthetic", "retro-digital", "light", ["light", "dark"], "AA", "solo-museo",
    "Cromo, burbujas y biseles brillantes de fin de milenio."],
  ["10", "synthwave", "Synthwave", "retro-digital", "dark", [], "AA*", "experimental",
    "Atardecer del 84: magenta y naranja sobre rejilla."],
  ["11", "pixel-art", "Pixel Art", "retro-digital", "dark", ["dark", "light"], "AA", "experimental",
    "Bordes pixelados, sin antialias y paleta limitada."],
  ["12", "swiss", "Swiss Design", "sistema-razon", "light", ["light", "dark"], "AA", "adoptable",
    "Rejilla implacable, sans neutral y un rojo de acento."],
  ["13", "minimalism", "Minimalism", "sistema-razon", "light", [], "AA", "adoptable",
    "Aire, una tipografía, un acento y ninguna sombra."],
  ["14", "bento-grid", "Bento Grid", "sistema-razon", "light", [], "AA", "adoptable",
    "Módulos de distinto peso: la jerarquía la da el tamaño."],
  ["15", "editorial", "Editorial Design", "sistema-razon", "light", [], "AA", "adoptable",
    "Revista: serif alta, capitular y texto a dos columnas."],
  ["16", "scrapbook", "Scrapbook", "materia-impresa", "light", [], "AA", "experimental",
    "Papel recortado, cintas y rotaciones fuera de eje."],
  ["17", "conceptual-sketch", "Conceptual Sketch", "materia-impresa", "light", [], "AA", "experimental",
    "Lápiz y papel: líneas imperfectas y anotaciones."],
  ["18", "bohemian", "Bohemian", "materia-impresa", "light", [], "AA", "experimental",
    "Terracota, textil, arcos y ornamentos vegetales."],
  ["19", "wabi-sabi", "Wabi-Sabi", "materia-impresa", "light", [], "AA", "experimental",
    "Imperfección serena: beige, textura y asimetría."],
  ["20", "victorian", "Victorian", "ornamento-historia", "light", [], "AA", "solo-museo",
    "Ornamento, filetes y serif de contraste alto."],
  ["21", "luxury-typography", "Luxury Typography", "ornamento-historia", "dark", [], "AA", "adoptable",
    "Serif de alta gama, tracking amplio y mucho negro."],
  ["22", "surrealism", "Surrealism", "ornamento-historia", "light", [], "AA", "solo-museo",
    "Colisión de escalas y sombras imposibles."],
  ["23", "corporativo", "Corporativo", "sistema-razon", "light", ["light", "dark"], "AA", "adoptable",
    "Línea de base de producto: tinta azul marino, un solo acento cobre y sombra teñida en dos capas."]
];

/* Paletas por estilo = lo que muestra el bloque "Tokens" del espécimen.
   Es copia exacta de la sección "palette" del style.json de cada estilo:
   son los hex reales del skin, no una interpretación. */
window.STYLE_PALETAS = {
  claymorphism: [
    { grupo: "Superficies", colores: [["Arena", "#e8e0d5"], ["Arcilla", "#efe9e0"], ["Hundido", "#ddd4c7"], ["Luz", "#fffaf2"]] },
    { grupo: "Tinta y acento", colores: [["Tinta", "#3b3226"], ["Secundaria", "#655946"], ["Terracota", "#ad4a15"], ["Arcilla profunda", "#6b2c0b"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#4a8a5c"], ["Aviso", "#b8862a"], ["Crítico", "#c0565a"], ["Neutro", "#a89a86"]] }
  ],
  neumorphism: [
    { grupo: "Superficies", colores: [["Plano", "#e0e5ec"], ["Superficie", "#e0e5ec"], ["Relieve claro", "#ffffff"], ["Relieve sombra", "#a3b1c6"]] },
    { grupo: "Tinta y acento", colores: [["Talla", "#2d3748"], ["Secundaria", "#556070"], ["Terracota", "#a8480f"], ["Terracota texto", "#8a3d0c"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#047857"], ["Aviso", "#b45309"], ["Crítico", "#dc2626"], ["Neutro", "#556070"]] }
  ],
  ethereal: [
    { grupo: "Superficies", colores: [["Cielo", "#f7f6fb"], ["Nube", "#fdfcff"], ["Hundido", "#f2f0f9"], ["Tinta", "#2b2a45"]] },
    { grupo: "Tinta y acento", colores: [["Índigo", "#3a3760"], ["Secundaria", "#6b6885"], ["Periwinkle", "#8f83e0"], ["Lila claro", "#bdb2ee"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#047857"], ["Aviso", "#b45309"], ["Crítico", "#b91c1c"], ["Neutro", "#6b6885"]] }
  ],
  glassmorphism: [
    { grupo: "Superficies", colores: [["Cielo profundo", "#0b1220"], ["Vidrio", "#ffffff1f"], ["Vidrio 2", "#ffffff2e"], ["Filo de luz", "#ffffff38"]] },
    { grupo: "Tinta y acento", colores: [["Tinta", "#f2f7ff"], ["Secundaria", "#c9d7ec"], ["Cielo", "#38bdf8"], ["Violeta", "#a855f7"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#6ee7b7"], ["Aviso", "#fcd34d"], ["Crítico", "#fca5a5"], ["Neutro", "#9fb0c9"]] }
  ],
  "neo-brutalism": [
    { grupo: "Superficies", colores: [["Papel", "#f4f1e8"], ["Nieve", "#ffffff"], ["Hueso", "#e8e2d4"], ["Negro", "#111111"]] },
    { grupo: "Tinta y acento", colores: [["Tinta", "#111111"], ["Secundaria", "#444444"], ["Eléctrico", "#ffe500"], ["Violeta", "#7c3aed"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#2fbf71"], ["Aviso", "#ffb800"], ["Crítico", "#ff4d4d"], ["Neutro", "#c9c4b8"]] }
  ],
cybercore: [
    { grupo: "Superficies", colores: [["Vacío", "#05090a"], ["Panel", "#0b1214"], ["Hondo", "#03070a"], ["Tinta", "#04140d"]] },
    { grupo: "Tinta y acento", colores: [["Fósforo", "#00ff9c"], ["Secundaria", "#93b3a6"], ["Ámbar", "#ffb000"], ["Cian", "#38bdf8"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#4ade80"], ["Aviso", "#ffb000"], ["Crítico", "#ff4d5e"], ["Neutro", "#93b3a6"]] }
  ],
  maximalism: [
    { grupo: "Superficies", colores: [["Papel crema", "#fff6e9"], ["Blanco roto", "#fffdf7"], ["Hundido", "#f7e6cd"], ["Tinta", "#1a1114"]] },
    { grupo: "Tinta y acento", colores: [["Ciruela", "#3b1039"], ["Secundaria", "#6b4f52"], ["Magenta", "#d6006e"], ["Cian", "#00707a"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#0f7a2e"], ["Aviso", "#b45309"], ["Crítico", "#c81e2e"], ["Neutro", "#6b4f52"]] }
  ],
  "y2k-aesthetic": [
    { grupo: "Superficies", colores: [["Azul hielo", "#eaf1f9"], ["Blanco brillo", "#ffffff"], ["Hundido", "#dde8f4"], ["Tinta azul", "#0b1a3d"]] },
    { grupo: "Tinta y acento", colores: [["Azul tinta", "#0b1a3d"], ["Secundaria", "#4c5e84"], ["Bubblegum", "#ff4fa3"], ["Lima", "#7cb518"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#0d803d"], ["Aviso", "#b45309"], ["Crítico", "#c81e2e"], ["Neutro", "#4c5e84"]] }
  ],
  "swiss": [
    { grupo: "Superficies", colores: [["Papel", "#ffffff"], ["Blanco", "#ffffff"], ["Hueso", "#f2f2f2"], ["Tinta", "#0f0f0f"]] },
    { grupo: "Tinta y acento", colores: [["Negro", "#0f0f0f"], ["Secundaria", "#525252"], ["Rojo", "#e1121c"], ["Azul", "#2a6d9e"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#14804a"], ["Aviso", "#b8801a"], ["Crítico", "#c0272d"], ["Neutro", "#737373"]] }
  ],
  "cyberpunk": [
    { grupo: "Superficies", colores: [["Vacío", "#05060a"], ["Panel", "#0b0e1a"], ["Hondo", "#030409"], ["Filete", "#00e5ff40"]] },
    { grupo: "Tinta y acento", colores: [["Blanco azulado", "#f2f6ff"], ["Secundaria", "#93a3bb"], ["Magenta", "#ff2e97"], ["Cian", "#00e5ff"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#5cffc4"], ["Aviso", "#ffd166"], ["Crítico", "#ff5c7a"], ["Neutro", "#7b8aa3"]] }
  ],
  "pixel-art": [
    {
      grupo: "Superficies",
      colores: [
        ["Vacío", "#101018"],
        ["Panel", "#1a1a2b"],
        ["Hondo", "#0b0b14"],
        ["Trama", "#ffffff0a"],
      ],
    },
    {
      grupo: "Tinta y acento",
      colores: [
        ["Fósforo", "#f2f2e8"],
        ["Secundaria", "#a3a3b5"],
        ["Moneda", "#ffd23f"],
        ["Unoarriba", "#41d97e"],
      ],
    },
    {
      grupo: "Semánticos",
      colores: [
        ["Éxito", "#41d97e"],
        ["Aviso", "#ffd23f"],
        ["Crítico", "#ff7a7a"],
        ["Neutro", "#8b8b9e"],
      ],
    },
  ],
  corporativo: [
    { grupo: "Superficies", colores: [["Papel", "#f6f8fa"], ["Blanco", "#ffffff"], ["Hueso", "#f4f6f8"], ["Tinta", "#0f2432"]] },
    { grupo: "Tinta y acento", colores: [["Marino", "#00334e"], ["Secundaria", "#64748b"], ["Cobre", "#c96f2e"], ["Cobre texto", "#96521f"]] },
    { grupo: "Semánticos", colores: [["Éxito", "#047857"], ["Aviso", "#b45309"], ["Crítico", "#dc2626"], ["Neutro", "#64748b"]] }
  ]
};

/* Utilidad compartida por galería y espécimen: fila -> objeto. */
window.STYLE_get = function (id) {
  var fila = window.STYLE_ESTILOS.filter(function (f) { return f[1] === id; })[0];
  if (!fila) return null;
  return {
    num: fila[0], id: fila[1], nombre: fila[2],
    familia: fila[3], familiaNombre: window.STYLE_FAMILIAS[fila[3]] || fila[3],
    modo: fila[4], modos: fila[5], a11y: fila[6], veredicto: fila[7], resumen: fila[8],
    carpeta: fila[0] + "-" + fila[1],
    status: fila[5].length ? "ready" : "planned"
  };
};

window.STYLE_ready = function () {
  return window.STYLE_ESTILOS.map(function (f) { return window.STYLE_get(f[1]); })
    .filter(function (e) { return e.status === "ready"; });
};
