// Localizações marcadas em localizar.html sobrepõem-se às do ficheiro de imóveis
IMOVEIS.forEach((i) => Object.assign(i, window.LOCALIZACOES?.[i.id]));

const TIPOS = ["Todos", ...new Set(IMOVEIS.map((i) => i.tipo))];
const CORES_ENERGIA = { "A+": "#00843d", A: "#1a9b47", B: "#7cb82f", "B-": "#b5cc18", C: "#f1c40f", D: "#f39c12", E: "#e67e22", F: "#d35400" };
const ICONES = {
  Apartamento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M11 21v-3h2v3"/></svg>',
  Moradia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  Terreno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 19l6-8 4 5 3-3 5 6z"/><circle cx="17" cy="6" r="2"/></svg>',
  Loja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9l1-5h14l1 5"/><path d="M4 9h16v11H4z"/><path d="M9 20v-6h6v6"/></svg>',
};

// Ícones das métricas, no mesmo desenho dos cartões do site
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICO_QUARTOS = SVG("M3 17V8m18 9V8M3 12h18v5H3zM6 12V8h5v4m2 0V8h5v4M3 20v-3m18 3v-3");
const ICO_WC = SVG("M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zm2 0V5a2 2 0 0 1 4 0m-4 16v1m14-1v1");
const ICO_AREA = SVG("M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 4v4H4m12-4v4h4M4 16h4v4m12-4h-4v4");
const SETA = SVG("M5 12h14m-6-6 6 6-6 6");
const ICO_LINK = SVG("M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m-2 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1");
const ICO_WHATSAPP = SVG("M3 21l1.6-4.6A8.5 8.5 0 1 1 7.7 19.5zM9 8.5c0 3.5 3 6.5 6.5 6.5l1.5-1.5-2-1-1 1c-1.2-.5-2.5-1.8-3-3l1-1-1-2z");

function metricas(i) {
  const m = [];
  if (i.quartos) m.push(`<span class="metrica" title="Quartos">${ICO_QUARTOS}${i.quartos}</span>`);
  if (i.wc) m.push(`<span class="metrica" title="Casas de banho">${ICO_WC}${i.wc}</span>`);
  const area = i.areaBruta ?? i.areaTerreno;
  if (area) m.push(`<span class="metrica" title="${i.areaBruta ? "Área bruta" : "Área do terreno"}">${ICO_AREA}${fmtNum(area)}<small>m²</small></span>`);
  return m.join("");
}

const estado = { cidade: "todas", finalidade: "Todas", tipo: "Todos", tipologia: "", precoMax: null, ordem: "preco-desc", ativo: null };
const marcadores = new Map();
let rodar = null;

const fmtNum = (v) => v.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
const euro = (v) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const arrendamento = (i) => i.finalidade === "Arrendamento";
const precoTexto = (i) => euro(i.preco) + (arrendamento(i) ? "<small> / mês</small>" : "");
const curto = (i) => arrendamento(i) ? `${fmtNum(i.preco)} €/mês` : i.preco >= 1e6 ? (i.preco / 1e6).toFixed(1) + "M €" : Math.round(i.preco / 1000) + "k €";
const nomeCidade = (id) => CIDADES.find((c) => c.id === id)?.nome || "";
const foto = (id, mini) => `${SITE_AGENCIA}/imagem-imovel.php?id=${id}${mini ? "&size=thumb" : ""}`;
const linkAnuncio = (i) => `${SITE_AGENCIA}/imovel.php?id=${i.id}`;
const $ = (s) => document.querySelector(s);

function limitesDe(lista) {
  const b = new maplibregl.LngLatBounds();
  lista.forEach((i) => b.extend(i.coords));
  return b;
}
// Margem extra à direita para os pins não ficarem atrás dos botões do mapa
const PADDING_VISTA = () => (window.innerWidth > 760 ? { top: 90, bottom: 90, left: 90, right: 200 } : { top: 70, bottom: 190, left: 40, right: 40 });

// ---------- Mapa ----------
const mapa = new maplibregl.Map({
  container: "mapa",
  style: "https://tiles.openfreemap.org/styles/dark",
  bounds: limitesDe(IMOVEIS),
  fitBoundsOptions: { padding: PADDING_VISTA() },
  pitch: 45,
  bearing: -10,
  maxPitch: 80,
  attributionControl: { compact: true },
});
mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
new ResizeObserver(() => mapa.resize()).observe($("#mapa"));

mapa.on("load", () => {
  // Sem relevo do terreno: desalinha os pins dos edifícios 3D e a cidade é pouco acidentada
  mapa.setSky?.({ "sky-color": "#151515", "horizon-color": "#2c2722", "sky-horizon-blend": 0.7 });

  // Tons quentes, alinhados com a paleta do site da JB Partners
  const cor = (l, p, v) => mapa.getLayer(l) && mapa.setPaintProperty(l, p, v);
  cor("background", "background-color", "#151515");
  cor("water", "fill-color", "#1c2124");
  cor("waterway", "line-color", "#232a2e");
  cor("landuse_park", "fill-color", "#1a1d18");
  cor("landcover_wood", "fill-color", "#191c17");
  cor("landuse_residential", "fill-color", "#191918");
  cor("building", "fill-color", "#1f1e1c");
  ["highway_minor", "highway_path"].forEach((l) => cor(l, "line-color", "#2c2b29"));
  ["highway_major_inner", "highway_major_subtle", "highway_motorway_inner", "highway_motorway_subtle"].forEach((l) => cor(l, "line-color", "#3a3835"));
  mapa.getStyle().layers.filter((l) => l.type === "symbol").forEach((l) => {
    cor(l.id, "text-color", "#b4b0a9");
    cor(l.id, "text-halo-color", "#151515");
  });

  // O estilo escuro não traz edifícios 3D: criamo-los a partir dos mesmos dados
  mapa.addLayer({
    id: "building-3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 14,
    paint: {
      "fill-extrusion-color": "#2e2c29",
      "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.95,
    },
  }, "highway_name_other");

  // Vista satélite: OrtoSat 2023 da Direção-Geral do Território (dados abertos, sem custos nem
  // restrições de uso). Escondida por defeito; fica por baixo dos edifícios e das etiquetas.
  mapa.addSource("satelite", {
    type: "raster", tileSize: 256, maxzoom: 19,
    tiles: ["https://ortos.dgterritorio.gov.pt/wms/ortosat2023?service=WMS&request=GetMap&version=1.3.0&layers=ortoSat2023-CorVerdadeira&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/jpeg"],
    bounds: [-9.6, 36.9, -6.1, 42.2], // só existe para Portugal continental
    attribution: "Imagens © <a href=\"https://www.dgterritorio.gov.pt\" target=\"_blank\">DGT</a> OrtoSat 2023",
  });
  mapa.addLayer({ id: "satelite", type: "raster", source: "satelite", layout: { visibility: "none" } }, "building");

  // Prédio do imóvel selecionado: volume próprio + janelas por andar
  mapa.addSource("predio", { type: "geojson", data: vazio() });
  mapa.addSource("janelas", { type: "geojson", data: vazio() });
  mapa.addLayer({
    id: "predio", type: "fill-extrusion", source: "predio",
    paint: { "fill-extrusion-color": "#8a8173", "fill-extrusion-height": ["get", "altura"], "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.97 },
  });
  mapa.addLayer({
    id: "janelas", type: "fill-extrusion", source: "janelas",
    paint: {
      "fill-extrusion-color": ["case", ["get", "acesa"], "#ffd166", "#2b3238"],
      "fill-extrusion-base": ["get", "base"], "fill-extrusion-height": ["get", "topo"],
      "fill-extrusion-vertical-gradient": false,
    },
  });
  // Contorno do prédio no chão: continua a assinalá-lo quando os edifícios 3D estão escondidos
  mapa.addLayer({ id: "predio-contorno", type: "line", source: "predio", paint: { "line-color": "#c1aa8b", "line-width": 3 } });

  iniciarCamadasVizinhanca();
  iniciarCamadasSol();

  // Áreas aproximadas (imóveis cuja morada exata não é divulgada)
  mapa.addSource("aprox", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  mapa.addLayer({ id: "aprox-fill", type: "fill", source: "aprox", paint: { "fill-color": "#c1aa8b", "fill-opacity": 0.12 } });
  mapa.addLayer({ id: "aprox-line", type: "line", source: "aprox", paint: { "line-color": "#c1aa8b", "line-width": 1.5, "line-dasharray": [2, 2] } });

  render();

  // Link direto (?ref=DSTNV326RF): abre logo a ficha desse imóvel
  const ref = new URLSearchParams(location.search).get("ref");
  const alvo = ref && IMOVEIS.find((i) => i.ref === ref || i.id === ref);
  if (alvo) abrirFicha(alvo.id);
});

["mousedown", "touchstart", "wheel"].forEach((ev) => mapa.getCanvasContainer().addEventListener(ev, pararRotacao));

const vazio = () => ({ type: "FeatureCollection", features: [] });

// ---------- Prédio e andar ----------
const ALTURA_PISO = 3;
let pulsar = null;

function dentro([x, y], anel) {
  let d = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
const centroide = (anel) => anel.reduce((s, p) => [s[0] + p[0] / anel.length, s[1] + p[1] / anel.length], [0, 0]);

// Encontra o edifício do OpenStreetMap que contém (ou está mais perto de) o imóvel.
// Na versão real a morada é geocodificada e o prédio é identificado com exatidão.
function encontrarPredio(coords) {
  const l = mapa.getLayer("building-3d");
  const feats = mapa.querySourceFeatures(l.source, { sourceLayer: l.sourceLayer });
  let melhor = null, dist = Infinity;
  for (const f of feats) {
    const poligonos = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of poligonos) {
      const anel = p[0];
      if (dentro(coords, anel)) return { id: f.id, anel };
      const c = centroide(anel);
      const d = Math.hypot((c[0] - coords[0]) * 85000, (c[1] - coords[1]) * 111000);
      if (d < dist) { dist = d; melhor = { id: f.id, anel }; }
    }
  }
  return dist < 80 ? melhor : null;
}

// Gera janelas (pequenos volumes salientes na fachada) para cada piso.
function janelas(anel, pisos, andar) {
  const [lng0, lat0] = centroide(anel);
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110540;
  const m = anel.slice(0, -1).map(([lng, lat]) => [(lng - lng0) * kx, (lat - lat0) * ky]);
  const ll = ([x, y]) => [lng0 + x / kx, lat0 + y / ky];
  const area = m.reduce((s, [x1, y1], i) => { const [x2, y2] = m[(i + 1) % m.length]; return s + x1 * y2 - x2 * y1; }, 0);
  const sentido = area > 0 ? 1 : -1;
  const feats = [];

  m.forEach((a, i) => {
    const b = m[(i + 1) % m.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 2.5) return;
    const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const n = [u[1] * sentido, -u[0] * sentido]; // normal para fora
    const qtd = Math.max(1, Math.floor(len / 3.2));
    for (let k = 0; k < qtd; k++) {
      const c = ((k + 0.5) * len) / qtd;
      const p = (s, o) => ll([a[0] + u[0] * s + n[0] * o, a[1] + u[1] * s + n[1] * o]);
      const rect = [p(c - 0.65, -0.05), p(c + 0.65, -0.05), p(c + 0.65, 0.3), p(c - 0.65, 0.3), p(c - 0.65, -0.05)];
      for (let piso = 0; piso < pisos; piso++) {
        feats.push({
          type: "Feature",
          properties: { base: piso * ALTURA_PISO + 0.9, topo: piso * ALTURA_PISO + 2.3, acesa: piso === andar },
          geometry: { type: "Polygon", coordinates: [rect] },
        });
      }
    }
  });
  return { type: "FeatureCollection", features: feats };
}

function destacarAndar(i) {
  limparPredio();
  if (i.andar == null || i.aproximada) return;
  const predio = encontrarPredio(i.coords);
  if (!predio) return;

  mapa.setFilter("building-3d", ["!=", ["id"], predio.id]);
  mapa.getSource("predio").setData({
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: { altura: i.pisos * ALTURA_PISO + 0.5 }, geometry: { type: "Polygon", coordinates: [predio.anel] } }],
  });
  mapa.getSource("janelas").setData(janelas(predio.anel, i.pisos, i.andar));
  estado.centroPredio = centroide(predio.anel.slice(0, -1));
  atualizarSol(i);
  // O próprio prédio passa a ser o indicador; o pin taparia as janelas
  const pin = marcadores.get(i.id)?.getElement();
  if (pin) pin.style.visibility = "hidden";

  // Brilho a pulsar nas janelas do apartamento
  let t = 0;
  pulsar = setInterval(() => {
    t += 0.15;
    const v = (Math.sin(t) + 1) / 2;
    const cor = `rgb(255,${Math.round(190 + v * 40)},${Math.round(60 + v * 70)})`;
    mapa.setPaintProperty("janelas", "fill-extrusion-color", ["case", ["get", "acesa"], cor, "#2b3238"]);
  }, 60);
}

function limparPredio() {
  clearInterval(pulsar);
  pulsar = null;
  estado.centroPredio = null;
  marcadores.forEach((m) => (m.getElement().style.visibility = ""));
  if (!mapa.getSource("predio")) return;
  mapa.setFilter("building-3d", null);
  mapa.getSource("predio").setData(vazio());
  mapa.getSource("janelas").setData(vazio());
}

const nomeAndar = (a) => (a === 0 ? "Rés-do-chão" : `${a}.º andar`);

// Desenho esquemático do prédio para a ficha
function desenhoPredio(pisos, andar) {
  const h = 26, w = 150, topo = 14, alt = pisos * h;
  let s = `<svg viewBox="0 0 ${w + 90} ${alt + topo + 10}" class="predio-svg" role="img" aria-label="${nomeAndar(andar)} de um prédio com ${pisos} pisos">`;
  s += `<rect x="4" y="${topo}" width="${w}" height="${alt}" rx="3" class="fachada"/><rect x="0" y="${topo - 6}" width="${w + 8}" height="6" rx="2" class="telhado"/>`;
  for (let p = 0; p < pisos; p++) {
    const y = topo + alt - (p + 1) * h;
    const acesa = p === andar;
    if (acesa) s += `<rect x="4" y="${y}" width="${w}" height="${h}" class="piso-ativo"/>`;
    for (let k = 0; k < 4; k++) s += `<rect x="${16 + k * 34}" y="${y + 7}" width="22" height="13" rx="2" class="${acesa ? "jan-acesa" : "jan"}"/>`;
    s += `<text x="${w + 14}" y="${y + 17}" class="${acesa ? "lbl-ativo" : "lbl"}">${p === 0 ? "R/C" : p + ".º"}${acesa ? " ◀" : ""}</text>`;
  }
  return s + "</svg>";
}

function circulo([lng, lat], metros, passos = 48) {
  const pts = [];
  for (let i = 0; i <= passos; i++) {
    const a = (i / passos) * 2 * Math.PI;
    const dx = (metros * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const dy = (metros * Math.sin(a)) / 110540;
    pts.push([lng + dx, lat + dy]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] } };
}

// ---------- Filtros ----------
// O preço máximo aplica-se à finalidade escolhida (com "Todas", só às vendas)
const escalaPreco = () => {
  const arr = estado.finalidade === "Arrendamento";
  const precos = IMOVEIS.filter((i) => arrendamento(i) === arr).map((i) => i.preco);
  const max = Math.max(...precos, arr ? 1000 : 100000);
  const passo = arr ? 50 : 5000;
  return { min: passo, max: Math.ceil(max / passo) * passo, passo, arr };
};

function filtrados() {
  const lista = IMOVEIS.filter((i) =>
    (estado.cidade === "todas" || i.cidade === estado.cidade) &&
    (estado.finalidade === "Todas" || i.finalidade === estado.finalidade) &&
    (estado.tipo === "Todos" || i.tipo === estado.tipo) &&
    (!estado.tipologia || i.tipologia === estado.tipologia) &&
    (estado.precoMax == null || arrendamento(i) !== escalaPreco().arr || i.preco <= estado.precoMax)
  );
  const [campo, dir] = estado.ordem.split("-");
  const valor = (i) => (campo === "area" ? i.areaUtil ?? i.areaTerreno ?? 0 : i.preco);
  return lista.sort((a, b) => (dir === "asc" ? valor(a) - valor(b) : valor(b) - valor(a)));
}

function enquadrar(lista = filtrados()) {
  if (!lista.length) return;
  if (lista.length === 1) return mapa.flyTo({ center: lista[0].coords, zoom: 15, pitch: 55, duration: 2000 });
  mapa.fitBounds(limitesDe(lista), { padding: PADDING_VISTA(), pitch: 45, bearing: -10, duration: 2000, maxZoom: 15 });
}

function iniciarFiltros() {
  const sel = $("#cidade");
  const comImoveis = CIDADES.filter((c) => IMOVEIS.some((i) => i.cidade === c.id));
  sel.innerHTML = `<option value="todas">Todas as localidades</option>` + comImoveis.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  sel.onchange = () => {
    estado.cidade = sel.value;
    fecharFicha();
    enquadrar();
  };

  $("#finalidade").onchange = (e) => {
    estado.finalidade = e.target.value;
    estado.precoMax = null;
    configurarPreco();
    fecharFicha();
    enquadrar();
  };

  $("#tipos").innerHTML = TIPOS.map((t) => `<button class="chip${t === "Todos" ? " ativo" : ""}" data-t="${t}">${t}</button>`).join("");
  $("#tipos").onclick = (e) => {
    const t = e.target.dataset.t;
    if (!t) return;
    estado.tipo = t;
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("ativo", c.dataset.t === t));
    render();
  };

  $("#tipologia").onchange = (e) => { estado.tipologia = e.target.value; render(); };
  $("#ordem").onchange = (e) => { estado.ordem = e.target.value; render(); };
  $("#precoMax").oninput = (e) => {
    const { max } = escalaPreco();
    estado.precoMax = +e.target.value >= max ? null : +e.target.value;
    rotuloPreco();
    render();
  };
  configurarPreco();

  $("#toggle3d").onclick = () => {
    const em3d = mapa.getPitch() > 10;
    mapa.easeTo({ pitch: em3d ? 0 : 60, bearing: em3d ? 0 : -20, duration: 800 });
    $("#toggle3d").textContent = em3d ? "3D" : "2D";
  };
  $("#toggleEdif").onclick = () => {
    const mostrar = mapa.getLayoutProperty("building-3d", "visibility") === "none";
    ["building-3d", "predio", "janelas"].forEach((l) => mapa.setLayoutProperty(l, "visibility", mostrar ? "visible" : "none"));
    $("#toggleEdif").classList.toggle("ativo", !mostrar);
    $("#toggleEdif").textContent = mostrar ? "Esconder edifícios" : "Mostrar edifícios";
  };
  $("#toggleSat").onclick = () => {
    const sat = mapa.getLayoutProperty("satelite", "visibility") !== "visible";
    mapa.setLayoutProperty("satelite", "visibility", sat ? "visible" : "none");
    mapa.setLayoutProperty("building", "visibility", sat ? "none" : "visible");
    mapa.setPaintProperty("building-3d", "fill-extrusion-opacity", sat ? 0.55 : 0.95);
    $("#toggleSat").classList.toggle("ativo", sat);
    $("#toggleSat").textContent = sat ? "Mapa" : "Satélite";
  };
  $("#mostrarLista").onclick = () => $(".sidebar").classList.toggle("aberta");
}

function configurarPreco() {
  const { min, max, passo, arr } = escalaPreco();
  const r = $("#precoMax");
  Object.assign(r, { min, max, step: passo });
  r.value = estado.precoMax ?? max;
  $("#precoTitulo").textContent = arr ? "Renda máxima" : "Preço máximo";
  rotuloPreco();
}
function rotuloPreco() {
  const arr = escalaPreco().arr;
  $("#precoMaxLabel").textContent = estado.precoMax == null ? "Sem limite" : euro(estado.precoMax) + (arr ? " / mês" : "");
}

// ---------- Render ----------
function render() {
  const lista = filtrados();
  $("#contagem").textContent = `${lista.length} imóve${lista.length === 1 ? "l" : "is"}`;

  $("#lista").innerHTML = lista.length ? lista.map((i) => `
    <li class="cartao${estado.ativo === i.id ? " ativo" : ""}" data-id="${i.id}">
      <div class="thumb tipo-${i.tipo}" style="background-image:url('${foto(i.fotos[0], true)}')"><span class="badge">${i.finalidade}</span>${i.videos?.length ? `<span class="tem-video" title="Tem vídeo">▶</span>` : ""}</div>
      <div class="cartao-corpo">
        <h3>${i.titulo}</h3>
        <p class="local">${i.zona}</p>
        <div class="metricas">${metricas(i)}</div>
        <div class="cartao-rodape">
          <span class="preco">${precoTexto(i)}</span>
          <span class="abrir" aria-hidden="true">${SETA}</span>
        </div>
      </div>
    </li>`).join("") : `<li class="vazio">Nenhum imóvel corresponde aos filtros.</li>`;

  document.querySelectorAll(".cartao").forEach((el) => {
    el.onclick = () => abrirFicha(el.dataset.id);
    el.onmouseenter = () => marcadores.get(el.dataset.id)?.getElement().classList.add("ativo");
    el.onmouseleave = () => el.dataset.id !== estado.ativo && marcadores.get(el.dataset.id)?.getElement().classList.remove("ativo");
  });

  // Pins
  marcadores.forEach((m) => m.remove());
  marcadores.clear();
  lista.forEach((i) => {
    const el = document.createElement("div");
    el.className = `pin${i.aproximada ? " aprox" : ""}${estado.ativo === i.id ? " ativo" : ""}`;
    el.textContent = curto(i);
    el.onclick = (e) => { e.stopPropagation(); abrirFicha(i.id); };
    marcadores.set(i.id, new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(i.coords).addTo(mapa));
  });

  mapa.getSource("aprox")?.setData({
    type: "FeatureCollection",
    features: lista.filter((i) => i.aproximada).map((i) => circulo(i.coords, i.raio || 180)),
  });
}

// ---------- Ficha ----------
function abrirFicha(id) {
  const i = IMOVEIS.find((x) => x.id === id);
  estado.ativo = id;
  const factos = [
    ["Tipo", i.tipo],
    ["Tipologia", i.tipologia],
    ["Área útil", i.areaUtil && `${fmtNum(i.areaUtil)} m²`],
    ["Área bruta", i.areaBruta && `${fmtNum(i.areaBruta)} m²`],
    ["Área do terreno", i.areaTerreno && `${fmtNum(i.areaTerreno)} m²`],
    ["Quartos", i.quartos],
    ["Casas de banho", i.wc],
    ["Ano", i.ano],
  ].filter(([, v]) => v);
  const energia = i.energia
    ? `<div class="energia-linha"><span>Certificado energético</span><span class="energia" style="background:${CORES_ENERGIA[i.energia] || "#888"}">${i.energia}</span></div>`
    : "";

  const media = midiasDe(i);
  $("#ficha").innerHTML = `
    <div class="galeria tipo-${i.tipo}">
      <div class="galeria-faixa">${media.map((m, n) => slideMidia(i, m, n)).join("")}</div>
      ${media.length > 1 ? `<button class="galeria-seta ant" aria-label="Anterior">${SETA}</button><button class="galeria-seta seg" aria-label="Seguinte">${SETA}</button>` : ""}
      <button class="fechar" aria-label="Fechar">×</button>
      <span class="badge">${i.finalidade}</span>
      ${i.videos?.length ? `<button class="galeria-video" aria-label="Ver vídeo">▶ Vídeo</button>` : ""}
      <span class="ref"><span id="galeriaN">1</span> / ${media.length}${i.totalFotos > i.fotos.length ? ` · <a href="${linkAnuncio(i)}" target="_blank" rel="noopener">ver as ${i.totalFotos} fotos</a>` : ""}</span>
    </div>
    <div class="corpo">
      <h2>${i.titulo}</h2>
      <div class="zona">${i.zona}</div>
      <div class="preco-grande">${precoTexto(i)}</div>
      <div class="metricas">${metricas(i)}</div>
      <div class="acoes">
        <button class="acao acao-destaque" id="btnApresentar">▶ Apresentar</button>
        <button class="acao" id="btnWhatsapp">${ICO_WHATSAPP} WhatsApp</button>
        <button class="acao" id="btnCopiar">${ICO_LINK} Copiar link</button>
      </div>
      <div class="grelha">${factos.map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join("")}</div>
      ${energia}
      <div class="ref-linha">Referência <strong>${i.ref}</strong></div>
      ${i.andar != null ? `
        <h4>Localização no prédio</h4>
        <div class="no-predio">
          ${desenhoPredio(i.pisos, i.andar)}
          <div><strong>${nomeAndar(i.andar)}</strong><br><span>Prédio com ${i.pisos} pisos</span>
          ${i.aproximada ? "" : `<br><button class="ver-predio">Ver no mapa</button>`}</div>
        </div>` : ""}
      <h4>Exposição solar</h4>
      <div id="sol"></div>
      <h4>Na vizinhança</h4>
      <div id="vizinhanca"></div>
      <h4>Vista de rua</h4>
      <div id="rua"></div>
      <h4>Descrição</h4>
      <p>${i.descricao}</p>
      <h4>Características</h4>
      <div class="tags">${i.caracteristicas.map((c) => `<span>${c}</span>`).join("")}</div>
      ${i.aproximada ? `<div class="aviso">📍 Localização aproximada. A morada exata é indicada pela JB Partners no contacto.</div>` : ""}
      <h4>O seu consultor</h4>
      <div class="consultor">
        <div class="consultor-avatar">${i.consultor.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
        <div><strong>${i.consultor.nome}</strong><span>Consultor imobiliário · ${i.consultor.tel}</span></div>
      </div>
      <a class="anuncio" href="${linkAnuncio(i)}" target="_blank" rel="noopener">Ver anúncio completo ${SETA}</a>
      <div class="contacto">
        <a class="btn-gold" href="tel:${i.consultor.tel.replace(/\s/g, "")}">Ligar</a>
        <a class="btn-linha" href="${linkAnuncio(i)}" target="_blank" rel="noopener">Pedir informações</a>
      </div>
    </div>`;
  $("#ficha").classList.add("aberta");
  $("#ficha").setAttribute("aria-hidden", "false");
  $("#ficha .fechar").onclick = fecharFicha;
  ligarGaleria();
  $(".sidebar").classList.remove("aberta");

  render();
  voarPara(i);
  mostrarSol(i);
  mostrarVizinhanca(i);
  mostrarRua(i);
  $("#ficha .ver-predio")?.addEventListener("click", () => voarPara(i));
  $("#btnApresentar").onclick = () => iniciarApresentacao(i);
  $("#btnWhatsapp").onclick = () => partilharWhatsapp(i);
  $("#btnCopiar").onclick = () => copiarLink(i);
  definirUrl(i);
}

// ---------- Partilha ----------
// O link aponta para partilha/<ref>.html (gerado por scripts/gerar-partilhas.mjs), que tem a
// fotografia e o preço para a pré-visualização do WhatsApp e reencaminha para o mapa.
const linkPartilha = (i) => new URL(`partilha/${encodeURIComponent(i.ref)}.html`, location.href).href;
const textoPartilha = (i) => `${i.titulo} · ${euro(i.preco)}${arrendamento(i) ? "/mês" : ""} · ${i.zona}`;

function definirUrl(i) {
  const u = new URL(location.href);
  if (i) u.searchParams.set("ref", i.ref); else u.searchParams.delete("ref");
  history.replaceState(null, "", u);
}

function partilharWhatsapp(i) {
  const texto = `${textoPartilha(i)}\n${linkPartilha(i)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}

async function copiarLink(i) {
  try {
    await navigator.clipboard.writeText(linkPartilha(i));
    aviso("Link copiado");
  } catch {
    prompt("Copie o link:", linkPartilha(i));
  }
}

function aviso(texto) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ---------- Galeria: fotografias e vídeos ----------
// Ordem: capa, depois os vídeos, depois as restantes fotografias
function midiasDe(i) {
  const fotos = i.fotos.map((f) => ({ foto: f }));
  return [fotos[0], ...(i.videos || []).map((v) => ({ video: v })), ...fotos.slice(1)].filter(Boolean);
}

function slideMidia(i, m, n) {
  if (m.foto) return `<img src="${foto(m.foto)}" alt="${i.titulo} — fotografia ${n + 1}" loading="${n ? "lazy" : "eager"}">`;
  const v = m.video;
  const capa = foto(i.fotos[0]);
  if (v.youtube) {
    // Só carrega o leitor do YouTube quando a pessoa carrega no play
    return `<div class="slide-video" data-youtube="${encodeURIComponent(v.youtube)}" style="background-image:url('https://i.ytimg.com/vi/${encodeURIComponent(v.youtube)}/hqdefault.jpg')">
      <button class="video-play" aria-label="Reproduzir vídeo">▶</button></div>`;
  }
  const src = v.id ? `${SITE_AGENCIA}/video-imovel.php?id=${encodeURIComponent(v.id)}` : v.url;
  return `<div class="slide-video${v.vertical ? " vertical" : ""}" style="--capa:url('${capa}')">
    <video controls playsinline preload="metadata" poster="${capa}" src="${src}" aria-label="Vídeo de ${i.titulo}"></video></div>`;
}

function ligarGaleria() {
  const faixa = $("#ficha .galeria-faixa");
  if (!faixa) return;
  const mover = (d) => faixa.scrollBy({ left: d * faixa.clientWidth, behavior: "smooth" });
  $("#ficha .galeria-seta.ant")?.addEventListener("click", () => mover(-1));
  $("#ficha .galeria-seta.seg")?.addEventListener("click", () => mover(1));
  faixa.addEventListener("scroll", () => {
    $("#galeriaN").textContent = Math.round(faixa.scrollLeft / faixa.clientWidth) + 1;
    // Ao passar para outro slide, o vídeo pára
    faixa.querySelectorAll("video").forEach((v) => {
      const r = v.getBoundingClientRect(), f = faixa.getBoundingClientRect();
      if (Math.abs(r.left - f.left) > f.width / 2) v.pause();
    });
  });
  // Botão "▶ Vídeo": salta para o primeiro vídeo e começa a reproduzir
  $("#ficha .galeria-video")?.addEventListener("click", () => {
    const slide = faixa.querySelector(".slide-video");
    faixa.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    // Só começa quando o deslize termina, senão a regra de pausa acima interrompe-o
    setTimeout(() => {
      slide.querySelector("video")?.play().catch(() => {});
      slide.querySelector(".video-play")?.click();
    }, 600);
  });
  faixa.querySelectorAll("[data-youtube] .video-play").forEach((b) => (b.onclick = () => {
    const s = b.parentElement;
    s.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${s.dataset.youtube}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Vídeo do imóvel"></iframe>`;
  }));
}

function voarPara(i) {
  pararRotacao();
  limparPredio();
  const desktop = window.innerWidth > 760;
  const temAndar = i.andar != null && !i.aproximada;
  mapa.flyTo({
    // Localização aproximada: vista mais afastada, que mostra a zona inteira
    center: i.coords, zoom: temAndar ? 18.8 : i.aproximada ? 16.3 : 18.3, pitch: temAndar ? 68 : i.aproximada ? 55 : 65, bearing: mapa.getBearing() - 40, duration: 2200,
    padding: desktop ? { right: 420 } : { bottom: window.innerHeight * 0.6 },
  });
  mapa.once("moveend", () => {
    if (estado.ativo !== i.id) return;
    // Os mosaicos do edifício só existem depois de a câmara chegar
    mapa.once("idle", () => estado.ativo === i.id && destacarAndar(i));
    iniciarRotacao();
  });
}

function fecharFicha() {
  estado.ativo = null;
  $("#ficha").classList.remove("aberta");
  $("#ficha").setAttribute("aria-hidden", "true");
  pararRotacao();
  limparPredio();
  limparSol();
  limparVizinhanca();
  pararApresentacao();
  definirUrl(null);
  render();
}

// Volta lenta à volta do imóvel selecionado
function iniciarRotacao() {
  if (!estado.ativo) return;
  const passo = () => {
    mapa.setBearing(mapa.getBearing() + 0.08);
    rodar = requestAnimationFrame(passo);
  };
  rodar = requestAnimationFrame(passo);
}
function pararRotacao() {
  if (rodar) cancelAnimationFrame(rodar);
  rodar = null;
}

mapa.on("click", (e) => {
  // Clique num serviço ou no prédio destacado: mantém a ficha aberta
  if (mapa.queryRenderedFeatures(e.point, { layers: ["poi", "predio", "janelas"] }).length) return;

  // Clique num edifício que tem um imóvel à venda: abre a ficha desse imóvel
  const edificio = mapa.queryRenderedFeatures(e.point, { layers: ["building-3d"] })[0];
  if (edificio) {
    const imovel = filtrados().find((i) => !i.aproximada && encontrarPredio(i.coords)?.id === edificio.id);
    if (imovel) return abrirFicha(imovel.id);
  }

  if (estado.ativo) fecharFicha();
});
iniciarFiltros();
render();
