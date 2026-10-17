import { analyze, lojasFromXlsx, LOJAS } from "./engine.js";

const VIEWS = [
  ["capa", "Capa"],
  ["lojas", "Lojas"],
  ["compradores", "Compradores"],
  ["ruptura", "Ruptura"],
  ["sem-venda", "Sem venda"],
  ["irregular", "Abastecimento irregular"],
  ["excecao", "Exceção"],
  ["datas", "Datas"],
  ["central", "Central"],
  ["qualidade", "Qualidade"],
];

const state = {
  view: "capa",
  foco: "comprador",
  detalheTitulo: "",
  result: null,
  page: 0,
  pageSize: 40,
  loja: "",
  comprador: "",
  produto: "",
  busca: "",
  texto: "",
  grupo: "zero",
  coverLimit: 1,
  files: null,
  semanas: [],
  repeticao: "",
  sortKey: "",
  sortDir: "asc",
};

const nav = document.querySelector("#nav");
const view = document.querySelector("#view");
const status = document.querySelector("#status");
const bar = document.querySelector("#bar");
const title = document.querySelector("#title");
const subtitle = document.querySelector("#subtitle");

function money(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(value) {
  return `${((value || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
function qty(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function itens(value) {
  return Math.round(value || 0).toLocaleString("pt-BR");
}
function relacaoEstoque(row) {
  if (row.inicial == null || row.final == null || Math.abs(row.inicial) < 0.05) return null;
  return row.final / row.inicial;
}
function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const dir = state.sortDir === "desc" ? -1 : 1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * dir;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" }) * dir;
}
function sortRows(rows, columns) {
  const column = columns.find((item) => item.key === state.sortKey);
  if (!column || !column.value) return rows;
  return [...rows].sort((a, b) => compareValues(column.value(a), column.value(b)));
}
function sortMark(key) {
  if (state.sortKey !== key) return "";
  return state.sortDir === "asc" ? " ↑" : " ↓";
}
function capaOrdem(row, info) {
  if (state.sortKey === "nome") return row.nome || row.comprador || `${row.produto} ${row.descricao}`;
  if (state.sortKey === "vezes") return info.vezes.get(String(row.produto)) || 0;
  const metric = CAPA_METRICS.find(([id]) => id === state.sortKey);
  if (!metric) return null;
  const [, , ratio, base] = metric;
  const recebidos = state.foco === "produto" && (state.sortKey === "automatico" || state.sortKey === "manual" || state.sortKey === "ambos");
  const total = recebidos ? row.comAbastecimento : base(row);
  if (!total) return null;
  if (!recebidos) return ratio(row);
  const numero = state.sortKey === "automatico" ? row.automatico : state.sortKey === "manual" ? row.manual : row.ambos;
  return numero / row.comAbastecimento;
}
function diaNumero(text) {
  const [dia, mes, ano] = String(text).split("-").map(Number);
  return new Date(ano, mes - 1, dia).getTime();
}
function diaCurto(text) {
  const [dia, mes] = String(text).split("-");
  return `${dia}/${mes}`;
}

const SEMANAS_KEY = "fds-oferta-semanas";

function guardarSemana(result) {
  const produtos = [...new Set(result.details.map((row) => String(row.produto)))];
  const semana = { inicio: result.periodo[0], fim: result.periodo[3], produtos };
  let todas = [];
  try {
    todas = JSON.parse(localStorage.getItem(SEMANAS_KEY) || "[]");
    if (!Array.isArray(todas)) todas = [];
  } catch {
    todas = [];
  }
  todas = todas.filter((item) => item && item.inicio !== semana.inicio);
  todas.push(semana);
  todas.sort((a, b) => diaNumero(a.inicio) - diaNumero(b.inicio));
  todas = todas.slice(-4);
  localStorage.setItem(SEMANAS_KEY, JSON.stringify(todas));
  state.semanas = todas;
}

function repeticaoOferta(result) {
  const atuais = new Set(result.details.map((row) => String(row.produto)));
  const anteriores = state.semanas.filter((item) => item.inicio !== result.periodo[0]);
  const anterior = anteriores.length ? anteriores[anteriores.length - 1] : null;
  const conjuntoAnterior = new Set(anterior ? anterior.produtos.map(String) : []);
  const conjuntos = anteriores.map((item) => new Set(item.produtos.map(String)));
  const vezes = new Map();
  const naAnterior = new Map();
  for (const produto of atuais) {
    vezes.set(produto, conjuntos.reduce((total, conjunto) => total + (conjunto.has(produto) ? 1 : 0), 0));
    naAnterior.set(produto, conjuntoAnterior.has(produto));
  }
  return { anteriores, anterior, vezes, naAnterior, total: atuais.size };
}

function combinaRepeticao(id, vezes, naAnterior) {
  if (id === "anterior") return naAnterior;
  if (id === "estreia") return !naAnterior;
  if (id === "2+") return vezes >= 2;
  return vezes === Number(id);
}
function setProgress(ratio, text) {
  bar.style.width = `${Math.round(ratio * 100)}%`;
  status.textContent = text;
}

function decode(buffer) {
  return new TextDecoder("windows-1252").decode(buffer);
}

async function readHandle(handle) {
  const file = await handle.getFile();
  return file.arrayBuffer();
}

async function collectFromDirectory(dir) {
  const found = { sales: [], buffers: {} };
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file") continue;
    const date = name.match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
    if (date) {
      found.sales.push({ date: date[1], handle });
      continue;
    }
    const key = name.toLowerCase();
    if (key.startsWith("ofertasdoper")) {
      found.buffers.ofertas = handle;
      continue;
    }
    if (["estoqueinicio.txt", "estoquefim.txt", "entradas.txt", "dimproduto.txt", "automatico.txt", "lojas.xlsx"].includes(key)) {
      found.buffers[key] = handle;
    }
  }
  return found;
}

async function collectFromServer() {
  const listing = await fetch("../");
  if (!listing.ok) throw new Error("sem listagem");
  const html = await listing.text();
  const names = [...html.matchAll(/href="([^"]+)"/g)].map((match) => decodeURIComponent(match[1].split("/").pop()));
  const found = { sales: [], texts: {}, lojas: null };
  for (const name of names) {
    const date = name.match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
    if (date) found.sales.push(date[1]);
  }
  found.sales.sort();
  return { names, found };
}

async function loadServerFiles() {
  const discovered = await collectFromServer();
  const sales = [];
  let step = 0;
  const jobs = discovered.found.sales.length + 6;
  const offerName = discovered.names.find((name) => name.toLowerCase().startsWith("ofertasdoper"));
  if (!offerName) throw new Error("Falta o arquivo Ofertas do período.");
  for (const date of discovered.found.sales) {
    step += 1;
    setProgress(step / jobs, `Lendo ${date}.txt`);
    const response = await fetch(`../${date}.txt`);
    sales.push({ date, text: decode(await response.arrayBuffer()) });
  }
  async function textFile(name) {
    step += 1;
    setProgress(step / jobs, `Lendo ${name}`);
    const response = await fetch(`../${name}`);
    if (!response.ok) throw new Error(`Arquivo ausente: ${name}`);
    return decode(await response.arrayBuffer());
  }
  const inicio = await textFile("EstoqueInicio.txt");
  const fim = await textFile("EstoqueFim.txt");
  const entradas = await textFile("Entradas.txt");
  const dim = await textFile("Dimproduto.txt");
  const automatico = await textFile("Automatico.txt");
  const ofertas = await textFile(offerName);
  step += 1;
  setProgress(0.92, "Lendo Lojas.xlsx");
  const lojasResponse = await fetch("../Lojas.xlsx");
  const lojas = await lojasFromXlsx(await lojasResponse.arrayBuffer());
  return { sales, inicio, fim, entradas, dim, automatico, lojas, ofertas };
}

async function loadDirectory(dir) {
  const found = await collectFromDirectory(dir);
  const sales = [];
  for (const item of found.sales.sort((a, b) => a.date.localeCompare(b.date))) {
    setProgress(0.2, `Lendo ${item.date}.txt`);
    sales.push({ date: item.date, text: decode(await readHandle(item.handle)) });
  }
  async function required(name) {
    const handle = found.buffers[name.toLowerCase()];
    if (!handle) throw new Error(`Arquivo ausente: ${name}`);
    setProgress(0.45, `Lendo ${name}`);
    return handle;
  }
  const inicio = decode(await readHandle(await required("EstoqueInicio.txt")));
  const fim = decode(await readHandle(await required("EstoqueFim.txt")));
  const entradas = decode(await readHandle(await required("Entradas.txt")));
  const dim = decode(await readHandle(await required("Dimproduto.txt")));
  const automatico = decode(await readHandle(await required("Automatico.txt")));
  if (!found.buffers.ofertas) throw new Error("Falta o arquivo Ofertas do período.");
  setProgress(0.7, "Lendo Ofertas do período");
  const ofertas = decode(await readHandle(found.buffers.ofertas));
  const lojasHandle = await required("Lojas.xlsx");
  const lojas = await lojasFromXlsx(await readHandle(lojasHandle));
  return { sales, inicio, fim, entradas, dim, automatico, lojas, ofertas };
}

async function run(loader) {
  try {
    const files = await loader();
    state.files = files;
    setProgress(0.96, "Calculando a semana");
    await new Promise((resolve) => setTimeout(resolve, 20));
    const result = analyze({ ...files, coverLimit: state.coverLimit });
    if (!result.ok) {
      setProgress(0, result.message);
      return;
    }
    state.result = result;
    state.page = 0;
    if (state.view === "detalhe") {
      state.view = "capa";
      state.repeticao = "";
    }
    guardarSemana(result);
    setProgress(1, `Semana ${result.periodo[0]} a ${result.periodo[3]}. ${result.quality.produtosOferta.toLocaleString("pt-BR")} produtos de oferta.`);
    render();
  } catch (error) {
    setProgress(0, error.message || "Não foi possível ler a pasta.");
  }
}

function currentRows() {
  const result = state.result;
  if (!result) return [];
  let rows = result.details;
  if (state.loja) rows = rows.filter((row) => row.loja === state.loja);
  if (state.comprador) rows = rows.filter((row) => row.comprador === state.comprador);
  if (state.produto) rows = rows.filter((row) => row.produto === state.produto);
  if (state.texto) {
    const query = state.texto.toLocaleLowerCase("pt-BR");
    rows = rows.filter((row) => `${row.produto} ${row.descricao}`.toLocaleLowerCase("pt-BR").includes(query));
  }
  if (state.view === "ruptura") {
    if (state.grupo === "zero") rows = rows.filter((row) => row.situacao === "zero");
    if (state.grupo === "negativo") rows = rows.filter((row) => row.situacao === "negativo");
    if (state.grupo === "provavel") rows = rows.filter((row) => row.provavel);
  }
  if (state.view === "sem-venda") {
    rows = rows.filter((row) => !row.vendeu);
    if (state.grupo === "positivo") rows = rows.filter((row) => row.situacao === "positivo");
    if (state.grupo === "zero") rows = rows.filter((row) => row.situacao === "zero");
    if (state.grupo === "sem-linha") rows = rows.filter((row) => row.situacao === "sem-linha");
  }
  if (state.view === "irregular") rows = rows.filter((row) => row.irregular);
  if (state.view === "excecao") {
    if (state.grupo === "insuficiente") rows = rows.filter((row) => row.excecao === "entrada-insuficiente");
    else rows = rows.filter((row) => row.excecao === "sem-entrada");
  }
  if (state.view === "detalhe") {
    if (state.grupo === "automatico") rows = rows.filter((row) => row.automatico);
    if (state.grupo === "manual") rows = rows.filter((row) => row.manual);
    if (state.grupo === "ambos") rows = rows.filter((row) => row.automatico && row.manual);
    if (state.grupo === "provavel") rows = rows.filter((row) => row.provavel);
    if (state.grupo === "ruptura") rows = rows.filter((row) => row.situacao === "zero");
    if (state.grupo === "excesso") rows = rows.filter((row) => row.irregular);
    if (state.grupo === "sem-venda") rows = rows.filter((row) => !row.vendeu && row.situacao === "positivo");
    if (state.grupo === "sem-entrada") rows = rows.filter((row) => row.excecao === "sem-entrada");
  }
  return rows;
}

function filters() {
  const result = state.result;
  const stores = Object.entries(LOJAS).filter(([id]) => id !== "70");
  const buyers = [...new Set(result.compradores.map((row) => row.comprador))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return `
    <div class="filters">
      <select id="f-loja"><option value="">Todas as lojas</option>${stores.map(([id, name]) => `<option value="${id}" ${state.loja === id ? "selected" : ""}>${name}</option>`).join("")}</select>
      <select id="f-comprador"><option value="">Todos os compradores</option>${buyers.map((name) => `<option ${state.comprador === name ? "selected" : ""}>${name}</option>`).join("")}</select>
      <input id="f-texto" placeholder="Produto" value="${state.texto.replace(/"/g, "&quot;")}">
    </div>`;
}

function table(columns, rows) {
  const sorted = sortRows(rows, columns);
  const start = state.page * state.pageSize;
  const pageRows = sorted.slice(start, start + state.pageSize);
  const head = columns.map((column) => `<th class="${column.num ? "num" : ""}"><button type="button" class="sort" data-sort="${column.key}">${column.label}${sortMark(column.key)}</button></th>`).join("");
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = pageRows.map((row) => `<tr>${columns.map((column) => `<td class="${column.num ? "num" : ""}">${esc(column.cell(row))}</td>`).join("")}</tr>`).join("");
  const pages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
  const fullLabel = document.fullscreenElement ? "Sair da tela cheia" : "Tela cheia";
  return `
    <div class="panel" id="panel">
      <div class="panel-bar"><button type="button" id="fullscreen">${fullLabel}</button></div>
      <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}">Nenhum item neste filtro.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${sorted.length.toLocaleString("pt-BR")} linhas · página ${state.page + 1} de ${pages}</span><span><button type="button" id="prev">Anterior</button> <button type="button" id="next">Próxima</button></span></div>
    </div>`;
}

function bindFilters(rows) {
  const loja = document.querySelector("#f-loja");
  const comprador = document.querySelector("#f-comprador");
  const texto = document.querySelector("#f-texto");
  if (loja) loja.onchange = () => { state.loja = loja.value; state.page = 0; render(); };
  if (comprador) comprador.onchange = () => { state.comprador = comprador.value; state.page = 0; render(); };
  if (texto) texto.onchange = () => { state.texto = texto.value; state.page = 0; render(); };
  const prev = document.querySelector("#prev");
  const next = document.querySelector("#next");
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (prev) prev.onclick = () => { state.page = Math.max(0, state.page - 1); render(); };
  if (next) next.onclick = () => { state.page = Math.min(pages - 1, state.page + 1); render(); };
  document.querySelectorAll("[data-grupo]").forEach((button) => {
    button.onclick = () => { state.grupo = button.dataset.grupo; state.page = 0; render(); };
  });
  bindSort();
  bindFullscreen();
}

function bindSort() {
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else {
        state.sortKey = key;
        state.sortDir = key === "nome" || key === "loja" || key === "produto" || key === "descricao" || key === "comprador" || key === "relacao" ? "asc" : "desc";
      }
      state.page = 0;
      render();
    };
  });
}

function bindFullscreen() {
  const panel = document.querySelector("#panel");
  const button = document.querySelector("#fullscreen");
  if (!panel || !button) return;
  const wrap = panel.querySelector(".table-wrap");
  const overflows = wrap && wrap.scrollWidth > wrap.clientWidth + 4;
  const leave = () => {
    panel.classList.remove("expanded");
    button.textContent = "Tela cheia";
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  const enter = () => {
    panel.requestFullscreen().then(() => {
      button.textContent = "Sair da tela cheia";
    }).catch(() => {
      panel.classList.add("expanded");
      button.textContent = "Sair da tela cheia";
    });
  };
  button.hidden = !overflows && !state.keepFull;
  button.onclick = () => {
    if (document.fullscreenElement || panel.classList.contains("expanded")) leave();
    else enter();
  };
  if (state.keepFull) enter();
}

function detailColumns() {
  return [
    { key: "loja", label: "Loja", value: (row) => row.lojaNome, cell: (row) => row.lojaNome },
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "inicial", label: "Estoque inicial", num: true, value: (row) => row.inicial, cell: (row) => qty(row.inicial) },
    { key: "entrada", label: "Entrada", num: true, value: (row) => row.entradas, cell: (row) => qty(row.entradas) },
    { key: "venda", label: "Venda (quant)", num: true, value: (row) => row.quantidade, cell: (row) => qty(row.quantidade) },
    { key: "final", label: "Estoque final", num: true, value: (row) => row.final, cell: (row) => qty(row.final) },
    { key: "saldo", label: "Final / inicial", num: true, value: (row) => relacaoEstoque(row), cell: (row) => { const valor = relacaoEstoque(row); return valor == null ? "—" : pct(valor); } },
    { key: "cobertura", label: "Cobertura", num: true, value: (row) => row.cobertura, cell: (row) => row.cobertura == null ? "—" : `${qty(row.cobertura)} d` },
  ];
}

function render() {
  state.keepFull = Boolean(document.fullscreenElement) || Boolean(document.querySelector("#panel.expanded"));
  title.textContent = state.view === "detalhe" ? state.detalheTitulo : VIEWS.find(([id]) => id === state.view)[1];
  [...nav.children].forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  const result = state.result;
  if (!result) {
    view.innerHTML = `<p class="note">Escolha a pasta da semana ou abra esta página pelo servidor local da pasta do projeto e aperte Atualizar.</p>`;
    return;
  }
  subtitle.textContent = `${result.periodo[0]} a ${result.periodo[3]} · quinta a domingo`;
  if (state.view === "capa") renderCapa(result);
  else if (state.view === "detalhe") renderDetalhe();
  else if (state.view === "lojas") renderLojas(result);
  else if (state.view === "compradores") renderBuyers(result);
  else if (state.view === "datas") renderDatas(result);
  else if (state.view === "central") renderCentral(result);
  else if (state.view === "qualidade") renderQuality(result);
  else renderDetail(result);
}

const CAPA_METRICS = [
  ["automatico", "Abas. automático", (row) => row.automatico / ((row.automatico + row.manual) || 1), (row) => row.automatico + row.manual, (row) => row.automatico],
  ["manual", "Abas. manual", (row) => row.manual / ((row.automatico + row.manual) || 1), (row) => row.automatico + row.manual, (row) => row.manual],
  ["ambos", "Dois abas.", (row) => row.comAbastecimento ? row.ambos / row.comAbastecimento : 0, (row) => row.comAbastecimento, (row) => row.ambos],
  ["provavel", "Ruptura provável", (row) => row.comVenda ? row.provavel / row.comVenda : 0, (row) => row.comVenda, (row) => row.provavel],
  ["ruptura", "Ruptura", (row) => row.comPosicao ? row.ruptura / row.comPosicao : 0, (row) => row.comPosicao, (row) => row.ruptura],
  ["excesso", "Excesso de estoque", (row) => row.pares ? row.irregular / row.pares : 0, (row) => row.pares, (row) => row.irregular],
  ["sem-venda", "Sem venda com saldo", (row) => row.pares ? row.semVendaSaldo / row.pares : 0, (row) => row.pares, (row) => row.semVendaSaldo],
  ["sem-entrada", "Sem entrada", (row) => row.pares ? row.excecaoSem / row.pares : 0, (row) => row.pares, (row) => row.excecaoSem],
];

function productRows(details) {
  const map = new Map();
  for (const row of details) {
    let item = map.get(row.produto);
    if (!item) {
      item = {
        produto: row.produto,
        descricao: row.descricao,
        comprador: row.comprador,
        pares: 0,
        comVenda: 0,
        comPosicao: 0,
        automatico: 0,
        manual: 0,
        ambos: 0,
        comAbastecimento: 0,
        provavel: 0,
        ruptura: 0,
        irregular: 0,
        semVendaSaldo: 0,
        excecaoSem: 0,
      };
      map.set(row.produto, item);
    }
    item.pares += 1;
    if (row.vendeu) item.comVenda += 1;
    if (row.final != null) item.comPosicao += 1;
    if (row.automatico) item.automatico += 1;
    if (row.manual) item.manual += 1;
    if (row.automatico || row.manual) item.comAbastecimento += 1;
    if (row.automatico && row.manual) item.ambos += 1;
    if (row.provavel) item.provavel += 1;
    if (row.situacao === "zero") item.ruptura += 1;
    if (row.irregular) item.irregular += 1;
    if (!row.vendeu && row.situacao === "positivo") item.semVendaSaldo += 1;
    if (row.excecao === "sem-entrada") item.excecaoSem += 1;
  }
  return [...map.values()].sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
}

function renderCapa(result) {
  const rede = result.rede;
  const label = state.foco === "loja" ? "Loja" : state.foco === "produto" ? "Produto" : "Comprador";
  let people = state.foco === "loja"
    ? result.lojas
    : state.foco === "produto"
      ? productRows(result.details)
      : result.compradores.filter((row) => row.pares > 0);
  if (state.foco === "produto" && state.busca) {
    const query = state.busca.toLocaleLowerCase("pt-BR");
    people = people.filter((row) => `${row.produto} ${row.descricao} ${row.comprador}`.toLocaleLowerCase("pt-BR").includes(query));
  }
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const info = repeticaoOferta(result);
  const mostraVezes = state.foco === "produto" && info.anteriores.length > 0;
  if (state.sortKey) {
    people = [...people].sort((a, b) => compareValues(capaOrdem(a, info), capaOrdem(b, info)));
  }
  const start = state.page * state.pageSize;
  const pageRows = people.slice(start, start + state.pageSize);
  const capaHeads = {
    automatico: ["Abas.<br>automático", "Abastecimento automático"],
    manual: ["Abas.<br>manual", "Abastecimento manual"],
    ambos: ["Dois<br>abas.", "Dois abastecimentos"],
    provavel: ["Ruptura<br>provável", "Ruptura provável"],
    ruptura: ["Ruptura", "Ruptura"],
    excesso: ["Excesso<br>de estoque", "Excesso de estoque"],
    "sem-venda": ["Sem venda<br>com saldo", "Sem venda com saldo"],
    "sem-entrada": ["Sem<br>entrada", "Sem entrada"],
  };
  const head = `${mostraVezes ? `<th class="num"><button type="button" class="sort" data-sort="vezes">Vezes<br>antes${sortMark("vezes")}</button></th>` : ""}${CAPA_METRICS.map(([id, name]) => {
    const [linha, dica] = capaHeads[id] || [name, name];
    return `<th class="num"><button type="button" class="sort" data-sort="${id}" title="${esc(dica)}">${linha}${sortMark(id)}</button></th>`;
  }).join("")}`;
  const body = pageRows.map((row) => {
    const name = state.foco === "produto" ? `${row.produto} ${row.descricao}` : (row.nome || row.comprador);
    const safe = esc(name);
    const cells = CAPA_METRICS.map(([id, , ratio, base, count]) => {
      const recebidos = state.foco === "produto" && (id === "automatico" || id === "manual" || id === "ambos");
      const total = recebidos ? row.comAbastecimento : base(row);
      const value = recebidos
        ? (id === "automatico" ? row.automatico : id === "manual" ? row.manual : row.ambos) / (row.comAbastecimento || 1)
        : ratio(row);
      const text = total ? pct(value) : "—";
      const quantidade = total ? `<small>${itens(count(row))}</small>` : "";
      return `<td class="num"><button type="button" class="metric" data-metric="${id}" data-nome="${safe}" data-loja="${row.id || ""}" data-comprador="${row.comprador || ""}" data-produto="${row.produto || ""}"><span>${text}</span>${quantidade}</button></td>`;
    }).join("");
    const who = state.foco === "produto" ? `<strong>${esc(row.produto)}</strong> ${esc(row.descricao)}` : esc(name);
    const vezes = mostraVezes ? `<td class="num">${info.vezes.get(String(row.produto)) || 0}</td>` : "";
    return `<tr><td>${who}</td>${vezes}${cells}</tr>`;
  }).join("");
  const repeticao = htmlRepeticao(result, info, esc);
  const pages = Math.max(1, Math.ceil(people.length / state.pageSize));
  const search = state.foco === "produto"
    ? `<div class="filters"><input id="f-busca" placeholder="Produto ou comprador" value="${esc(state.busca)}"></div>`
    : "";
  view.innerHTML = `
    <div class="cards">
      <article class="card"><span>Venda da oferta</span><strong>${money(rede.venda)}</strong></article>
      <article class="card"><span>Venda total do período</span><strong>${money(rede.total)}</strong></article>
      <article class="card"><span>Participação da oferta</span><strong>${pct(rede.participacao)}</strong></article>
      <article class="card"><span>Produtos de oferta</span><strong>${result.quality.produtosOferta.toLocaleString("pt-BR")}</strong></article>
      <article class="card" title="Lucro bruto soma VLRLUCRO dos itens de oferta que venderam. Esse valor já vem pronto no arquivo de vendas."><span>Lucro bruto</span><strong>${money(rede.lucro)}</strong><em>VLRLUCRO</em></article>
      <article class="card" title="Margem pelo custo bruto é a venda dos itens de oferta menos o custo bruto da venda. É outra conta, separada do lucro bruto."><span>Margem pelo custo bruto</span><strong>${money(rede.margem)}</strong><em>Venda − custo bruto</em></article>
    </div>
    ${repeticao}
    <div class="switch">
      <button type="button" class="${state.foco === "comprador" ? "" : "secondary"}" data-foco="comprador">Por comprador</button>
      <button type="button" class="${state.foco === "loja" ? "" : "secondary"}" data-foco="loja">Por loja</button>
      <button type="button" class="${state.foco === "produto" ? "" : "secondary"}" data-foco="produto">Por produto</button>
    </div>
    ${search}
    <div class="panel" id="panel">
      <div class="panel-bar"><button type="button" id="fullscreen">${document.fullscreenElement ? "Sair da tela cheia" : "Tela cheia"}</button></div>
      <div class="table-wrap"><table class="capa-table"><thead><tr><th><button type="button" class="sort" data-sort="nome">${label}${sortMark("nome")}</button></th>${head}</tr></thead><tbody>${body || `<tr><td colspan="${CAPA_METRICS.length + 1 + (mostraVezes ? 1 : 0)}">Nenhum item neste filtro.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${people.length.toLocaleString("pt-BR")} linhas · página ${state.page + 1} de ${pages}</span><span><button type="button" id="prev">Anterior</button> <button type="button" id="next">Próxima</button></span></div>
    </div>
    <p class="note">O número em vermelho é a quantidade de itens do percentual. Automático e manual dividem as linhas de revenda; na visão por produto, dividem as lojas que receberam o item. Dois abastecimentos é a parcela dos produtos recebidos que chegaram no automático e no manual. O clique abre esses produtos.</p>`;
  view.querySelectorAll("[data-foco]").forEach((button) => {
    button.onclick = () => { state.foco = button.dataset.foco; state.page = 0; state.sortKey = ""; render(); };
  });
  const busca = document.querySelector("#f-busca");
  if (busca) {
    busca.oninput = () => {
      state.busca = busca.value;
      state.page = 0;
      const caret = busca.selectionStart;
      render();
      const again = document.querySelector("#f-busca");
      if (again) {
        again.focus();
        again.setSelectionRange(caret, caret);
      }
    };
  }
  const prev = document.querySelector("#prev");
  const next = document.querySelector("#next");
  if (prev) prev.onclick = () => { state.page = Math.max(0, state.page - 1); render(); };
  if (next) next.onclick = () => { state.page = Math.min(pages - 1, state.page + 1); render(); };
  view.querySelectorAll(".metric").forEach((button) => {
    button.onclick = () => {
      state.view = "detalhe";
      state.grupo = button.dataset.metric;
      state.page = 0;
      state.texto = "";
      state.loja = "";
      state.comprador = "";
      state.produto = "";
      if (state.foco === "loja") state.loja = button.dataset.loja;
      else if (state.foco === "comprador") state.comprador = button.dataset.comprador;
      else state.produto = button.dataset.produto;
      const metric = CAPA_METRICS.find(([id]) => id === state.grupo);
      state.detalheTitulo = `${button.dataset.nome} · ${metric[1]}`;
      state.repeticao = "";
      render();
    };
  });
  view.querySelectorAll(".repeat").forEach((button) => {
    button.onclick = () => {
      state.view = "detalhe";
      state.grupo = "repeticao";
      state.repeticao = button.dataset.repeticao;
      state.detalheTitulo = button.dataset.rotulo;
      state.sortKey = "";
      state.page = 0;
      state.texto = "";
      state.loja = "";
      state.comprador = "";
      state.produto = "";
      render();
    };
  });
  bindSort();
  bindFullscreen();
}

function htmlRepeticao(result, info, esc) {
  const guardadas = state.semanas.map((item) => `${diaCurto(item.inicio)} a ${diaCurto(item.fim)}`).join(" · ");
  if (!info.anteriores.length) {
    return `<p class="note">Esta semana ficou guardada (${diaCurto(result.periodo[0])} a ${diaCurto(result.periodo[3])}). A comparação aparece quando outra semana for atualizada. Ficam sempre as quatro últimas.</p>`;
  }
  const n = info.anteriores.length;
  const contar = (pred) => {
    let total = 0;
    for (const produto of info.vezes.keys()) {
      if (pred(info.vezes.get(produto), info.naAnterior.get(produto))) total += 1;
    }
    return total;
  };
  const blocos = [
    ["anterior", `Também na semana ${diaCurto(info.anterior.inicio)} a ${diaCurto(info.anterior.fim)}`, (vezes, na) => na],
    ["estreia", "Não estiveram na semana anterior", (vezes, na) => !na],
  ];
  if (n >= 2) {
    blocos.push(["0", "Não estiveram em nenhuma semana anterior", (vezes) => vezes === 0]);
    blocos.push(["1", "Estiveram em 1 semana anterior", (vezes) => vezes === 1]);
    blocos.push(["2", n === 2 ? "Estiveram nas 2 semanas anteriores" : "Estiveram em 2 semanas anteriores", (vezes) => vezes === 2]);
  }
  if (n >= 3) {
    blocos.push(["3", "Estiveram nas 3 semanas anteriores", (vezes) => vezes === 3]);
    blocos.push(["2+", "Em pelo menos 2 semanas anteriores", (vezes) => vezes >= 2]);
  }
  const cards = blocos.map(([id, rotulo, pred]) => {
    const quantidade = contar(pred);
    const ratio = info.total ? quantidade / info.total : 0;
    return `<button type="button" class="card repeat" data-repeticao="${id}" data-rotulo="${esc(rotulo)}"><span>${esc(rotulo)}</span><strong>${pct(ratio)}</strong><em class="itens">${itens(quantidade)}</em></button>`;
  }).join("");
  const aviso = n >= 3 ? " Em pelo menos 2 semanas inclui quem esteve em 2 e em 3." : "";
  return `<h2 class="section">Repetição da oferta</h2><div class="cards">${cards}</div><p class="note">Percentual dos produtos de oferta desta semana. Semanas guardadas: ${guardadas}.${aviso} A mais antiga sai ao chegar em quatro.</p>`;
}

function renderDetalhe() {
  if (state.grupo === "repeticao") {
    renderRepeticao();
    return;
  }
  const rows = currentRows();
  view.innerHTML = `<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button></div>${filters()}${table(detailColumns(), rows)}`;
  document.querySelector("#voltar").onclick = voltarCapa;
  bindFilters(rows);
}

function voltarCapa() {
  state.view = "capa";
  state.loja = "";
  state.comprador = "";
  state.produto = "";
  state.repeticao = "";
  state.page = 0;
  render();
}

function renderRepeticao() {
  const info = repeticaoOferta(state.result);
  const seen = new Set();
  let rows = [];
  for (const row of state.result.details) {
    const produto = String(row.produto);
    if (seen.has(produto)) continue;
    seen.add(produto);
    const vezes = info.vezes.get(produto) || 0;
    const na = Boolean(info.naAnterior.get(produto));
    if (!combinaRepeticao(state.repeticao, vezes, na)) continue;
    rows.push({ produto: row.produto, descricao: row.descricao, comprador: row.comprador, vezes, na });
  }
  rows.sort((a, b) => b.vezes - a.vezes || a.descricao.localeCompare(b.descricao, "pt-BR"));
  if (state.texto) {
    const query = state.texto.toLocaleLowerCase("pt-BR");
    rows = rows.filter((row) => `${row.produto} ${row.descricao} ${row.comprador}`.toLocaleLowerCase("pt-BR").includes(query));
  }
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  view.innerHTML = `<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button><input id="f-texto" placeholder="Produto" value="${esc(state.texto)}"></div>${table([
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "vezes", label: "Semanas anteriores", num: true, value: (row) => row.vezes, cell: (row) => itens(row.vezes) },
    { key: "anterior", label: "Semana anterior", value: (row) => row.na ? "Sim" : "Não", cell: (row) => row.na ? "Sim" : "Não" },
  ], rows)}`;
  document.querySelector("#voltar").onclick = voltarCapa;
  bindFilters(rows);
}

function renderLojas(result) {
  view.innerHTML = table([
    { key: "loja", label: "Loja", value: (row) => row.nome, cell: (row) => row.nome },
    { key: "oferta", label: "Oferta", num: true, value: (row) => row.venda, cell: (row) => money(row.venda) },
    { key: "total", label: "Total da loja", num: true, value: (row) => row.totalLoja, cell: (row) => money(row.totalLoja) },
    { key: "participacao", label: "Participação", num: true, value: (row) => row.participacao, cell: (row) => pct(row.participacao) },
    { key: "lucro", label: "Lucro bruto", num: true, value: (row) => row.lucro, cell: (row) => money(row.lucro) },
    { key: "margem", label: "Margem custo bruto", num: true, value: (row) => row.margem, cell: (row) => money(row.margem) },
    { key: "ruptura", label: "Ruptura", num: true, value: (row) => row.ruptura, cell: (row) => qty(row.ruptura) },
    { key: "irregular", label: "Irregular", num: true, value: (row) => row.irregular, cell: (row) => qty(row.irregular) },
    { key: "sem-venda", label: "Sem venda com saldo", num: true, value: (row) => row.semVendaSaldo, cell: (row) => qty(row.semVendaSaldo) },
  ], result.lojas);
  bindFilters(result.lojas);
}

function renderBuyers(result) {
  view.innerHTML = table([
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "venda", label: "Venda", num: true, value: (row) => row.venda, cell: (row) => money(row.venda) },
    { key: "lucro", label: "Lucro bruto", num: true, value: (row) => row.lucro, cell: (row) => money(row.lucro) },
    { key: "margem", label: "Margem custo bruto", num: true, value: (row) => row.margem, cell: (row) => money(row.margem) },
    { key: "posicionado", label: "Posicionado na quinta", num: true, value: (row) => row.comPosicao ? row.posicionados / row.comPosicao : null, cell: (row) => row.comPosicao ? pct(row.posicionados / row.comPosicao) : "—" },
    { key: "ruptura", label: "Ruptura", num: true, value: (row) => row.ruptura, cell: (row) => qty(row.ruptura) },
    { key: "provavel", label: "Ruptura provável", num: true, value: (row) => row.provavel, cell: (row) => qty(row.provavel) },
    { key: "irregular", label: "Irregular", num: true, value: (row) => row.irregular, cell: (row) => qty(row.irregular) },
    { key: "sem-entrada", label: "Sem entrada", num: true, value: (row) => row.excecaoSem, cell: (row) => qty(row.excecaoSem) },
    { key: "sem-venda", label: "Sem venda com saldo", num: true, value: (row) => row.semVendaSaldo, cell: (row) => qty(row.semVendaSaldo) },
    { key: "automatico", label: "Automático", num: true, value: (row) => row.automatico, cell: (row) => qty(row.automatico) },
    { key: "manual", label: "Manual", num: true, value: (row) => row.manual, cell: (row) => qty(row.manual) },
    { key: "pct-auto", label: "% automático", num: true, value: (row) => (row.automatico + row.manual) ? row.automatico / (row.automatico + row.manual) : null, cell: (row) => (row.automatico + row.manual) ? pct(row.automatico / (row.automatico + row.manual)) : "—" },
    { key: "embalagem", label: "Embalagem", num: true, value: (row) => row.embalagem, cell: (row) => qty(row.embalagem) },
    { key: "materia", label: "Matéria-prima", num: true, value: (row) => row.materia, cell: (row) => qty(row.materia) },
    { key: "uso", label: "Uso e consumo", num: true, value: (row) => row.uso, cell: (row) => qty(row.uso) },
  ], result.compradores);
  bindFilters(result.compradores);
}

function renderDatas(result) {
  const rows = result.datas.filter((row) => {
    if (state.loja && row.loja !== state.loja) return false;
    if (state.comprador && row.comprador !== state.comprador) return false;
    return true;
  });
  const label = { antes: "Manual em dia anterior", depois: "Manual em dia posterior", "mesmo-dia-antes": "Mesmo dia, manual antes", "mesmo-dia-depois": "Mesmo dia, manual depois", misto: "Pedidos dos dois lados" };
  view.innerHTML = filters() + table([
    { key: "loja", label: "Loja", value: (row) => row.lojaNome, cell: (row) => row.lojaNome },
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "relacao", label: "Relação", value: (row) => label[row.relacao] || row.relacao, cell: (row) => label[row.relacao] || row.relacao },
    { key: "manuais", label: "Pedidos manuais", num: true, value: (row) => row.manuais, cell: (row) => qty(row.manuais) },
  ], rows);
  bindFilters(rows);
}

function renderCentral(result) {
  const central = result.central;
  view.innerHTML = `
    <div class="cards">
      <article class="card"><span>Oferta com saldo na central</span><strong>${qty(central.oferta)}</strong></article>
      <article class="card"><span>Central cresceu</span><strong>${qty(central.cresceu)}</strong></article>
      <article class="card"><span>Central caiu</span><strong>${qty(central.caiu)}</strong></article>
      <article class="card"><span>Loja zerada e central com saldo</span><strong>${qty(central.lojaZeradaCdComSaldo)}</strong></article>
      <article class="card"><span>Loja e central zeradas</span><strong>${qty(central.ambosZerados)}</strong></article>
    </div>
    <p class="note">Loja zerada com saldo na central indica falta de transferência. As duas zeradas indicam falta de compra. A saída da central para a loja não tem arquivo próprio.</p>`;
}

function renderQuality(result) {
  const quality = result.quality;
  view.innerHTML = `
    <div class="cards">
      <article class="card"><span>Linhas de venda</span><strong>${qty(quality.salesRows)}</strong></article>
      <article class="card"><span>Pares com venda</span><strong>${qty(quality.paresComVenda)}</strong></article>
      <article class="card"><span>Conta de saldo que fecha</span><strong>${qty(quality.fecha)}</strong></article>
      <article class="card"><span>Vendeu sem linha de estoque</span><strong>${qty(quality.semPosicaoVenda)}</strong></article>
      <article class="card"><span>Entradas repetidas descartadas</span><strong>${qty(quality.entradasRepetidas)}</strong></article>
      <article class="card"><span>Nome do pedido diferente do cadastro</span><strong>${qty(result.sistematica.nomesDiferentes)}</strong></article>
      <article class="card"><span>Linhas do automático</span><strong>${qty(result.sistematica.linhas)}</strong></article>
      <article class="card"><span>Pares na mesma loja com as duas sistemáticas</span><strong>${qty(result.datas.length)}</strong></article>
    </div>
    <p class="note">Empresas 2, 3, 4, 6, 18, 50, 60 e 61 ficam de fora. O comprador vem de Dimproduto.</p>`;
}

function renderDetail() {
  const rows = currentRows();
  const groups = {
    ruptura: [["zero", "Saldo zero"], ["negativo", "Saldo negativo"], ["provavel", "Ruptura provável"]],
    "sem-venda": [["positivo", "Com saldo"], ["zero", "Saldo zero"], ["sem-linha", "Sem linha de estoque"]],
    excecao: [["sem-entrada", "Sem entrada"], ["insuficiente", "Entrada insuficiente"]],
  };
  const buttons = (groups[state.view] || []).map(([id, label]) => `<button type="button" class="${state.grupo === id ? "" : "secondary"}" data-grupo="${id}">${label}</button>`).join("");
  view.innerHTML = `<div class="filters">${buttons}</div>${filters()}${table(detailColumns(), rows)}`;
  bindFilters(rows);
}

function exportCsv() {
  const rows = state.view === "lojas" ? state.result?.lojas || [] : state.view === "compradores" ? state.result?.compradores || [] : state.view === "datas" ? state.result?.datas || [] : currentRows();
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((key) => {
    const value = row[key];
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }).join(";"));
  const blob = new Blob([`\uFEFF${headers.join(";")}\n${body.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.view}.csv`;
  link.click();
}

nav.innerHTML = VIEWS.map(([id, label]) => `<button type="button" data-view="${id}">${label}</button>`).join("");
nav.onclick = (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.view = button.dataset.view;
  state.page = 0;
  state.loja = "";
  state.comprador = "";
  state.produto = "";
  state.repeticao = "";
  state.sortKey = "";
  state.detalheTitulo = "";
  if (state.view === "sem-venda") state.grupo = "positivo";
  if (state.view === "ruptura") state.grupo = "zero";
  if (state.view === "excecao") state.grupo = "sem-entrada";
  render();
};

document.querySelector("#reload").onclick = () => run(loadServerFiles);
document.querySelector("#pick").onclick = async () => {
  if (!window.showDirectoryPicker) {
    setProgress(0, "Este navegador não guarda a pasta. Use Chrome ou Edge.");
    return;
  }
  const dir = await window.showDirectoryPicker();
  run(() => loadDirectory(dir));
};
document.querySelector("#export").onclick = exportCsv;
render();
run(loadServerFiles);
