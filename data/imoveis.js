// Imóveis publicados em jbpartners.pt/imoveis.php (recolhidos a 20/10/2026).
// O site não publica coordenadas: a posição vem da localidade/morada indicada no anúncio,
// por isso quase todos estão marcados como localização aproximada (`raio` em metros).
// Na versão final estes dados devem vir diretamente da base de dados do site.
// pisos = n.º total de pisos do prédio; andar = piso da fração (0 = rés-do-chão).
// streetView (opcional) = ponto de onde abre o Street View, quando a rua mais próxima não tem imagens.
// videos (opcional) = lista de vídeos, cada um num destes formatos:
//   { id: "…" }                    vídeo alojado no site da agência (video-imovel.php)
//   { youtube: "dQw4w9WgXcQ" }     vídeo do YouTube (o código que aparece no link)
//   { url: "https://…/video.mp4" } qualquer ficheiro de vídeo
//   e opcionalmente vertical: true para vídeos filmados ao alto (telemóvel/Reels).
window.SITE_AGENCIA = "https://jbpartners.pt";

window.CIDADES = [
  { id: "torres-novas", nome: "Torres Novas", centro: [-8.5394, 39.4790], zoom: 14.5 },
  { id: "ourem", nome: "Ourém", centro: [-8.5217, 39.6475], zoom: 14 },
  { id: "porto-de-mos", nome: "Porto de Mós", centro: [-8.8185, 39.6024], zoom: 14 },
  { id: "abrantes", nome: "Abrantes", centro: [-8.1979, 39.4258], zoom: 14 },
];

window.IMOVEIS = [
  {
    id: "1cab2e116712922ff9c33c27", ref: "DSTNV326RF", cidade: "porto-de-mos", zona: "Porto de Mós, Leiria",
    finalidade: "Venda", titulo: "Moradia T4", tipo: "Moradia", tipologia: "T4", preco: 480000,
    areaUtil: 219.55, areaBruta: 297, quartos: 4, wc: 2, energia: "B",
    coords: [-8.8185, 39.6024], aproximada: true, raio: 450, orientacao: null,
    caracteristicas: ["Interiores de luxo", "Vistas para a Serra e o Castelo", "Lote de 663 m²", "Garagem fechada", "Cozinha com ilha"],
    descricao: "Moradia T4 moderna numa das zonas mais nobres de Porto de Mós, com hall de entrada amplo, sala com muita personalidade e cozinha de sonho com ilha central. Lote generoso de 663 m², garagem fechada e vistas para a Serra e o Castelo de Porto de Mós.",
    fotos: ["94afd7edae6ed0b85f676dc40805b34c", "5868d35f2fd43882963ea7fc872fd990", "4517530de0d760a55495234b026445f5", "6d3883100ae7e72fe4d92728e2028793", "aee5338b1c1aab468bf0061469aaeb57", "99c126f9529e844fa9b6c311838388e9"],
    totalFotos: 41,
    videos: [{ id: "d6f65ecfa0eb0dfc0a9399a8c1867283", vertical: true }],
    consultor: { nome: "Rui Figueiredo", tel: "+351 912 988 373" },
  },
  {
    id: "18a02626b41e4ccbfe7a941e", ref: "DSTNV315HN", cidade: "torres-novas", zona: "Edifício Intermarché, Torres Novas",
    finalidade: "Arrendamento", titulo: "Loja", tipo: "Loja", tipologia: null, preco: 750,
    areaUtil: 300, areaBruta: 345, quartos: 0, wc: 0, energia: null,
    coords: [-8.53066, 39.46984], aproximada: false, orientacao: null,
    streetView: [-8.5325963, 39.4688248], // Rua da Cancela do Leão: a rua mais próxima não tem imagens
    caracteristicas: ["Entrada independente", "Acesso pelo interior e pela rua", "Cerca de 345 m²"],
    descricao: "Espaço comercial com cerca de 345 m² no Edifício Intermarché de Torres Novas, com entrada independente: acesso tanto pelo interior do edifício como pela rua.",
    fotos: ["d7d2b904273e00608501d882f80c9369", "8fc26b1af6f24605f84118ebdfc50e3a", "55308edf59cb4f60c0529a5223210564", "0905d7368f965f9ac8f3bc6090d3f358", "014e21c06cd0b7c16686800c58610b99", "948bc1353a60a1a57f3e5ba6b714734b"],
    totalFotos: 8,
    consultor: { nome: "Hugo das Neves", tel: "+351 914 465 347" },
  },
  {
    id: "6d8846941694f3197a8b7eb1", ref: "DSTNV323HN", cidade: "abrantes", zona: "Vale das Donas, São Miguel do Rio Torto",
    finalidade: "Venda", titulo: "Lote de Terreno", tipo: "Terreno", tipologia: null, preco: 21000,
    areaTerreno: 160, quartos: 0, wc: 0, energia: null,
    coords: [-8.19786, 39.42582], aproximada: true, raio: 300, orientacao: null,
    caracteristicas: ["PIP com viabilidade de construção", "Loteamento residencial", "A 3 km de Abrantes"],
    descricao: "Lote de 160 m² na Urbanização do Vale das Donas, em São Miguel do Rio Torto, a 3 km de Abrantes. Inserido em loteamento residencial, com PIP e viabilidade de construção já aprovados.",
    fotos: ["d00a63b8d85fbb56e164a508cfeb3641"],
    totalFotos: 1,
    consultor: { nome: "Hugo das Neves", tel: "+351 914 465 347" },
  },
  {
    // No site este imóvel aparece duas vezes (ids dd4652cf… e 712399a6…) com a mesma referência
    id: "712399a62f27b65105590ae4", ref: "DSTNV329HN", cidade: "ourem", zona: "Alburitel, Ourém",
    finalidade: "Venda", titulo: "Moradia Geminada T5", tipo: "Moradia", tipologia: "T5", preco: 500000,
    areaUtil: 264, areaBruta: 300, quartos: 5, wc: 6, energia: "C",
    coords: [-8.52167, 39.6475], aproximada: true, raio: 450, orientacao: null,
    caracteristicas: ["5 suites", "Jardim", "Anexos", "Moradia senhorial", "Modernizada"],
    descricao: "Moradia senhorial com 5 suites, jardim e anexos em Alburitel, Ourém. Preserva o charme e a traça original de uma residência de elevado padrão, com várias modernizações que melhoraram o conforto e a funcionalidade.",
    fotos: ["aea5e6fee8f38486a1ee3c5bfe5241fa", "aef579b36364a7220d34997e2833b56d", "c3880371f91fb6be417e3f16aa7debe5", "104dbc92c6e19c2c21a7c17e2a0e00dc", "b09bfac1495a7b0484126ef08aebf274", "33ae203461eb314be26d447780dcc352"],
    totalFotos: 51,
    consultor: { nome: "Hugo das Neves", tel: "+351 914 465 347" },
  },
];
