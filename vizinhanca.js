// Serviços e transportes perto do imóvel, a partir do OpenStreetMap (Overpass API).
const CATEGORIAS = {
  mercado: { nome: "Supermercado", cor: "#16a34a", icone: "🛒" },
  farmacia: { nome: "Farmácia", cor: "#dc2626", icone: "💊" },
  escola: { nome: "Escola / creche", cor: "#2563eb", icone: "🎓" },
  saude: { nome: "Saúde", cor: "#db2777", icone: "🏥" },
  autocarro: { nome: "Paragem de autocarro", cor: "#7c3aed", icone: "🚌" },
  comboio: { nome: "Estação de comboio", cor: "#4c1d95", icone: "🚆" },
  lazer: { nome: "Parque / desporto", cor: "#0d9488", icone: "🌳" },
  cafe: { nome: "Café / restaurante", cor: "#ea580c", icone: "☕" },
};
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const cacheVizinhanca = new Map();
const MIN_A_PE = 80; // metros por minuto

function categoriaDe(t) {
  if (["supermarket", "convenience", "greengrocer"].includes(t.shop)) return "mercado";
  if (t.amenity === "pharmacy") return "farmacia";
  if (["school", "kindergarten", "college", "university"].includes(t.amenity)) return "escola";
  if (["hospital", "clinic", "doctors"].includes(t.amenity)) return "saude";
  if (t.highway === "bus_stop" || t.amenity === "bus_station") return "autocarro";
  if (t.railway === "station" || t.railway === "halt") return "comboio";
  if (["park", "playground", "sports_centre", "fitness_centre", "pitch"].includes(t.leisure)) return "lazer";
  if (["cafe", "restaurant"].includes(t.amenity)) return "cafe";
  return null;
}

function distancia([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

const textoDistancia = (d) =>
  d < 1500 ? `${Math.round(d / 10) * 10} m · ${Math.max(1, Math.round(d / MIN_A_PE))} min a pé`
           : `${(d / 1000).toFixed(1).replace(".", ",")} km · ${Math.max(2, Math.round(d / 500))} min de carro`;

// Consulta Overpass usada aqui e no script scripts/gerar-vizinhanca.mjs
function consultaOverpass([lng, lat]) {
  const p = `(around:1200,${lat},${lng})`;
  return `[out:json][timeout:60];(
    nwr${p}[shop~"^(supermarket|convenience|greengrocer)$"];
    nwr${p}[amenity~"^(pharmacy|school|kindergarten|college|university|hospital|clinic|doctors|cafe|restaurant|bus_station)$"];
    node${p}[highway=bus_stop];
    nwr${p}[leisure~"^(park|playground|sports_centre|fitness_centre)$"];
    nwr(around:8000,${lat},${lng})[railway~"^(station|halt)$"][!subway];
  );out center tags;`;
}

async function carregarVizinhanca(i) {
  if (cacheVizinhanca.has(i.id)) return cacheVizinhanca.get(i.id);
  // Dados pré-calculados (data/vizinhanca.js): instantâneo e sem depender do Overpass
  // (só serve se foi calculado para as coordenadas atuais do imóvel)
  const pre = window.VIZINHANCA?.[i.id];
  if (pre?.coords?.join() === i.coords.join()) return processarVizinhanca(i, pre.elementos);
  if (Array.isArray(pre) && !window.LOCALIZACOES?.[i.id]) return processarVizinhanca(i, pre); // formato antigo, sem coordenadas

  // Recurso: imóvel ainda sem dados pré-calculados → pergunta ao Overpass em direto
  let dados = null;
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(consultaOverpass(i.coords)) });
      if (r.ok) { dados = await r.json(); break; }
    } catch { /* tenta o próximo servidor */ }
  }
  if (!dados) throw new Error("Overpass indisponível");
  return processarVizinhanca(i, dados.elements);
}

function processarVizinhanca(i, elementos) {
  const vistos = new Set();
  const pontos = elementos
    .map((e) => {
      const t = e.tags || {};
      const cat = categoriaDe(t);
      const coords = e.type === "node" ? [e.lon, e.lat] : e.center && [e.center.lon, e.center.lat];
      if (!cat || !coords) return null;
      const nome = t.name || CATEGORIAS[cat].nome;
      const chave = cat + nome + coords.map((c) => c.toFixed(3)).join();
      if (vistos.has(chave)) return null; // ex.: paragens dos dois sentidos
      vistos.add(chave);
      return { cat, nome, coords, dist: distancia(i.coords, coords) };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist);

  cacheVizinhanca.set(i.id, pontos);
  return pontos;
}

function iniciarCamadasVizinhanca() {
  mapa.addSource("raio-pe", { type: "geojson", data: vazio() });
  mapa.addLayer({ id: "raio-pe", type: "line", source: "raio-pe", paint: { "line-color": "#c1aa8b", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": 0.7 } });
  mapa.addSource("poi", { type: "geojson", data: vazio() });
  mapa.addLayer({
    id: "poi", type: "circle", source: "poi",
    paint: {
      "circle-radius": ["case", ["get", "destaque"], 9, 6],
      "circle-color": ["get", "cor"],
      "circle-stroke-color": "#151515", "circle-stroke-width": 2,
      "circle-opacity": ["case", ["get", "apagado"], 0.25, 1],
      "circle-stroke-opacity": ["case", ["get", "apagado"], 0.25, 1],
    },
  });

  const popup = new maplibregl.Popup({ closeButton: false, offset: 10, className: "popup-poi" });
  mapa.on("mouseenter", "poi", (e) => {
    const f = e.features[0];
    mapa.getCanvas().style.cursor = "pointer";
    popup.setLngLat(f.geometry.coordinates).setHTML(`${CATEGORIAS[f.properties.cat].icone} <strong>${f.properties.nome}</strong><br>${textoDistancia(f.properties.dist)}`).addTo(mapa);
  });
  mapa.on("mouseleave", "poi", () => { mapa.getCanvas().style.cursor = ""; popup.remove(); });
}

function desenharPois(pontos, cat = null) {
  mapa.getSource("poi")?.setData({
    type: "FeatureCollection",
    features: pontos.filter((p) => p.dist <= 1200 || p.cat === "comboio").map((p) => ({
      type: "Feature",
      properties: { cat: p.cat, nome: p.nome, dist: p.dist, cor: CATEGORIAS[p.cat].cor, destaque: p.cat === cat, apagado: !!cat && p.cat !== cat },
      geometry: { type: "Point", coordinates: p.coords },
    })),
  });
}

async function mostrarVizinhanca(i) {
  const caixa = $("#vizinhanca");
  caixa.innerHTML = `<div class="a-carregar">A procurar serviços próximos…</div>`;
  mapa.getSource("raio-pe")?.setData({ type: "FeatureCollection", features: [circulo(i.coords, 800)] });

  let pontos;
  try {
    pontos = await carregarVizinhanca(i);
  } catch {
    caixa.innerHTML = `<div class="a-carregar">Não foi possível carregar os serviços próximos.</div>`;
    return;
  }
  if (estado.ativo !== i.id) return;

  desenharPois(pontos);
  const linhas = Object.entries(CATEGORIAS).map(([cat, c]) => {
    const daCat = pontos.filter((p) => p.cat === cat);
    if (!daCat.length) return "";
    const perto = daCat[0];
    const num = daCat.filter((p) => p.dist <= 1000).length;
    return `<button class="viz" data-cat="${cat}">
      <span class="viz-icone" style="background:${c.cor}22">${c.icone}</span>
      <span class="viz-txt"><strong>${perto.nome}</strong><small>${textoDistancia(perto.dist)}</small></span>
      <span class="viz-num" title="Até 1 km">${num > 1 ? `+${num - 1}` : ""}</span>
    </button>`;
  }).join("");
  caixa.innerHTML = `<p class="viz-legenda">Círculo tracejado no mapa = 10 min a pé (800 m)</p>${linhas || "<p>Sem dados para esta zona.</p>"}`;

  caixa.querySelectorAll(".viz").forEach((b) => {
    b.onclick = () => {
      const cat = b.dataset.cat;
      const ativo = b.classList.toggle("ativo");
      caixa.querySelectorAll(".viz").forEach((o) => o !== b && o.classList.remove("ativo"));
      desenharPois(pontos, ativo ? cat : null);
      if (!ativo) return;
      pararRotacao();
      const alvo = pontos.find((p) => p.cat === cat);
      const lim = new maplibregl.LngLatBounds(i.coords, i.coords).extend(alvo.coords);
      mapa.fitBounds(lim, { padding: window.innerWidth > 760 ? { top: 80, bottom: 80, left: 80, right: 480 } : { top: 60, bottom: window.innerHeight * 0.6, left: 40, right: 40 }, maxZoom: 17, pitch: 50, duration: 1200 });
    };
  });
}

function limparVizinhanca() {
  mapa.getSource("poi")?.setData(vazio());
  mapa.getSource("raio-pe")?.setData(vazio());
}
