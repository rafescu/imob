// Modo apresentação: sequência automática de câmara + fotografias, em ecrã inteiro.
// Pensado para mostrar um imóvel a um proprietário ou comprador num tablet.
let sessaoApresentacao = 0;
let rodarApresentacao = null;
let trocarFotos = null;

const esperarMs = (ms) => new Promise((r) => setTimeout(r, ms));
function voarEsperar(opcoes) {
  return new Promise((r) => { mapa.once("moveend", r); mapa.flyTo(opcoes); });
}

// Volta completa à volta do imóvel; o sol percorre o dia ao mesmo tempo
function orbitar(i, segundos, sessao) {
  return new Promise((r) => {
    const inicio = performance.now();
    const rumo0 = mapa.getBearing();
    const passo = (t) => {
      if (sessao !== sessaoApresentacao) return r();
      const p = Math.min(1, (t - inicio) / (segundos * 1000));
      mapa.setBearing(rumo0 + 360 * p);
      estadoSol.hora = 7 + 13.5 * p;
      atualizarSol(i);
      if (p < 1) rodarApresentacao = requestAnimationFrame(passo); else r();
    };
    rodarApresentacao = requestAnimationFrame(passo);
  });
}

async function iniciarApresentacao(i) {
  const sessao = ++sessaoApresentacao;
  pararRotacao();
  document.body.classList.add("apresentando");
  document.documentElement.requestFullscreen?.().catch(() => {});
  mapa.resize();

  // Cartão com fotografias, preço e contacto
  const cartao = document.createElement("div");
  cartao.className = "apr-cartao";
  cartao.innerHTML = `
    <div class="apr-fotos">${i.fotos.map((f, n) => `<img src="${foto(f)}" alt="" class="${n ? "" : "visivel"}">`).join("")}</div>
    <div class="apr-info">
      <span class="badge apr-badge">${i.finalidade}</span>
      <h2>${i.titulo}</h2>
      <p>${i.zona}</p>
      <div class="apr-preco">${precoTexto(i)}</div>
      <div class="metricas">${metricas(i)}</div>
      <div class="apr-consultor">${i.consultor.nome} · ${i.consultor.tel}</div>
    </div>
    <div class="apr-progresso"><span></span></div>`;
  const sair = document.createElement("button");
  sair.className = "apr-sair";
  sair.textContent = "✕ Sair da apresentação";
  sair.onclick = () => pararApresentacao(true);
  const legenda = document.createElement("div");
  legenda.className = "apr-legenda";
  document.body.append(cartao, sair, legenda);

  let n = 0;
  const imgs = cartao.querySelectorAll(".apr-fotos img");
  trocarFotos = setInterval(() => {
    imgs[n].classList.remove("visivel");
    n = (n + 1) % imgs.length;
    imgs[n].classList.add("visivel");
  }, 4500);

  const temAndar = i.andar != null && !i.aproximada;
  // No telemóvel o cartão ocupa a parte de baixo: a câmara centra-se no espaço que sobra
  const margemBaixo = window.innerWidth > 760 ? 0 : cartao.offsetHeight + 12;
  const perto = { center: i.coords, zoom: temAndar ? 18.6 : i.aproximada ? 16.2 : 18, pitch: temAndar ? 68 : 60, padding: { left: 0, right: 0, top: 0, bottom: margemBaixo } };
  const legendar = (t) => { legenda.textContent = t; legenda.classList.toggle("visivel", !!t); };
  const progresso = (p) => (cartao.querySelector(".apr-progresso span").style.width = `${p * 100}%`);

  // Ciclo: vista da região → aproximação → volta de 360° com o sol a percorrer o dia
  while (sessao === sessaoApresentacao) {
    progresso(0);
    legendar(nomeCidade(i.cidade));
    await voarEsperar({ center: i.coords, zoom: 12.5, pitch: 35, bearing: -10, duration: 3000, padding: perto.padding });
    if (sessao !== sessaoApresentacao) break;
    await esperarMs(1200);
    progresso(0.15);
    legendar(i.aproximada ? `${i.zona} · zona aproximada` : i.zona);
    await voarEsperar({ ...perto, bearing: mapa.getBearing() + 60, duration: 5000, curve: 1.6 });
    if (sessao !== sessaoApresentacao) break;
    if (temAndar) { destacarAndar(i); legendar(`${nomeAndar(i.andar)} · prédio com ${i.pisos} pisos`); }
    await esperarMs(1500);
    progresso(0.35);
    legendar("O percurso do sol ao longo do dia");
    await orbitar(i, 26, sessao);
    progresso(1);
    legendar("");
    await esperarMs(1500);
  }
}

function pararApresentacao(voltar) {
  if (!document.body.classList.contains("apresentando")) return;
  sessaoApresentacao++;
  cancelAnimationFrame(rodarApresentacao);
  clearInterval(trocarFotos);
  document.querySelectorAll(".apr-cartao, .apr-sair, .apr-legenda").forEach((e) => e.remove());
  document.body.classList.remove("apresentando");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  mapa.resize();
  const i = IMOVEIS.find((x) => x.id === estado.ativo);
  if (voltar && i) { estadoSol.hora = 15; atualizarSol(i); voarPara(i); }
}

document.addEventListener("keydown", (e) => e.key === "Escape" && pararApresentacao(true));
// Sair do ecrã inteiro pelo browser também termina a apresentação
document.addEventListener("fullscreenchange", () => !document.fullscreenElement && pararApresentacao(true));
