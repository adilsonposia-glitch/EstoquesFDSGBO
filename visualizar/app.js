import { analyze, lojasFromXlsx, LOJAS, RETAIL } from "./engine.js?v=19";

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
  departamento: "",
  secao: "",
  busca: "",
  texto: "",
  grupo: "zero",
  coverLimit: 1,
  files: null,
  semanas: [],
  repeticao: "",
  sortKey: "",
  sortDir: "asc",
  anterior: null,
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

const NOME_SEGMENTO = {
  1: "Varejo",
  2: "iFood",
  3: "Delivery",
  4: "Superclube",
  5: "Cafeteria",
  6: "Restaurante",
  7: "99 Food",
  100: "Rock in Rio",
};

function nomeSegmento(codigo) {
  const nome = NOME_SEGMENTO[String(codigo).trim()];
  return nome ? `${codigo} · ${nome}` : String(codigo);
}

function dica(texto, esc, canto = false) {
  return `<i class="hint${canto ? " hint-canto" : ""}" tabindex="0">?<span class="hint-box">${esc(texto)}</span></i>`;
}

function parte(quantidade, base) {
  if (!base) return "—";
  if (quantidade === base) return "total";
  return pct(quantidade / base);
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
  const recebidos = (state.foco === "produto" || state.foco === "departamento" || state.foco === "secao") && (state.sortKey === "automatico" || state.sortKey === "manual" || state.sortKey === "ambos");
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

const MESES = { jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06", jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12" };

function stockFileDate(name) {
  const match = String(name).match(/^estoque\s+(\d{2})([a-z]{3})(\d{2})\.txt$/i);
  if (!match) return "";
  const month = MESES[match[2].toLowerCase()];
  if (!month) return "";
  return `${match[1]}-${month}-20${match[3]}`;
}

const SEMANAS_KEY = "fds-oferta-semanas";

function semanasGuardadas() {
  try {
    const todas = JSON.parse(localStorage.getItem(SEMANAS_KEY) || "[]");
    return Array.isArray(todas) ? todas.filter((item) => item && item.inicio && item.fim && Array.isArray(item.produtos)) : [];
  } catch {
    return [];
  }
}

function gravarSemanas(todas) {
  const ultimas = [...todas].sort((a, b) => diaNumero(a.inicio) - diaNumero(b.inicio)).slice(-4);
  localStorage.setItem(SEMANAS_KEY, JSON.stringify(ultimas));
  state.semanas = ultimas;
}

function guardarSemana(result) {
  const produtos = [...new Set(result.details.map((row) => String(row.produto)))];
  const semana = { inicio: result.periodo[0], fim: result.periodo[3], produtos };
  const todas = semanasGuardadas().filter((item) => item.inicio !== semana.inicio);
  todas.push(semana);
  gravarSemanas(todas);
}

function produtosDoArquivoDeOferta(text) {
  const produtos = new Set();
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 1; index < rows.length; index += 1) {
    if (!rows[index]) continue;
    const parts = rows[index].split(";");
    if (parts.length < 7 || !RETAIL.includes(parts[0])) continue;
    produtos.add(parts[6]);
  }
  return [...produtos];
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
  const found = { sales: [], stocks: [], buffers: {} };
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file") continue;
    const date = name.match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
    if (date) {
      found.sales.push({ date: date[1], handle });
      continue;
    }
    const stockDate = stockFileDate(name);
    if (stockDate) {
      found.stocks.push({ date: stockDate, handle });
      continue;
    }
    const key = name.toLowerCase();
    if (key.startsWith("ofertasdoper")) {
      found.buffers.ofertas = handle;
      continue;
    }
    if (["entradas.txt", "dimproduto.txt", "automatico.txt", "lojas.xlsx"].includes(key)) {
      found.buffers[key] = handle;
    }
  }
  return found;
}

async function collectListing(base) {
  const listing = await fetch(base);
  if (!listing.ok) throw new Error("sem listagem");
  const html = await listing.text();
  const names = [...html.matchAll(/href="([^"]+)"/g)].map((match) => decodeURIComponent(match[1].split("/").pop()));
  const found = { sales: [] };
  for (const name of names) {
    const date = name.match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
    if (date) found.sales.push(date[1]);
  }
  found.sales.sort();
  return { names, found };
}

async function lembrarSemanaDaRaiz() {
  const raiz = await collectListing("../");
  if (raiz.found.sales.length !== 4) return;
  const inicio = raiz.found.sales[0];
  const fim = raiz.found.sales[raiz.found.sales.length - 1];
  const guardadas = semanasGuardadas();
  if (guardadas.some((item) => item.inicio === inicio)) return;
  const offerName = raiz.names.find((name) => name.toLowerCase().startsWith("ofertasdoper"));
  if (!offerName) return;
  const response = await fetch(`../${encodeURIComponent(offerName)}`);
  if (!response.ok) return;
  guardadas.push({ inicio, fim, produtos: produtosDoArquivoDeOferta(decode(await response.arrayBuffer())) });
  gravarSemanas(guardadas);
}

async function loadFromListing(base, discovered) {
  const sales = [];
  let step = 0;
  const jobs = discovered.found.sales.length + 6;
  const offerName = discovered.names.find((name) => name.toLowerCase().startsWith("ofertasdoper"));
  if (!offerName) throw new Error("Falta o arquivo Ofertas do período.");
  if (!discovered.found.sales.length) throw new Error("A pasta precisa ter quatro arquivos de venda, de quinta a domingo.");
  for (const date of discovered.found.sales) {
    step += 1;
    setProgress(step / jobs, `Lendo ${date}.txt`);
    const response = await fetch(`${base}${encodeURIComponent(`${date}.txt`)}`);
    sales.push({ date, text: decode(await response.arrayBuffer()) });
  }
  async function textFile(name) {
    step += 1;
    setProgress(step / jobs, `Lendo ${name}`);
    const response = await fetch(`${base}${encodeURIComponent(name)}`);
    if (!response.ok) throw new Error(`Arquivo ausente: ${name}`);
    return decode(await response.arrayBuffer());
  }
  const inicioName = discovered.names.find((name) => stockFileDate(name) === discovered.found.sales[0]);
  const fimName = discovered.names.find((name) => stockFileDate(name) === discovered.found.sales[discovered.found.sales.length - 1]);
  if (!inicioName) throw new Error(`Falta o estoque de ${discovered.found.sales[0]}.`);
  if (!fimName) throw new Error(`Falta o estoque de ${discovered.found.sales[discovered.found.sales.length - 1]}.`);
  const inicio = await textFile(inicioName);
  const fim = await textFile(fimName);
  const entradas = await textFile("Entradas.txt");
  const dim = await textFile("Dimproduto.txt");
  const automatico = await textFile("Automatico.txt");
  const ofertas = await textFile(offerName);
  step += 1;
  setProgress(0.92, "Lendo Lojas.xlsx");
  let lojasResponse = await fetch(`${base}${encodeURIComponent("Lojas.xlsx")}`);
  if (!lojasResponse.ok) lojasResponse = await fetch("../Lojas.xlsx");
  if (!lojasResponse.ok) throw new Error("Arquivo ausente: Lojas.xlsx");
  const lojas = await lojasFromXlsx(await lojasResponse.arrayBuffer());
  return { sales, inicio, fim, entradas, dim, automatico, lojas, ofertas };
}

async function loadServerFiles() {
  const nova = `../${encodeURIComponent("Entrada Novo Período")}/`;
  let base = "../";
  let discovered = null;
  try {
    const candidata = await collectListing(nova);
    if (candidata.found.sales.length === 4) {
      base = nova;
      discovered = candidata;
    }
  } catch {
    base = "../";
  }
  if (!discovered) discovered = await collectListing(base);
  if (base !== "../") await lembrarSemanaDaRaiz();
  const files = await loadFromListing(base, discovered);
  if (base !== "../") files.anterior = await vendaDaRaiz();
  return files;
}

function numeroBr(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function somarVendaDiaria(text, acc) {
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 1; index < rows.length; index += 1) {
    if (!rows[index]) continue;
    const parts = rows[index].split(";");
    if (parts.length < 7 || !RETAIL.includes(parts[0])) continue;
    const valor = numeroBr(parts[4]);
    const quantidade = numeroBr(parts[3]);
    const atual = acc.produtos[parts[1]] || { valor: 0, quantidade: 0 };
    atual.valor += valor;
    atual.quantidade += quantidade;
    acc.produtos[parts[1]] = atual;
    acc.lojas[parts[0]] = (acc.lojas[parts[0]] || 0) + valor;
    acc.total += valor;
  }
}

function somarOfertaPorLoja(text, acc) {
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 1; index < rows.length; index += 1) {
    if (!rows[index]) continue;
    const parts = rows[index].split(";");
    if (parts.length < 11 || !RETAIL.includes(parts[0])) continue;
    const valor = numeroBr(parts[10]);
    acc.oferta[parts[0]] = (acc.oferta[parts[0]] || 0) + valor;
    acc.vendaOferta += valor;
  }
}

async function vendaDaRaiz() {
  const raiz = await collectListing("../");
  if (raiz.found.sales.length !== 4) return null;
  const acc = { produtos: {}, lojas: {}, oferta: {}, total: 0, vendaOferta: 0 };
  for (const date of raiz.found.sales) {
    setProgress(0.9, `Lendo a semana anterior, ${date}.txt`);
    const response = await fetch(`../${encodeURIComponent(`${date}.txt`)}`);
    if (!response.ok) return null;
    somarVendaDiaria(decode(await response.arrayBuffer()), acc);
  }
  const offerName = raiz.names.find((name) => name.toLowerCase().startsWith("ofertasdoper"));
  if (offerName) {
    const response = await fetch(`../${encodeURIComponent(offerName)}`);
    if (response.ok) somarOfertaPorLoja(decode(await response.arrayBuffer()), acc);
  }
  return {
    inicio: raiz.found.sales[0],
    fim: raiz.found.sales[raiz.found.sales.length - 1],
    produtos: acc.produtos,
    lojas: acc.lojas,
    oferta: acc.oferta,
    total: acc.total,
    vendaOferta: acc.vendaOferta,
  };
}

const MARGEM = 0.05;

function vendaAtualPorProduto(result) {
  const mapa = new Map();
  for (const row of result.details) {
    const id = String(row.produto);
    const atual = mapa.get(id) || { produto: row.produto, descricao: row.descricao, comprador: row.comprador, valor: 0, quantidade: 0 };
    atual.valor += row.venda;
    atual.quantidade += row.quantidade;
    mapa.set(id, atual);
  }
  return mapa;
}

function comparacaoVenda(result) {
  const anterior = state.anterior;
  if (!anterior) return null;
  const info = repeticaoOferta(result);
  if (!info.anterior) return null;
  const atuais = vendaAtualPorProduto(result);
  const linhas = [];
  for (const [id, item] of atuais) {
    const antes = anterior.produtos[id] || { valor: 0, quantidade: 0 };
    const delta = item.valor - antes.valor;
    const repetiu = Boolean(info.naAnterior.get(id));
    let faixa = "manteve";
    if (antes.valor <= MARGEM && item.valor <= MARGEM) faixa = "zero";
    else if (antes.valor <= MARGEM && item.valor > MARGEM) faixa = "passou";
    else if (item.valor > antes.valor + MARGEM) faixa = "subiu";
    else if (antes.valor > item.valor + MARGEM) faixa = "caiu";
    linhas.push({ ...item, antes: antes.valor, qtdAntes: antes.quantidade, delta, percentual: antes.valor > MARGEM ? delta / antes.valor : null, repetiu, faixa });
  }
  const repetidos = linhas.filter((row) => row.repetiu);
  const estreantes = linhas.filter((row) => !row.repetiu);
  const contar = (lista, faixa) => lista.filter((row) => row.faixa === faixa);
  const soma = (lista, campo) => lista.reduce((total, row) => total + row[campo], 0);
  const lojas = result.lojas.map((loja) => {
    const ofertaAntes = anterior.oferta[loja.id] || 0;
    const totalAntes = anterior.lojas[loja.id] || 0;
    return {
      nome: loja.nome,
      antes: totalAntes ? ofertaAntes / totalAntes : 0,
      agora: loja.participacao,
      pontos: (loja.participacao - (totalAntes ? ofertaAntes / totalAntes : 0)) * 100,
      ofertaAntes,
      ofertaAgora: loja.venda,
    };
  }).sort((a, b) => a.pontos - b.pontos);
  return {
    inicio: anterior.inicio,
    fim: anterior.fim,
    repetidos,
    estreantes,
    subiu: contar(repetidos, "subiu"),
    caiu: contar(repetidos, "caiu"),
    zero: contar(repetidos, "zero"),
    passou: contar(repetidos, "passou"),
    estreiaZero: estreantes.filter((row) => row.valor <= MARGEM),
    deltaRepetidos: soma(repetidos, "delta"),
    vendaRepetidosAntes: soma(repetidos, "antes"),
    vendaRepetidosAgora: soma(repetidos, "valor"),
    vendaEstreantes: soma(estreantes, "valor"),
    vendaEstreantesAntes: soma(estreantes, "antes"),
    vendaOfertaAntes: anterior.vendaOferta,
    totalAntes: anterior.total,
    lojas,
  };
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
  const inicioItem = found.stocks.find((item) => item.date === sales[0].date);
  const fimItem = found.stocks.find((item) => item.date === sales[sales.length - 1].date);
  if (!sales.length || !inicioItem) throw new Error(sales.length ? `Falta o estoque de ${sales[0].date}.` : "A pasta precisa ter quatro arquivos de venda, de quinta a domingo.");
  if (!fimItem) throw new Error(`Falta o estoque de ${sales[sales.length - 1].date}.`);
  setProgress(0.45, `Lendo estoque de ${inicioItem.date}`);
  const inicio = decode(await readHandle(inicioItem.handle));
  setProgress(0.5, `Lendo estoque de ${fimItem.date}`);
  const fim = decode(await readHandle(fimItem.handle));
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
    state.anterior = files.anterior || null;
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
  if (state.departamento) rows = rows.filter((row) => row.n1 === state.departamento);
  if (state.secao) rows = rows.filter((row) => row.n2 === state.secao);
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
    if (state.grupo === "com-venda") rows = rows.filter((row) => row.vendeu);
    if (state.grupo === "sem-venda-total") rows = rows.filter((row) => !row.vendeu);
    if (state.grupo === "so-automatico") rows = rows.filter((row) => row.automatico && !row.manual);
    if (state.grupo === "so-manual") rows = rows.filter((row) => row.manual && !row.automatico);
    if (state.grupo === "produto-sem-venda") {
      const comVenda = new Set(result.details.filter((row) => row.vendeu).map((row) => row.produto));
      rows = rows.filter((row) => !comVenda.has(row.produto));
    }
  }
  return rows;
}

function filters() {
  const result = state.result;
  const stores = Object.entries(LOJAS).filter(([id]) => id !== "70");
  const buyers = [...new Set(result.compradores.map((row) => row.comprador))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const departamentos = [...new Set(result.details.map((row) => row.n1).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const secoes = [...new Set(result.details.filter((row) => !state.departamento || row.n1 === state.departamento).map((row) => row.n2).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const esc = (value) => String(value).replace(/"/g, "&quot;");
  return `
    <div class="filters">
      <select id="f-loja"><option value="">Todas as lojas</option>${stores.map(([id, name]) => `<option value="${id}" ${state.loja === id ? "selected" : ""}>${name}</option>`).join("")}</select>
      <select id="f-comprador"><option value="">Todos os compradores</option>${buyers.map((name) => `<option ${state.comprador === name ? "selected" : ""}>${esc(name)}</option>`).join("")}</select>
      <select id="f-departamento"><option value="">Todos os departamentos</option>${departamentos.map((name) => `<option value="${esc(name)}" ${state.departamento === name ? "selected" : ""}>${name}</option>`).join("")}</select>
      <select id="f-secao"><option value="">Todas as seções</option>${secoes.map((name) => `<option value="${esc(name)}" ${state.secao === name ? "selected" : ""}>${name}</option>`).join("")}</select>
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
  const departamento = document.querySelector("#f-departamento");
  const secao = document.querySelector("#f-secao");
  if (departamento) departamento.onchange = () => { state.departamento = departamento.value; state.secao = ""; state.page = 0; render(); };
  if (secao) secao.onchange = () => { state.secao = secao.value; state.page = 0; render(); };
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
    { key: "entrada-aut", label: "Entrada automática", num: true, value: (row) => row.entradaAutomatica, cell: (row) => qty(row.entradaAutomatica) },
    { key: "entrada-man", label: "Entrada manual", num: true, value: (row) => row.entradaManual, cell: (row) => qty(row.entradaManual) },
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

function classRows(details, campo) {
  const vazio = campo === "n1" ? "Sem departamento" : "Sem seção";
  const map = new Map();
  for (const row of details) {
    const nome = row[campo] || vazio;
    let item = map.get(nome);
    if (!item) {
      item = {
        nome,
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
      map.set(nome, item);
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
  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function campanha(result) {
  const rows = result.details;
  const contagem = (predicado) => rows.reduce((total, row) => total + (predicado(row) ? 1 : 0), 0);
  const comVenda = new Set();
  for (const row of rows) if (row.vendeu) comVenda.add(row.produto);
  const produtos = result.quality.produtosOferta;
  const pares = rows.length;
  const duas = contagem((row) => row.automatico && row.manual);
  const soAuto = contagem((row) => row.automatico && !row.manual);
  const soManual = contagem((row) => row.manual && !row.automatico);
  const receberam = duas + soAuto + soManual;
  const sobrePares = "O percentual é sobre os pares loja e produto da oferta.";
  const sobreRecebidos = "O percentual é sobre os pares que receberam automático, manual ou os dois.";
  return [
    ["Oferta", "Produtos distintos no arquivo de ofertas e o cruzamento de cada um com as 13 lojas.", [
      ["", "Produtos de oferta", produtos, produtos, "Produtos distintos em Ofertas do período, nas 13 lojas. Este é o total dos produtos."],
      ["produto-sem-venda", "Sem venda em loja nenhuma", produtos - comVenda.size, produtos, "Produto de oferta que não aparece nos quatro arquivos diários, em nenhuma das 13 lojas. O percentual é sobre os produtos de oferta."],
      ["", "Pares loja e produto", pares, pares, "Cada produto de oferta em cada uma das 13 lojas. Este é o total dos pares. Venda, estoque e a conta de saldo usam esses pares."],
    ]],
    ["Venda", "Pares da oferta encontrados, ou não, nos quatro arquivos diários.", [
      ["com-venda", "Pares com venda", contagem((row) => row.vendeu), pares, `Par loja e produto que aparece em um dos quatro arquivos diários. ${sobrePares}`],
      ["sem-venda-total", "Pares sem venda", contagem((row) => !row.vendeu), pares, `Par da oferta que não aparece nos arquivos diários. ${sobrePares}`],
      ["sem-venda", "Sem venda com saldo", contagem((row) => !row.vendeu && row.situacao === "positivo"), pares, `Par sem venda e com ESTOQUE_DTBASE de domingo maior que zero. Já entra em pares sem venda. ${sobrePares}`],
    ]],
    ["Estoque", "Posição de domingo e a comparação com o saldo de quinta.", [
      ["excesso", "Excesso de estoque", contagem((row) => row.irregular), pares, `Saldo de domingo maior que o saldo de quinta, os dois em ESTOQUE_DTBASE, com ou sem venda. ${sobrePares}`],
      ["ruptura", "Ruptura", contagem((row) => row.situacao === "zero"), pares, `Saldo de domingo igual a zero, quando existe linha de estoque nesse dia. Par sem linha não entra. ${sobrePares}`],
      ["provavel", "Ruptura provável", contagem((row) => row.provavel), pares, `Houve venda e o saldo de domingo cobre menos de um dia do ritmo desta semana. ${sobrePares}`],
      ["sem-entrada", "Sem entrada", contagem((row) => row.excecao === "sem-entrada"), pares, `O saldo de domingo ficou maior que o de quinta e Entradas.txt não tem QTDITEM nesse par. ${sobrePares}`],
    ]],
    ["Abastecimento", "Modalidade pela quantidade recebida em Automatico.txt.", [
      ["ambos", "Duas modalidades", duas, receberam, `O par tem QTDRECEBIDA no automático e no manual. ${sobreRecebidos}`],
      ["so-automatico", "Só automático", soAuto, receberam, `QTDRECEBIDA automática maior que zero e manual igual a zero. ${sobreRecebidos}`],
      ["so-manual", "Só manual", soManual, receberam, `QTDRECEBIDA manual maior que zero e automática igual a zero. ${sobreRecebidos}`],
    ]],
  ];
}

function renderCapa(result) {
  const rede = result.rede;
  const label = state.foco === "loja" ? "Loja" : state.foco === "produto" ? "Produto" : state.foco === "departamento" ? "Departamento" : state.foco === "secao" ? "Seção" : "Comprador";
  let people = state.foco === "loja"
    ? result.lojas
    : state.foco === "produto"
      ? productRows(result.details)
      : state.foco === "departamento"
        ? classRows(result.details, "n1")
        : state.foco === "secao"
          ? classRows(result.details, "n2")
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
      const recebidos = (state.foco === "produto" || state.foco === "departamento" || state.foco === "secao") && (id === "automatico" || id === "manual" || id === "ambos");
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
      <article class="card">${dica("Soma de VLRTOTALVDA em Ofertas do período, nas 13 lojas.", esc, true)}<span>Venda da oferta</span><strong>${money(rede.venda)}</strong></article>
      <article class="card">${dica("Soma de VLRVENDA dos quatro arquivos diários, nas 13 lojas. Inclui o que não estava em oferta.", esc, true)}<span>Venda total do período</span><strong>${money(rede.total)}</strong></article>
      <article class="card">${dica("Venda da oferta dividida pela venda total do período.", esc, true)}<span>Participação da oferta</span><strong>${pct(rede.participacao)}</strong></article>
      <article class="card">${dica("Produtos distintos em Ofertas do período, nas 13 lojas.", esc, true)}<span>Produtos de oferta</span><strong>${result.quality.produtosOferta.toLocaleString("pt-BR")}</strong></article>
      <article class="card">${dica("Soma de VLRLUCRO dos pares loja e produto que venderam. O valor já vem no arquivo diário.", esc, true)}<span>Lucro bruto</span><strong>${money(rede.lucro)}</strong><em>VLRLUCRO</em></article>
      <article class="card">${dica("Venda dos itens de oferta menos o custo bruto da venda. É outra conta, separada do lucro bruto.", esc, true)}<span>Margem pelo custo bruto</span><strong>${money(rede.margem)}</strong><em>Venda − custo bruto</em></article>
    </div>
    ${htmlLancamento(result, esc)}
    <div class="campanha-grade">${campanha(result).map(([titulo, resumo, linhas]) => `<article class="card campanha-col">${dica(resumo, esc, true)}<span class="campanha-titulo">${titulo}</span>${linhas.map(([id, nome, quantidade, base, texto]) => `<button type="button" class="stat" ${id ? `data-campanha="${id}" data-rotulo="${esc(nome)}"` : ""}><span class="stat-nome"><em>${nome}</em></span><span class="stat-fim"><span class="stat-num"><strong>${itens(quantidade)}</strong><small class="parte">${parte(quantidade, base)}</small></span>${dica(texto, esc)}</span></button>`).join("")}</article>`).join("")}</div>
    ${repeticao}
    <div class="switch">
      <button type="button" class="${state.foco === "comprador" ? "" : "secondary"}" data-foco="comprador">Por comprador</button>
      <button type="button" class="${state.foco === "loja" ? "" : "secondary"}" data-foco="loja">Por loja</button>
      <button type="button" class="${state.foco === "produto" ? "" : "secondary"}" data-foco="produto">Por produto</button>
      <button type="button" class="${state.foco === "departamento" ? "" : "secondary"}" data-foco="departamento">Por departamento</button>
      <button type="button" class="${state.foco === "secao" ? "" : "secondary"}" data-foco="secao">Por seção</button>
    </div>
    ${search}
    <div class="panel" id="panel">
      <div class="panel-bar"><button type="button" id="fullscreen">${document.fullscreenElement ? "Sair da tela cheia" : "Tela cheia"}</button></div>
      <div class="table-wrap"><table class="capa-table"><thead><tr><th><button type="button" class="sort" data-sort="nome">${label}${sortMark("nome")}</button></th>${head}</tr></thead><tbody>${body || `<tr><td colspan="${CAPA_METRICS.length + 1 + (mostraVezes ? 1 : 0)}">Nenhum item neste filtro.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${people.length.toLocaleString("pt-BR")} linhas · página ${state.page + 1} de ${pages}</span><span><button type="button" id="prev">Anterior</button> <button type="button" id="next">Próxima</button></span></div>
    </div>
    <p class="note">O número em vermelho é a quantidade de itens do percentual. Automático e manual dividem as linhas de revenda; na visão por produto, dividem as lojas que receberam o item. Dois abastecimentos é a parcela dos produtos recebidos que chegaram no automático e no manual. O clique abre esses produtos. O ponto de interrogação explica o critério da linha.</p>`;
  view.querySelectorAll(".hint").forEach((el) => {
    el.addEventListener("click", (event) => event.stopPropagation());
    el.addEventListener("mousedown", (event) => event.stopPropagation());
  });
  const detalheOfertas = view.querySelector("#detalhe-ofertas");
  if (detalheOfertas) {
    detalheOfertas.onclick = () => {
      state.view = "detalhe";
      state.grupo = "lancamento";
      state.detalheTitulo = "Lançamento das ofertas";
      state.page = 0;
      state.sortKey = "";
      state.sortDir = "desc";
      state.texto = "";
      state.loja = "";
      state.comprador = "";
      state.produto = "";
      state.departamento = "";
      state.secao = "";
      state.repeticao = "";
      render();
    };
  }
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
      state.departamento = "";
      state.secao = "";
      if (state.foco === "loja") state.loja = button.dataset.loja;
      else if (state.foco === "comprador") state.comprador = button.dataset.comprador;
      else if (state.foco === "departamento") state.departamento = button.dataset.nome;
      else if (state.foco === "secao") state.secao = button.dataset.nome;
      else state.produto = button.dataset.produto;
      const metric = CAPA_METRICS.find(([id]) => id === state.grupo);
      state.detalheTitulo = `${button.dataset.nome} · ${metric[1]}`;
      state.repeticao = "";
      render();
    };
  });
  view.querySelectorAll(".comp").forEach((button) => {
    button.onclick = () => {
      state.view = "detalhe";
      state.grupo = "venda-semana";
      state.repeticao = button.dataset.faixa;
      state.detalheTitulo = button.dataset.rotulo;
      state.page = 0;
      state.texto = "";
      state.sortKey = "";
      state.sortDir = "desc";
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
  view.querySelectorAll("[data-campanha]").forEach((button) => {
    button.onclick = () => {
      state.view = "detalhe";
      state.grupo = button.dataset.campanha;
      state.detalheTitulo = button.dataset.rotulo;
      state.repeticao = "";
      state.page = 0;
      state.texto = "";
      state.loja = "";
      state.comprador = "";
      state.produto = "";
      state.departamento = "";
      state.secao = "";
      state.sortKey = "";
      render();
    };
  });
  bindSort();
  bindFullscreen();
}

function htmlLancamento(result, esc) {
  const item = result.lancamento;
  if (!item || !result.segmentos) return "";
  const exemplos = item.exemplos.map((row) => `<li><strong>${esc(row.nome)}</strong> em ${itens(row.codigos)} códigos</li>`).join("");
  const linhas = result.segmentos.map((row) => `<tr><td>${esc(nomeSegmento(row.segmento))}</td><td class="num">${itens(row.itens)}</td><td class="num">${money(row.venda)}</td><td class="num">${pct(row.participacao)}</td></tr>`).join("");
  const somaItens = result.segmentos.reduce((total, row) => total + row.itens, 0);
  return `<section class="leitura">
      <article class="card leitura-nota">
        <div class="leitura-topo"><span>Lançamento das ofertas ${dica("Cada código é um SEQPROMOCAO. O texto PROMOCAO é livre e não é rebatizado.", esc)}</span><button type="button" id="detalhe-ofertas">Detalhe</button></div>
        <p>O nome da oferta é texto livre. Foram digitados <strong>${itens(item.codigos)}</strong> códigos e só <strong>${itens(item.nomes)}</strong> nomes. <strong>${itens(item.nomesRepetidos)}</strong> nomes juntam códigos diferentes, e <strong>${itens(item.codigosEmVariosSegmentos)}</strong> códigos foram lançados em mais de um segmento. A performance de uma ação não se apura pelo nome.</p>
        <ul>${exemplos}</ul>
      </article>
      <article class="card leitura-tabela">
        <span>Itens e venda por segmento ${dica("O número é o NROSEGMENTO do arquivo. O nome ao lado é o canal. Itens, valor e participação saem do arquivo de ofertas, sem recálculo.", esc)}</span>
        <table>
          <thead><tr><th>Segmento</th><th class="num">Itens em oferta</th><th class="num">Valor vendido</th><th class="num">Part. %</th></tr></thead>
          <tbody>${linhas}<tr class="total"><td>Total da oferta</td><td class="num">${itens(result.quality.produtosOferta)}</td><td class="num">${money(result.rede.venda)}</td><td class="num">${pct(1)}</td></tr></tbody>
        </table>
        <p class="note">O número é o NROSEGMENTO do arquivo. O nome ao lado é o canal. Part. % é a venda do segmento sobre o total vendido em oferta. A soma dos itens (${itens(somaItens)}) passa de ${itens(result.quality.produtosOferta)} porque o mesmo produto entra em mais de um segmento.</p>
      </article>
    </section>`;
}

function htmlRepeticao(result, info, esc) {
  const guardadas = state.semanas.map((item) => `${diaCurto(item.inicio)} a ${diaCurto(item.fim)}`).join(" · ");
  if (!info.anteriores.length) {
    return `<h2 class="section">Itens que repetem</h2><p class="note">A lista dos produtos que já estiveram em oferta abre nesta área, no clique de cada percentual, quando a próxima semana for atualizada. Ficam guardadas as quatro últimas. A semana nova entra na pasta do projeto, no lugar dos arquivos atuais, ou em outra pasta pelo botão Escolher pasta. A pasta lida precisa ter só os quatro dias dessa semana, de quinta a domingo.</p>`;
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
    const texto = id === "estreia"
      ? "Produto desta oferta que não estava na oferta da semana anterior. O percentual é sobre os produtos de oferta desta semana."
      : id === "anterior"
        ? "Produto desta oferta que já estava na oferta da semana anterior. O percentual é sobre os produtos de oferta desta semana."
        : "Faixa da memória das semanas anteriores. O percentual é sobre os produtos de oferta desta semana.";
    return `<button type="button" class="card repeat" data-repeticao="${id}" data-rotulo="${esc(rotulo)}">${dica(texto, esc, true)}<span>${esc(rotulo)}</span><strong>${pct(ratio)}</strong><em class="itens">${itens(quantidade)}</em></button>`;
  }).join("");
  const aviso = n >= 3 ? " Em pelo menos 2 semanas inclui quem esteve em 2 e em 3." : "";
  return `<h2 class="section">Itens que repetem</h2><div class="cards">${cards}</div><p class="note">O clique abre os produtos dessa faixa. Percentual dos produtos de oferta desta semana. Semanas guardadas: ${guardadas}.${aviso} A mais antiga sai ao chegar em quatro.</p>${htmlComparacao(result, esc)}`;
}

function htmlComparacao(result, esc) {
  const comp = comparacaoVenda(result);
  if (!comp) return "";
  const card = (id, rotulo, quantidade, base, texto) => `<button type="button" class="card comp" data-faixa="${id}" data-rotulo="${esc(rotulo)}">${dica(texto, esc, true)}<span>${esc(rotulo)}</span><strong>${itens(quantidade)}</strong><em class="parte">${parte(quantidade, base)}</em></button>`;
  const repetidos = comp.repetidos.length;
  const estreantes = comp.estreantes.length;
  const cards = [
    card("subiu", "Repetidos que venderam mais", comp.subiu.length, repetidos, "Produto que repetiu na oferta e a venda dos arquivos diários desta semana passou da anterior. O percentual é sobre os produtos que repetiram."),
    card("caiu", "Repetidos que venderam menos", comp.caiu.length, repetidos, "Produto que repetiu na oferta e a venda dos arquivos diários desta semana ficou abaixo da anterior. O percentual é sobre os produtos que repetiram."),
    card("zero", "Repetidos sem venda nas duas semanas", comp.zero.length, repetidos, "Produto que repetiu na oferta e não teve venda nos arquivos diários das duas semanas. Não usa ruptura. O percentual é sobre os produtos que repetiram."),
    card("passou", "Repetidos que passaram a vender", comp.passou.length, repetidos, "Produto que repetiu na oferta, não vendeu na semana anterior e vendeu nesta. O percentual é sobre os produtos que repetiram."),
    card("estreia-zero", "Estreantes sem venda", comp.estreiaZero.length, estreantes, "Produto que estreou nesta oferta e não teve venda nesta semana. Na semana anterior ele não estava na oferta, então essa semana não entra como venda. O percentual é sobre os estreantes."),
  ].join("");
  const ranking = (titulo, linhas) => {
    const body = linhas.map((row) => `<tr><td>${row.produto}</td><td>${esc(row.descricao)}</td><td class="num">${money(row.antes)}</td><td class="num">${money(row.valor)}</td><td class="num">${money(row.delta)}</td><td class="num">${row.percentual == null ? "—" : pct(row.percentual)}</td></tr>`).join("");
    return `<div><h2>${esc(titulo)}</h2><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Descrição</th><th class="num">Semana anterior</th><th class="num">Esta semana</th><th class="num">Diferença</th><th class="num">Variação</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  };
  const altas = [...comp.subiu].sort((a, b) => b.delta - a.delta).slice(0, 8);
  const quedas = [...comp.caiu].sort((a, b) => a.delta - b.delta).slice(0, 8);
  const estreiaAlta = [...comp.estreantes].sort((a, b) => b.valor - a.valor).slice(0, 8);
  const lojas = comp.lojas.map((loja) => `<tr><td>${esc(loja.nome)}</td><td class="num">${pct(loja.antes)}</td><td class="num">${pct(loja.agora)}</td><td class="num">${loja.pontos.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td><td class="num">${money(loja.ofertaAgora - loja.ofertaAntes)}</td></tr>`).join("");
  const partAntes = comp.totalAntes ? comp.vendaOfertaAntes / comp.totalAntes : 0;
  const partAgora = result.rede.total ? result.rede.venda / result.rede.total : 0;
  return `
    <h2 class="section">Venda em relação à semana ${diaCurto(comp.inicio)} a ${diaCurto(comp.fim)}</h2>
    <div class="cards">${cards}</div>
    <p class="note">A venda do produto é a dos quatro arquivos diários. O percentual dos quatro primeiros cartões é sobre os ${itens(comp.repetidos.length)} que repetiram. O de estreantes sem venda é sobre os ${itens(comp.estreantes.length)} que estrearam: eles não estavam na oferta da semana anterior, então a venda considerada é a desta semana. Sem venda nas duas semanas vale só para quem repetiu e fica para a RP. Esta comparação não usa ruptura. Os repetidos saíram de ${money(comp.vendaRepetidosAntes)} para ${money(comp.vendaRepetidosAgora)} (${money(comp.deltaRepetidos)}). Os estreantes venderam ${money(comp.vendaEstreantes)} nesta semana.</p>
    <div class="duas-tabelas">${ranking("Maiores altas entre os repetidos", altas)}${ranking("Maiores quedas entre os repetidos", quedas)}</div>
    ${ranking("Maiores vendas entre os estreantes", estreiaAlta)}
    <h2 class="section">Participação da oferta por loja</h2>
    <p class="note">A rede saiu de ${pct(partAntes)} para ${pct(partAgora)}. A participação continua sendo a venda do arquivo de ofertas dividida pela venda da loja.</p>
    <div class="table-wrap"><table><thead><tr><th>Loja</th><th class="num">Semana anterior</th><th class="num">Esta semana</th><th class="num">Pontos</th><th class="num">Diferença da oferta</th></tr></thead><tbody>${lojas}</tbody></table></div>`;
}

function renderLancamento() {
  const item = state.result.lancamento;
  let rows = item?.porNome || [];
  if (state.texto) {
    const query = state.texto.toLocaleLowerCase("pt-BR");
    rows = rows.filter((row) => `${row.nome} ${row.lista}`.toLocaleLowerCase("pt-BR").includes(query));
  }
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  view.innerHTML = `<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button><input id="f-texto" placeholder="Nome ou código" value="${esc(state.texto)}"></div>${table([
    { key: "nome", label: "Nome da oferta", value: (row) => row.nome, cell: (row) => row.nome },
    { key: "codigos", label: "Cadastradas nesse nome", num: true, value: (row) => row.codigos, cell: (row) => itens(row.codigos) },
    { key: "lista", label: "Códigos", value: (row) => row.lista, cell: (row) => row.lista },
  ], rows)}<p class="note">Cada linha é um nome digitado em PROMOCAO. Cadastradas nesse nome é a quantidade de códigos (SEQPROMOCAO) com esse texto. São ${itens(item.nomes)} nomes e ${itens(item.codigos)} códigos.</p>`;
  document.querySelector("#voltar").onclick = voltarCapa;
  bindFilters(rows);
}

function renderDetalhe() {
  if (state.grupo === "repeticao") {
    renderRepeticao();
    return;
  }
  if (state.grupo === "venda-semana") {
    renderVendaSemana();
    return;
  }
  if (state.grupo === "lancamento") {
    renderLancamento();
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
  state.departamento = "";
  state.secao = "";
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

function linhasDaFaixa() {
  const comp = comparacaoVenda(state.result);
  if (!comp) return [];
  const faixas = {
    subiu: comp.subiu,
    caiu: comp.caiu,
    zero: comp.zero,
    passou: comp.passou,
    "estreia-zero": comp.estreiaZero,
  };
  return faixas[state.repeticao] || [];
}

function renderVendaSemana() {
  let rows = linhasDaFaixa();
  if (state.texto) {
    const query = state.texto.toLocaleLowerCase("pt-BR");
    rows = rows.filter((row) => `${row.produto} ${row.descricao} ${row.comprador}`.toLocaleLowerCase("pt-BR").includes(query));
  }
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const estreante = state.repeticao === "estreia-zero";
  view.innerHTML = `<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button><input id="f-texto" placeholder="Produto" value="${esc(state.texto)}"></div>${table([
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "antes", label: "Semana anterior", num: !estreante, value: (row) => estreante ? 0 : row.antes, cell: (row) => estreante ? "Não estava na oferta" : money(row.antes) },
    { key: "valor", label: "Esta semana", num: true, value: (row) => row.valor, cell: (row) => money(row.valor) },
    { key: "delta", label: "Diferença", num: true, value: (row) => row.delta, cell: (row) => estreante ? "—" : money(row.delta) },
    { key: "percentual", label: "Variação", num: true, value: (row) => row.percentual ?? -999, cell: (row) => row.percentual == null || estreante ? "—" : pct(row.percentual) },
  ], rows)}<p class="note">${estreante ? "Estreante começa nesta oferta. Na semana anterior ele não estava na oferta, então essa semana não entra como venda. Sem venda é a desta semana." : "Variação em branco é semana anterior sem venda. A lista sem venda nas duas semanas não separa ruptura."}</p>`;
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
    if (state.departamento && row.n1 !== state.departamento) return false;
    if (state.secao && row.n2 !== state.secao) return false;
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
  const rows = state.view === "detalhe" && state.grupo === "venda-semana"
    ? linhasDaFaixa().map((row) => ({ produto: row.produto, descricao: row.descricao, comprador: row.comprador, semanaAnterior: state.repeticao === "estreia-zero" ? "Não estava na oferta" : row.antes, estaSemana: row.valor, diferenca: state.repeticao === "estreia-zero" ? "" : row.delta, variacao: state.repeticao === "estreia-zero" ? "" : row.percentual }))
    : state.view === "detalhe" && state.grupo === "lancamento"
    ? state.result?.lancamento?.porNome || []
    : state.view === "lojas" ? state.result?.lojas || [] : state.view === "compradores" ? state.result?.compradores || [] : state.view === "datas" ? state.result?.datas || [] : currentRows();
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
  state.departamento = "";
  state.secao = "";
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
