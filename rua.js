// Vista de rua: links oficiais do Google Maps (Maps URLs), gratuitos e sem chave.
// Abrem a app do Google Maps no telemóvel, ou o site no computador.
// O Street View abre no ponto de rua mais próximo (calculado em data/vizinhanca.js),
// virado para o imóvel; o ponto do próprio imóvel costuma não ter imagens.
function rumoEntre([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return Math.round((Math.atan2(y, x) / r + 360) % 360);
}

function linkStreetView(i) {
  const pre = window.VIZINHANCA?.[i.id];
  // Ponto escolhido à mão (campo streetView) ou, por defeito, a rua mais próxima
  const rua = i.streetView || (pre?.coords?.join() === i.coords.join() ? pre.rua : null);
  const [lng, lat] = rua || i.coords;
  const virado = rua && !i.aproximada ? `&heading=${rumoEntre(rua, i.coords)}` : "";
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}${virado}`;
}
const linkGoogleMaps = ([lng, lat]) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

function mostrarRua(i) {
  $("#rua").innerHTML = `
    <p class="rua-nota">${i.aproximada ? "Abre uma rua dentro da zona aproximada do imóvel." : "Abre a rua em frente ao imóvel, virada para ele."}</p>
    <div class="rua-botoes">
      <a class="btn-linha rua-link" href="${linkStreetView(i)}" target="_blank" rel="noopener">Street View ${SETA}</a>
      <a class="btn-linha rua-link" href="${linkGoogleMaps(i.coords)}" target="_blank" rel="noopener">Google Maps ${SETA}</a>
    </div>`;
}
