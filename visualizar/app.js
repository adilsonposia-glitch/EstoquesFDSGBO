import { analyze, lojasFromXlsx, LOJAS } from "./engine.js";

const VIEWS = [
  ["rede", "Rede"],
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
  view: "rede",
  result: null,
  page: 0,
  pageSize: 40,
  loja: "",
  comprador: "",
  texto: "",
  grupo: "zero",
  coverLimit: 1,
  files: null,
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
  const jobs = discovered.found.sales.length + 5;
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
  step += 1;
  setProgress(0.92, "Lendo Lojas.xlsx");
  const lojasResponse = await fetch("../Lojas.xlsx");
  const lojas = await lojasFromXlsx(await lojasResponse.arrayBuffer());
  return { sales, inicio, fim, entradas, dim, automatico, lojas };
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
  const lojasHandle = await required("Lojas.xlsx");
  const lojas = await lojasFromXlsx(await readHandle(lojasHandle));
  return { sales, inicio, fim, entradas, dim, automatico, lojas };
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
  const start = state.page * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);
  const head = columns.map((column) => `<th class="${column.num ? "num" : ""}">${column.label}</th>`).join("");
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = pageRows.map((row) => `<tr>${columns.map((column) => `<td class="${column.num ? "num" : ""}">${esc(column.cell(row))}</td>`).join("")}</tr>`).join("");
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  return `
    <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}">Nenhum item neste filtro.</td></tr>`}</tbody></table></div>
    <div class="pager"><span>${rows.length.toLocaleString("pt-BR")} linhas · página ${state.page + 1} de ${pages}</span><span><button type="button" id="prev">Anterior</button> <button type="button" id="next">Próxima</button></span></div>`;
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
}

function detailColumns() {
  return [
    { label: "Loja", cell: (row) => row.lojaNome },
    { label: "Produto", cell: (row) => row.produto },
    { label: "Descrição", cell: (row) => row.descricao },
    { label: "Comprador", cell: (row) => row.comprador },
    { label: "Venda", num: true, cell: (row) => money(row.venda) },
    { label: "Qtd", num: true, cell: (row) => qty(row.quantidade) },
    { label: "Inicial", num: true, cell: (row) => qty(row.inicial) },
    { label: "Entradas", num: true, cell: (row) => qty(row.entradas) },
    { label: "Final", num: true, cell: (row) => qty(row.final) },
    { label: "Cobertura", num: true, cell: (row) => row.cobertura == null ? "—" : `${qty(row.cobertura)} d` },
  ];
}

function render() {
  title.textContent = VIEWS.find(([id]) => id === state.view)[1];
  [...nav.children].forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  const result = state.result;
  if (!result) {
    view.innerHTML = `<p class="note">Escolha a pasta da semana ou abra esta página pelo servidor local da pasta do projeto e aperte Atualizar.</p>`;
    return;
  }
  subtitle.textContent = `${result.periodo[0]} a ${result.periodo[3]} · quinta a domingo`;
  if (state.view === "rede") renderRede(result);
  else if (state.view === "lojas") renderLojas(result);
  else if (state.view === "compradores") renderBuyers(result);
  else if (state.view === "datas") renderDatas(result);
  else if (state.view === "central") renderCentral(result);
  else if (state.view === "qualidade") renderQuality(result);
  else renderDetail(result);
}

function renderRede(result) {
  const rede = result.rede;
  view.innerHTML = `
    <div class="cards">
      <article class="card"><span>Venda da oferta</span><strong>${money(rede.venda)}</strong></article>
      <article class="card"><span>Venda total das lojas</span><strong>${money(rede.total)}</strong></article>
      <article class="card"><span>Participação</span><strong>${pct(rede.participacao)}</strong></article>
      <article class="card"><span>Produtos de oferta</span><strong>${result.quality.produtosOferta.toLocaleString("pt-BR")}</strong></article>
      <article class="card"><span>Lucro bruto</span><strong>${money(rede.lucro)}</strong><em>VLRLUCRO</em></article>
      <article class="card"><span>Margem pelo custo bruto</span><strong>${money(rede.margem)}</strong><em>Venda − custo bruto</em></article>
    </div>
    <p class="note">A participação é a venda dos quatro dias dividida pelo valor de Lojas.xlsx. As duas colunas de resultado não são a mesma conta.</p>`;
}

function renderLojas(result) {
  view.innerHTML = table([
    { label: "Loja", cell: (row) => row.nome },
    { label: "Oferta", num: true, cell: (row) => money(row.venda) },
    { label: "Total da loja", num: true, cell: (row) => money(row.totalLoja) },
    { label: "Participação", num: true, cell: (row) => pct(row.participacao) },
    { label: "Lucro bruto", num: true, cell: (row) => money(row.lucro) },
    { label: "Margem custo bruto", num: true, cell: (row) => money(row.margem) },
    { label: "Ruptura", num: true, cell: (row) => qty(row.ruptura) },
    { label: "Irregular", num: true, cell: (row) => qty(row.irregular) },
    { label: "Sem venda com saldo", num: true, cell: (row) => qty(row.semVendaSaldo) },
  ], result.lojas);
  bindFilters(result.lojas);
}

function renderBuyers(result) {
  view.innerHTML = table([
    { label: "Comprador", cell: (row) => row.comprador },
    { label: "Venda", num: true, cell: (row) => money(row.venda) },
    { label: "Lucro bruto", num: true, cell: (row) => money(row.lucro) },
    { label: "Margem custo bruto", num: true, cell: (row) => money(row.margem) },
    { label: "Posicionado na quinta", num: true, cell: (row) => row.comPosicao ? pct(row.posicionados / row.comPosicao) : "—" },
    { label: "Ruptura", num: true, cell: (row) => qty(row.ruptura) },
    { label: "Ruptura provável", num: true, cell: (row) => qty(row.provavel) },
    { label: "Irregular", num: true, cell: (row) => qty(row.irregular) },
    { label: "Sem entrada", num: true, cell: (row) => qty(row.excecaoSem) },
    { label: "Sem venda com saldo", num: true, cell: (row) => qty(row.semVendaSaldo) },
    { label: "Automático", num: true, cell: (row) => qty(row.automatico) },
    { label: "Manual", num: true, cell: (row) => qty(row.manual) },
    { label: "% automático", num: true, cell: (row) => (row.automatico + row.manual) ? pct(row.automatico / (row.automatico + row.manual)) : "—" },
    { label: "Embalagem", num: true, cell: (row) => qty(row.embalagem) },
    { label: "Matéria-prima", num: true, cell: (row) => qty(row.materia) },
    { label: "Uso e consumo", num: true, cell: (row) => qty(row.uso) },
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
    { label: "Loja", cell: (row) => row.lojaNome },
    { label: "Produto", cell: (row) => row.produto },
    { label: "Descrição", cell: (row) => row.descricao },
    { label: "Comprador", cell: (row) => row.comprador },
    { label: "Relação", cell: (row) => label[row.relacao] || row.relacao },
    { label: "Pedidos manuais", num: true, cell: (row) => qty(row.manuais) },
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
