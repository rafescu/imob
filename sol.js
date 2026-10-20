// Posição do sol (fórmulas do SunCalc, de Vladimir Agafonkin) e visualização da exposição solar.
const RAD = Math.PI / 180;
const DIA_MS = 864e5;

function posicaoSol(data, lat, lng) {
  const d = data.valueOf() / DIA_MS - 0.5 + 2440588 - 2451545;
  const e = RAD * 23.4397;
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = RAD * (280.16 + 360.9856235 * d) - RAD * -lng - ra;
  const phi = RAD * lat;
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  return { rumo: (az / RAD + 180 + 360) % 360, altura: alt / RAD }; // rumo: 0 = Norte, 90 = Este
}

const PONTOS_CARDEAIS = ["Norte", "Nordeste", "Este", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
const cardeal = (rumo) => PONTOS_CARDEAIS[Math.round(rumo / 45) % 8];
const hhmm = (d) => d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

function diaComHora(base, horas) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  return new Date(d.valueOf() + horas * 36e5);
}

// Nascer/pôr do sol por amostragem de 5 em 5 minutos (suficiente para o efeito)
function nascerPor(base, lat, lng) {
  let nascer = null, por = null, antes = null;
  for (let m = 0; m <= 1440; m += 5) {
    const t = diaComHora(base, m / 60);
    const acima = posicaoSol(t, lat, lng).altura > -0.833;
    if (antes === false && acima) nascer = t;
    if (antes === true && !acima) por = t;
    antes = acima;
  }
  return { nascer, por };
}

const DATAS_SOL = () => {
  const ano = new Date().getFullYear();
  return { hoje: new Date(), verao: new Date(ano, 5, 21), inverno: new Date(ano, 11, 21) };
};
const estadoSol = { data: "hoje", hora: 15, animar: null };
let marcadorSol = null;

function iniciarCamadasSol() {
  mapa.addSource("sol-trajeto", { type: "geojson", data: vazio() });
  mapa.addLayer({ id: "sol-trajeto", type: "line", source: "sol-trajeto", paint: { "line-color": "#c1aa8b", "line-width": 3, "line-opacity": 0.85 } });
  mapa.addLayer({
    id: "sol-horas", type: "symbol", source: "sol-trajeto", filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "hora"], "text-size": 11, "text-font": ["Noto Sans Regular"], "text-allow-overlap": true },
    paint: { "text-color": "#e2d3bd", "text-halo-color": "#151515", "text-halo-width": 1.5 },
  });
  mapa.addSource("sol-raio", { type: "geojson", data: vazio() });
  mapa.addLayer({ id: "sol-raio", type: "line", source: "sol-raio", paint: { "line-color": "#e0b872", "line-width": 2, "line-dasharray": [1, 1.5] } });
}

// Ponto à distância `m` metros, no rumo indicado
function deslocar([lng, lat], rumo, m) {
  return [lng + (m * Math.sin(rumo * RAD)) / (111320 * Math.cos(lat * RAD)), lat + (m * Math.cos(rumo * RAD)) / 110540];
}

function atualizarSol(i) {
  // Centra no prédio quando já foi identificado no mapa
  const centro = estado.centroPredio || i.coords;
  i = { ...i, coords: centro };
  const [lng, lat] = i.coords;
  const base = DATAS_SOL()[estadoSol.data];
  const { nascer, por } = nascerPor(base, lat, lng);
  // Arco maior nos imóveis com localização aproximada (a câmara fica mais afastada)
  const R = i.aproximada ? Math.max(220, (i.raio || 180) * 0.75) : 70;

  // Trajeto do sol nesse dia: arco à volta do imóvel, com as horas marcadas
  const arco = [], horas = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const p = posicaoSol(diaComHora(base, h), lat, lng);
    if (p.altura < 0) continue;
    const pt = deslocar(i.coords, p.rumo, R);
    arco.push(pt);
    if (Number.isInteger(h) && h % 2 === 0) horas.push({ type: "Feature", properties: { hora: `${h}h` }, geometry: { type: "Point", coordinates: deslocar(i.coords, p.rumo, R * 1.17) } });
  }
  mapa.getSource("sol-trajeto")?.setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: arco } }, ...horas] });

  // Sol à hora escolhida
  const agora = diaComHora(base, estadoSol.hora);
  const p = posicaoSol(agora, lat, lng);
  const deDia = p.altura > 0;
  const ptSol = deslocar(i.coords, p.rumo, R);
  mapa.getSource("sol-raio")?.setData(deDia
    ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [ptSol, i.coords] } }] }
    : vazio());
  if (!marcadorSol) {
    const el = document.createElement("div");
    el.className = "sol-marcador";
    el.textContent = "☀";
    marcadorSol = new maplibregl.Marker({ element: el });
  }
  marcadorSol.setLngLat(ptSol).addTo(mapa);
  marcadorSol.getElement().style.display = deDia ? "" : "none";

  // A luz dos edifícios 3D passa a vir da direção real do sol
  if (mapa.style?._loaded) mapa.setLight(deDia
    ? { anchor: "map", position: [1.5, p.rumo, Math.min(89, 90 - p.altura)], color: "#fff4e0", intensity: 0.45 }
    : { anchor: "map", position: [1.5, 0, 80], color: "#8aa4d6", intensity: 0.15 });

  const horasSol = nascer && por ? (por - nascer) / 36e5 : 0;
  $("#solInfo").innerHTML = deDia
    ? `☀ Às <strong>${hhmm(agora)}</strong> o sol está a <strong>${cardeal(p.rumo)}</strong>, a ${Math.round(p.altura)}° de altura`
    : `🌙 Às <strong>${hhmm(agora)}</strong> já é de noite`;
  $("#solResumo").textContent = nascer && por
    ? `Nasce ${hhmm(nascer)} a ${cardeal(posicaoSol(nascer, lat, lng).rumo)} · Põe-se ${hhmm(por)} a ${cardeal(posicaoSol(por, lat, lng).rumo)} · ${Math.floor(horasSol)}h${String(Math.round((horasSol % 1) * 60)).padStart(2, "0")} de sol`
    : "";
}

function mostrarSol(i) {
  $("#sol").innerHTML = `
    ${i.orientacao ? `<div class="sol-orient">Exposição: <strong>${i.orientacao}</strong></div>` : ""}
    <div class="sol-datas">
      <button data-d="hoje">Hoje</button><button data-d="verao">Verão</button><button data-d="inverno">Inverno</button>
    </div>
    <div class="sol-hora">
      <button class="sol-play" title="Reproduzir o dia">▶</button>
      <input type="range" id="solHora" min="5" max="22" step="0.25" value="${estadoSol.hora}">
    </div>
    <div id="solInfo" class="sol-info"></div>
    <div id="solResumo" class="sol-resumo"></div>`;

  const marcarData = () => $("#sol").querySelectorAll("[data-d]").forEach((b) => b.classList.toggle("ativo", b.dataset.d === estadoSol.data));
  $("#sol").querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { estadoSol.data = b.dataset.d; marcarData(); atualizarSol(i); }));
  marcarData();

  const slider = $("#solHora");
  slider.oninput = () => { pararDiaSol(); estadoSol.hora = +slider.value; atualizarSol(i); };
  $(".sol-play").onclick = () => {
    if (estadoSol.animar) return pararDiaSol();
    $(".sol-play").textContent = "❚❚";
    if (estadoSol.hora >= 21.5) estadoSol.hora = 5;
    estadoSol.animar = setInterval(() => {
      estadoSol.hora += 0.1;
      if (estadoSol.hora > 22) return pararDiaSol();
      slider.value = estadoSol.hora;
      atualizarSol(i);
    }, 60);
  };
  atualizarSol(i);
}

function pararDiaSol() {
  clearInterval(estadoSol.animar);
  estadoSol.animar = null;
  const b = $(".sol-play");
  if (b) b.textContent = "▶";
}

function limparSol() {
  pararDiaSol();
  marcadorSol?.remove();
  mapa.getSource("sol-trajeto")?.setData(vazio());
  mapa.getSource("sol-raio")?.setData(vazio());
  if (mapa.style?._loaded) mapa.setLight({ anchor: "viewport", position: [1.15, 210, 30], color: "#ffffff", intensity: 0.5 });
}
