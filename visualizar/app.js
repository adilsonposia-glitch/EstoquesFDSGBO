import { analyze, sobraPorComprador, lojasFromXlsx, LOJAS, RETAIL } from "./engine.js?v=48";

// Os arquivos da semana mudam sem mudar de nome. Sem isso o navegador serve a cópia antiga do cache (já houve Dimproduto antigo na tela).
const buscar = (url) => fetch(url, { cache: "no-store" });

const VIEWS = [
  ["capa", "Capa"],
  ["lojas", "Lojas"],
  ["compradores", "Compradores"],
  ["sobra", "Sobra por comprador"],
  ["ruptura", "Ruptura"],
  ["sem-venda", "Sem venda"],
  ["irregular", "Conta aberta"],
  ["excecao", "Exceção"],
  ["datas", "Datas"],
  ["central", "Central"],
  ["qualidade", "Qualidade"],
];

const state = {
  view: "capa",
  qual: "periodo",
  rotuloPeriodo: "",
  rotuloRaiz: "",
  foco: "comprador",
  detalheTitulo: "",
  result: null,
  page: 0,
  pageSize: 40,
  loja: "",
  lojaGlobal: "",
  cacheLoja: new Map(),
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
function variacaoEstoque(row) {
  if (row.inicial == null || row.final == null || Math.abs(row.inicial) < 0.05) return null;
  return (row.final - row.inicial) / row.inicial;
}
function pctSinal(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const base = pct(Math.abs(value));
  if (value > 0.0000001) return `+${base}`;
  if (value < -0.0000001) return `−${base}`;
  return base;
}
function dataBr(iso) {
  if (!iso || !iso.includes("-")) return "";
  return iso.split("-").reverse().join("/");
}
function equacaoEstoque(partida, entrada, saida, saldo, data) {
  if (partida == null || saldo == null) {
    return saldo == null ? "" : "Posição do arquivo de estoque. Esta pasta não traz entrada e saída.";
  }
  const quando = dataBr(data);
  return `${quando ? `${quando} · ` : ""}${qty(partida)} + ${qty(entrada)} − ${qty(saida)} = ${qty(saldo)}`;
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
  const simbolo = state.sortDir === "asc" ? "↑" : "↓";
  return `<span class="sort-seta ativo">${simbolo}</span>`;
}
function sortSeta(key) {
  const ativo = state.sortKey === key;
  const simbolo = !ativo ? "↕" : state.sortDir === "asc" ? "↑" : "↓";
  return `<span class="sort-seta${ativo ? " ativo" : ""}">${simbolo}</span>`;
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

// Aceita "Estoque 01Out26.txt" (com ano) e "Estoque15Out.txt" (sem espaço e sem ano).
// Sem ano, devolve "15-10-" e o dia da venda completa o resto.
function stockFileDate(name) {
  const match = String(name).match(/^estoque\s*(\d{2})([a-z]{3})(\d{2})?\.txt$/i);
  if (!match) return "";
  const month = MESES[match[2].toLowerCase()];
  if (!month) return "";
  return match[3] ? `${match[1]}-${month}-20${match[3]}` : `${match[1]}-${month}-`;
}

// Ordem cronológica de datas "dd-mm-aaaa". A ordem de texto erra quando a semana cruza o mês (29-10, 30-10, 31-10, 01-11).
function chaveData(data) {
  const [dia, mes, ano] = String(data).split("-");
  return `${ano}${mes}${dia}`;
}

function porData(a, b) {
  return chaveData(a).localeCompare(chaveData(b));
}

function estoqueDoDia(stockDate, salesDate) {
  if (!stockDate || !salesDate) return false;
  return stockDate.endsWith("-") ? salesDate.startsWith(stockDate) : stockDate === salesDate;
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

// Nomes sem acento e em minúsculas, para "Automático.txt" valer como "Automatico.txt".
function semAcento(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Venda diária: "15-10-2026.txt" (data completa) ou "Vendas1510.txt" (dia e mês; o ano vem do arquivo de ofertas).
function vendaDoNome(name) {
  const completo = String(name).match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
  if (completo) return { data: completo[1] };
  const curto = String(name).match(/^vendas?\s*(\d{2})(\d{2})\.txt$/i);
  if (curto) return { dia: curto[1], mes: curto[2] };
  return null;
}

function anoNoTexto(texto) {
  const achado = String(texto).split(/\r?\n/)[1] || "";
  const ano = achado.match(/\b\d{2}[-/]\d{2}[-/](\d{4})\b/);
  return ano ? ano[1] : "";
}

// Lê só o começo do arquivo de ofertas (DTAINICIO traz o ano do período).
async function anoDaListagem(base, names) {
  const nome = names.find((item) => semAcento(item).startsWith("ofertasdoper"));
  if (!nome) return "";
  const response = await buscar(`${base}${encodeURIComponent(nome)}`);
  if (!response.ok || !response.body) return "";
  const leitor = response.body.getReader();
  let texto = "";
  const decoder = new TextDecoder("windows-1252");
  while (texto.split(/\r?\n/).length < 3) {
    const { done, value } = await leitor.read();
    if (done) break;
    texto += decoder.decode(value, { stream: true });
  }
  await leitor.cancel();
  return anoNoTexto(texto);
}

async function anoDoHandle(handle) {
  const arquivo = await handle.getFile();
  return anoNoTexto(decode(await arquivo.slice(0, 8192).arrayBuffer()));
}

async function collectFromDirectory(dir) {
  const found = { sales: [], stocks: [], buffers: {} };
  const curtas = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file") continue;
    const venda = vendaDoNome(name);
    if (venda && venda.data) {
      found.sales.push({ date: venda.data, handle });
      continue;
    }
    if (venda) {
      curtas.push({ venda, handle });
      continue;
    }
    const stockDate = stockFileDate(name);
    if (stockDate) {
      found.stocks.push({ date: stockDate, handle });
      continue;
    }
    const key = semAcento(name);
    if (key.startsWith("ofertasdoper")) {
      found.buffers.ofertas = handle;
      continue;
    }
    if (["entradas.txt", "dimproduto.txt", "automatico.txt", "lojas.xlsx", "estoqueinicio.txt", "estoquefim.txt"].includes(key)) {
      found.buffers[key] = handle;
    }
  }
  if (curtas.length) {
    const ano = found.buffers.ofertas ? await anoDoHandle(found.buffers.ofertas) : "";
    if (!ano) throw new Error("Não achei o ano do período no arquivo de ofertas. Os arquivos de venda vêm sem ano no nome.");
    for (const item of curtas) found.sales.push({ date: `${item.venda.dia}-${item.venda.mes}-${ano}`, handle: item.handle });
  }
  return found;
}

async function collectListing(base) {
  const listing = await buscar(base);
  if (!listing.ok) throw new Error("sem listagem");
  const html = await listing.text();
  const names = [...html.matchAll(/href="([^"]+)"/g)].map((match) => decodeURIComponent(match[1].split("/").pop()));
  const found = { sales: [], arquivo: {} };
  const curtas = [];
  for (const name of names) {
    const venda = vendaDoNome(name);
    if (venda && venda.data) {
      found.sales.push(venda.data);
      found.arquivo[venda.data] = name;
    } else if (venda) {
      curtas.push({ venda, name });
    }
  }
  if (curtas.length) {
    const ano = await anoDaListagem(base, names);
    if (!ano) throw new Error("Não achei o ano do período no arquivo de ofertas. Os arquivos de venda vêm sem ano no nome.");
    for (const item of curtas) {
      const data = `${item.venda.dia}-${item.venda.mes}-${ano}`;
      found.sales.push(data);
      found.arquivo[data] = item.name;
    }
  }
  found.sales.sort(porData);
  return { names, found };
}

// Nome real do arquivo na pasta, sem depender de acento nem de maiúscula.
function nomeNaPasta(names, alvo) {
  return names.find((item) => semAcento(item) === semAcento(alvo)) || alvo;
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
  const response = await buscar(`../${encodeURIComponent(offerName)}`);
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
    const response = await buscar(`${base}${encodeURIComponent(discovered.found.arquivo[date] || `${date}.txt`)}`);
    sales.push({ date, text: decode(await response.arrayBuffer()) });
  }
  async function textFile(name) {
    step += 1;
    setProgress(step / jobs, `Lendo ${name}`);
    const response = await buscar(`${base}${encodeURIComponent(name)}`);
    if (!response.ok) throw new Error(`Arquivo ausente: ${name}`);
    return decode(await response.arrayBuffer());
  }
  const inicioMov = discovered.names.find((name) => name.toLowerCase() === "estoqueinicio.txt");
  const fimMov = discovered.names.find((name) => name.toLowerCase() === "estoquefim.txt");
  let inicio;
  let fim;
  if (inicioMov && fimMov) {
    inicio = await textFile(inicioMov);
    fim = await textFile(fimMov);
  } else if (inicioMov || fimMov) {
    throw new Error("A pasta precisa ter o estoque inicial e o estoque fim juntos.");
  } else {
    const inicioName = discovered.names.find((name) => estoqueDoDia(stockFileDate(name), discovered.found.sales[0]));
    const fimName = discovered.names.find((name) => estoqueDoDia(stockFileDate(name), discovered.found.sales[discovered.found.sales.length - 1]));
    if (!inicioName) throw new Error(`Falta o estoque de ${discovered.found.sales[0]}.`);
    if (!fimName) throw new Error(`Falta o estoque de ${discovered.found.sales[discovered.found.sales.length - 1]}.`);
    inicio = await textFile(inicioName);
    fim = await textFile(fimName);
  }
  const entradas = await textFile(nomeNaPasta(discovered.names, "Entradas.txt"));
  const dim = await textFile(nomeNaPasta(discovered.names, "Dimproduto.txt"));
  const automatico = await textFile(nomeNaPasta(discovered.names, "Automatico.txt"));
  const ofertas = await textFile(offerName);
  step += 1;
  setProgress(0.92, "Lendo Lojas.xlsx");
  let lojasResponse = await buscar(`${base}${encodeURIComponent("Lojas.xlsx")}`);
  if (!lojasResponse.ok) lojasResponse = await buscar("../Lojas.xlsx");
  if (!lojasResponse.ok) throw new Error("Arquivo ausente: Lojas.xlsx");
  const lojas = await lojasFromXlsx(await lojasResponse.arrayBuffer());
  return { sales, inicio, fim, entradas, dim, automatico, lojas, ofertas };
}

async function loadServerFiles(qual) {
  const nova = `../${encodeURIComponent("Entrada Novo Período")}/`;
  if (qual === "raiz") {
    state.qual = "raiz";
    return loadFromListing("../", await collectListing("../"));
  }
  state.qual = "periodo";
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
  if (base === "../") state.qual = "raiz";
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
  acc.produtosLoja = acc.produtosLoja || {};
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
    const daLoja = (acc.produtosLoja[parts[0]] = acc.produtosLoja[parts[0]] || {});
    const naLoja = daLoja[parts[1]] || { valor: 0, quantidade: 0 };
    naLoja.valor += valor;
    naLoja.quantidade += quantidade;
    daLoja[parts[1]] = naLoja;
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
    const response = await buscar(`../${encodeURIComponent(raiz.found.arquivo[date] || `${date}.txt`)}`);
    if (!response.ok) return null;
    somarVendaDiaria(decode(await response.arrayBuffer()), acc);
  }
  const offerName = raiz.names.find((name) => name.toLowerCase().startsWith("ofertasdoper"));
  if (offerName) {
    const response = await buscar(`../${encodeURIComponent(offerName)}`);
    if (response.ok) somarOfertaPorLoja(decode(await response.arrayBuffer()), acc);
  }
  return {
    inicio: raiz.found.sales[0],
    fim: raiz.found.sales[raiz.found.sales.length - 1],
    produtos: acc.produtos,
    produtosLoja: acc.produtosLoja,
    lojas: acc.lojas,
    oferta: acc.oferta,
    total: acc.total,
    vendaOferta: acc.vendaOferta,
  };
}

const MARGEM = 0.05;
const EPS_TELA = 0.05;

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
  let anterior = state.anterior;
  if (!anterior) return null;
  // Com uma loja escolhida, a semana anterior também é só dessa loja (mesmos arquivos, mesma regra).
  if (result.loja) {
    anterior = {
      ...anterior,
      produtos: anterior.produtosLoja?.[result.loja] || {},
      total: anterior.lojas[result.loja] || 0,
      vendaOferta: anterior.oferta[result.loja] || 0,
    };
  }
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
  for (const item of found.sales.sort((a, b) => porData(a.date, b.date))) {
    setProgress(0.2, `Lendo ${item.date}.txt`);
    sales.push({ date: item.date, text: decode(await readHandle(item.handle)) });
  }
  async function required(name) {
    const handle = found.buffers[name.toLowerCase()];
    if (!handle) throw new Error(`Arquivo ausente: ${name}`);
    setProgress(0.45, `Lendo ${name}`);
    return handle;
  }
  const inicioHandle = found.buffers["estoqueinicio.txt"];
  const fimHandle = found.buffers["estoquefim.txt"];
  let inicio;
  let fim;
  if (inicioHandle && fimHandle) {
    setProgress(0.45, "Lendo estoque inicial");
    inicio = decode(await readHandle(inicioHandle));
    setProgress(0.5, "Lendo estoque fim");
    fim = decode(await readHandle(fimHandle));
  } else if (inicioHandle || fimHandle) {
    throw new Error("A pasta precisa ter o estoque inicial e o estoque fim juntos.");
  } else if (!sales.length) {
    throw new Error("A pasta precisa ter quatro arquivos de venda, de quinta a domingo.");
  } else {
    const inicioItem = found.stocks.find((item) => estoqueDoDia(item.date, sales[0].date));
    const fimItem = found.stocks.find((item) => estoqueDoDia(item.date, sales[sales.length - 1].date));
    if (!sales.length || !inicioItem) throw new Error(sales.length ? `Falta o estoque de ${sales[0].date}.` : "A pasta precisa ter quatro arquivos de venda, de quinta a domingo.");
    if (!fimItem) throw new Error(`Falta o estoque de ${sales[sales.length - 1].date}.`);
    setProgress(0.45, `Lendo estoque de ${inicioItem.date}`);
    inicio = decode(await readHandle(inicioItem.handle));
    setProgress(0.5, `Lendo estoque de ${fimItem.date}`);
    fim = decode(await readHandle(fimItem.handle));
  }
  const entradas = decode(await readHandle(await required("Entradas.txt")));
  const dim = decode(await readHandle(await required("Dimproduto.txt")));
  const automatico = decode(await readHandle(await required("Automatico.txt")));
  if (!found.buffers.ofertas) throw new Error("Falta o arquivo Ofertas do período.");
  setProgress(0.7, "Lendo Ofertas do período");
  const ofertas = decode(await readHandle(found.buffers.ofertas));
  // Lojas.xlsx na pasta escolhida; sem ele, o da raiz do projeto (a pasta nova não precisa de cópia).
  let lojasBuffer;
  const lojasHandle = found.buffers["lojas.xlsx"];
  if (lojasHandle) {
    setProgress(0.45, "Lendo Lojas.xlsx");
    lojasBuffer = await readHandle(lojasHandle);
  } else {
    const resposta = await buscar("../Lojas.xlsx");
    if (!resposta.ok) throw new Error("Arquivo ausente: Lojas.xlsx");
    lojasBuffer = await resposta.arrayBuffer();
  }
  const lojas = await lojasFromXlsx(lojasBuffer);
  return { sales, inicio, fim, entradas, dim, automatico, lojas, ofertas };
}

// Escolher pasta na "Entrada Novo Período" dá o mesmo resultado do Atualizar: compara com a semana da raiz.
async function loadPickedDirectory(dir) {
  const files = await loadDirectory(dir);
  if (dir.name === "Entrada Novo Período") {
    try {
      state.qual = "periodo";
      await lembrarSemanaDaRaiz();
      files.anterior = await vendaDaRaiz();
    } catch {
      files.anterior = null;
    }
  }
  return files;
}

function marcarSemanas() {
  const periodo = document.querySelector("#semana-periodo");
  const raiz = document.querySelector("#semana-raiz");
  if (!periodo || !raiz) return;
  periodo.hidden = !state.rotuloPeriodo;
  raiz.hidden = !state.rotuloRaiz;
  periodo.textContent = state.rotuloPeriodo;
  raiz.textContent = state.rotuloRaiz;
  periodo.setAttribute("aria-pressed", state.qual === "periodo" ? "true" : "false");
  raiz.setAttribute("aria-pressed", state.qual === "raiz" ? "true" : "false");
}

/* Filtro por loja de todo o projeto. A análise é refeita só com a loja escolhida (engine, opção loja); o conjunto de produtos é o da rede,
   então a linha de uma loja é a mesma da rede para aquela loja. Resultados já calculados ficam em memória durante a semana aberta. */
const LOJAS_VAREJO = Object.entries(LOJAS).filter(([id]) => RETAIL.includes(id));

function seletorLoja(classe = "") {
  return `<label class="filtro-loja ${classe}"><span>Loja</span><select class="sel-loja" title="Vale para todas as telas, a capa e as exportações"><option value="">Todas as lojas (rede)</option>${LOJAS_VAREJO.map(([id, nome]) => `<option value="${id}" ${state.lojaGlobal === id ? "selected" : ""}>${nome}</option>`).join("")}</select></label>`;
}

function sincronizarLoja() {
  document.querySelectorAll(".sel-loja").forEach((el) => { el.value = state.lojaGlobal; });
  const nome = state.lojaGlobal ? LOJAS[state.lojaGlobal] : "";
  document.body.classList.toggle("com-loja", Boolean(state.lojaGlobal));
  const aviso = document.querySelector("#aviso-loja");
  if (aviso) {
    aviso.hidden = !state.lojaGlobal;
    aviso.textContent = state.lojaGlobal ? `Só a loja ${nome}` : "";
  }
}

async function trocarLoja(id) {
  const nova = RETAIL.includes(id) ? id : "";
  if (nova === state.lojaGlobal && state.result) return;
  state.lojaGlobal = nova;
  state.loja = nova;
  state.page = 0;
  sincronizarLoja();
  if (!state.files) return;
  let result = state.cacheLoja.get(nova);
  if (!result) {
    setProgress(0.96, nova ? `Calculando a loja ${LOJAS[nova]}` : "Calculando a rede");
    await new Promise((resolve) => setTimeout(resolve, 20));
    result = analyze({ ...state.files, coverLimit: state.coverLimit, loja: nova });
    if (!result.ok) {
      setProgress(0, result.message);
      return;
    }
    state.cacheLoja.set(nova, result);
  }
  state.result = result;
  setProgress(1, `Semana ${result.periodo[0]} a ${result.periodo[3]}. ${nova ? `Loja ${LOJAS[nova]}.` : "Todas as lojas."} ${result.quality.produtosOferta.toLocaleString("pt-BR")} produtos de oferta.`);
  render();
}

async function run(loader) {
  try {
    const files = await loader();
    state.files = files;
    state.anterior = files.anterior || null;
    setProgress(0.96, "Calculando a semana");
    await new Promise((resolve) => setTimeout(resolve, 20));
    state.cacheLoja = new Map();
    const result = analyze({ ...files, coverLimit: state.coverLimit, loja: state.lojaGlobal });
    if (!result.ok) {
      setProgress(0, result.message);
      return;
    }
    state.result = result;
    state.cacheLoja.set(state.lojaGlobal, result);
    state.loja = state.lojaGlobal;
    sincronizarLoja();
    state.page = 0;
    if (state.view === "detalhe") {
      state.view = "capa";
      state.repeticao = "";
    }
    guardarSemana(result);
    const origem = result.quality.movimento
      ? "Estoque lido no arquivo inicial e no arquivo fim."
      : "Estoque inicial no arquivo do primeiro dia e estoque final no arquivo do último dia.";
    if (state.qual === "raiz") state.rotuloRaiz = `${diaCurto(result.periodo[0])} a ${diaCurto(result.periodo[3])}`;
    else {
      state.rotuloPeriodo = `${diaCurto(result.periodo[0])} a ${diaCurto(result.periodo[3])}`;
      if (state.anterior) state.rotuloRaiz = `${diaCurto(state.anterior.inicio)} a ${diaCurto(state.anterior.fim)}`;
    }
    marcarSemanas();
    setProgress(1, `Semana ${result.periodo[0]} a ${result.periodo[3]}. ${result.quality.produtosOferta.toLocaleString("pt-BR")} produtos de oferta. ${origem}`);
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
    if (state.grupo.startsWith("zero-")) rows = rows.filter((row) => row.causaZero === state.grupo.slice(5));
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
      <select id="f-loja" ${state.lojaGlobal ? `disabled title="Filtro de loja ligado em todo o projeto (alto da página)"` : ""}><option value="">Todas as lojas</option>${stores.map(([id, name]) => `<option value="${id}" ${(state.lojaGlobal || state.loja) === id ? "selected" : ""}>${name}</option>`).join("")}</select>
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
  const head = columns.map((column) => `<th class="${column.num ? "num" : ""} col-${column.key}"><button type="button" class="sort${state.sortKey === column.key ? " ativo" : ""}" data-sort="${column.key}"><span class="sort-label">${column.label}</span>${sortSeta(column.key)}</button></th>`).join("");
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const attr = (value) => esc(value).replace(/"/g, "&quot;");
  const body = pageRows.map((row) => `<tr>${columns.map((column) => {
    const texto = esc(column.cell(row));
    const dica = column.hint ? column.hint(row) : "";
    const longo = column.key === "descricao" || column.key === "loja" || column.key === "comprador";
    const titulo = dica || (longo ? column.cell(row) : "");
    return `<td class="${column.num ? "num" : ""} col-${column.key}"${titulo ? ` title="${attr(titulo)}"` : ""}>${texto}</td>`;
  }).join("")}</tr>`).join("");
  const pages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
  const fullLabel = document.fullscreenElement || state.keepFull ? "Sair da tela cheia" : "Tela cheia";
  const cols = columns.map((column) => `<col class="col-${column.key}">`).join("");
  return `
    <div class="panel" id="panel">
      <div class="panel-bar"><button type="button" id="fullscreen">${fullLabel}</button></div>
      <div class="table-wrap"><table><colgroup>${cols}</colgroup><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}">Nenhum item neste filtro.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${sorted.length.toLocaleString("pt-BR")} linhas · página ${state.page + 1} de ${pages}</span><span><button type="button" id="prev">Anterior</button> <button type="button" id="next">Próxima</button></span></div>
    </div>`;
}

function place(html) {
  const current = document.querySelector("#panel");
  const staying = Boolean(current && (document.fullscreenElement === current || current.classList.contains("expanded")));
  if (!staying) {
    view.innerHTML = html;
    return;
  }
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const next = holder.querySelector("#panel");
  if (!next) {
    view.innerHTML = html;
    return;
  }
  const before = [];
  const after = [];
  let seen = false;
  for (const node of [...holder.childNodes]) {
    if (node === next) {
      seen = true;
      continue;
    }
    (seen ? after : before).push(node);
  }
  current.replaceChildren(...next.childNodes);
  [...view.childNodes].forEach((node) => {
    if (node !== current) node.remove();
  });
  for (const node of before) view.insertBefore(node, current);
  for (const node of after) view.appendChild(node);
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
  if (state.keepFull) panel.classList.add("expanded");
  const overflows = wrap && wrap.scrollWidth > wrap.clientWidth + 4;
  const leave = () => {
    state.keepFull = false;
    panel.classList.remove("expanded");
    button.textContent = "Tela cheia";
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  const enter = () => {
    state.keepFull = true;
    panel.classList.add("expanded");
    button.textContent = "Sair da tela cheia";
    if (document.fullscreenElement === panel) return;
    const pedido = panel.requestFullscreen?.();
    if (pedido && typeof pedido.catch === "function") pedido.catch(() => {});
  };
  button.hidden = !overflows && !state.keepFull && !panel.classList.contains("expanded");
  button.onclick = () => {
    if (document.fullscreenElement || panel.classList.contains("expanded")) leave();
    else enter();
  };
  if (state.keepFull) {
    button.textContent = "Sair da tela cheia";
    if (document.fullscreenElement !== panel) enter();
  }
}

function colunaVariacao() {
  return {
    key: "variacao",
    label: "Variação do estoque",
    num: true,
    value: (row) => variacaoEstoque(row),
    cell: (row) => pctSinal(variacaoEstoque(row)),
    hint: (row) => {
      if (row.inicial == null || row.final == null) return "";
      const conta = row.conta == null ? "" : ` Depois do saldo inicial: entrada ${qty(row.entradaMov)}, saída ${qty(row.saidaMov)}, venda ${qty(row.vendaMov)}. Conta ${qty(row.conta)}.`;
      return `Estoque final ${qty(row.final)} menos o inicial ${qty(row.inicial)}, dividido pelo inicial.${conta}`;
    },
  };
}

const CAUSA_ZERO = {
  "sem-pedido": ["Sem pedido na semana", "Estoque zero e nenhuma linha de pedido com recebimento previsto nos quatro dias. Pedido com entrega prevista depois do domingo não está no Automatico.txt, então não é visto."],
  atrasado: ["Pedido atrasado", "Estoque zero e há saldo pendente de entrega (QTDSALDO) no pedido, com recebimento previsto dentro da semana. O saldo é o da data de extração do arquivo."],
  recebido: ["Recebido e vendido", "Estoque zero, sem saldo pendente. O pedido foi recebido e a mercadoria saiu: a quantidade pedida não cobriu a venda."],
  "recebido-sem-entrada": ["Recebido sem entrada", "Estoque zero, sem saldo pendente. O pedido consta como recebido, mas nem o estoque nem o Entradas.txt registram entrada. A mercadoria pode ter chegado depois do domingo."],
  cancelado: ["Pedido cancelado", "Estoque zero e o pedido foi cancelado, sem saldo pendente e sem recebimento."],
};

function colunasPedido() {
  return [
    { key: "pedido-pendente", label: "Pedido pendente (un)", num: true, value: (row) => row.pedidoPendente, cell: (row) => (row.pedidoPendente > EPS_TELA ? qty(row.pedidoPendente) : ""), hint: (row) => row.pedidoLinhas ? `QTDSALDO do Automatico.txt na data de extração. Aprovado ${qty(row.pedidoAprovado)}, recebido ${qty((row.entradaAutomatica || 0) + (row.entradaManual || 0))}, cancelado ${qty(row.pedidoCancelado)}.` : "Nenhuma linha de pedido com recebimento previsto na semana." },
    { key: "pedido-valor", label: "Pedido pendente (R$)", num: true, value: (row) => row.pedidoPendenteValor, cell: (row) => (row.pedidoPendenteValor > EPS_TELA ? money(row.pedidoPendenteValor) : ""), hint: () => "Saldo pendente vezes o custo unitário do pedido (VALORUNIT)." },
    { key: "pedido-atraso", label: "Dias de atraso", num: true, value: (row) => row.pedidoAtraso, cell: (row) => (row.pedidoAtraso == null ? "" : qty(row.pedidoAtraso)), hint: () => "Do recebimento previsto mais antigo com saldo até o último dia do período (domingo)." },
    { key: "causa-zero", label: "Causa do estoque zero", value: (row) => (row.causaZero ? CAUSA_ZERO[row.causaZero][0] : ""), cell: (row) => (row.causaZero ? CAUSA_ZERO[row.causaZero][0] : ""), hint: (row) => (row.causaZero ? CAUSA_ZERO[row.causaZero][1] : "") },
  ];
}

function detailColumns() {
  const pedido = (row) => `Quantidade recebida no pedido (Automatico.txt). Não é entrada no estoque e não entra na soma.${row && row.recebidoSemEntrada ? " Neste par, nem o estoque nem o Entradas.txt registram entrada." : ""}`;
  const movimento = Boolean(state.result?.quality.movimento);
  const comuns = [
    { key: "loja", label: "Loja", value: (row) => row.lojaNome, cell: (row) => row.lojaNome },
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
  ];
  const variacao = colunaVariacao();
  if (!movimento) {
    return [
      ...comuns,
      { key: "inicial", label: "Estoque inicial", num: true, value: (row) => row.inicial, cell: (row) => qty(row.inicial), hint: (row) => `Saldo do arquivo do primeiro dia, já em ${dataBr(row.dataInicial)}. A venda desse dia já está neste número.` },
      { key: "entrada-mov", label: "Entrada depois", num: true, value: (row) => row.entradaMov, cell: (row) => qty(row.entradaMov), hint: (row) => row.entradaTexto || "QTDITEM dos dias posteriores ao saldo inicial." },
      { key: "saida-mov", label: "Saída depois", num: true, value: (row) => row.saidaMov, cell: (row) => qty(row.saidaMov), hint: (row) => row.saidaTexto || "QTDITEM das operações 802, 902 e 903 nesses dias." },
      { key: "venda-mov", label: "Venda depois", num: true, value: (row) => row.vendaMov, cell: (row) => qty(row.vendaMov), hint: () => "Quantidade vendida nos dias posteriores ao saldo inicial, até a data do estoque final." },
      { key: "conta", label: "Estoque pela movimentação", num: true, value: (row) => row.conta, cell: (row) => qty(row.conta), hint: () => "Estoque inicial + entrada depois − saída depois − venda depois." },
      { key: "entrada-aut", label: "Recebido automático (pedido)", num: true, value: (row) => row.entradaAutomatica, cell: (row) => qty(row.entradaAutomatica), hint: pedido },
      { key: "entrada-man", label: "Recebido manual (pedido)", num: true, value: (row) => row.entradaManual, cell: (row) => qty(row.entradaManual), hint: pedido },
      { key: "final", label: "Estoque final", num: true, value: (row) => row.final, cell: (row) => qty(row.final), hint: (row) => `Saldo do arquivo do último dia, na data ${dataBr(row.dataFinal)}.` },
      variacao,
      ...colunasPedido(),
    ];
  }
  return [
    ...comuns,
    { key: "partida-ini", label: "Partida inicial", num: true, value: (row) => row.partidaInicial, cell: (row) => qty(row.partidaInicial), hint: (row) => dataBr(row.dataInicial) },
    { key: "entrada-ini", label: "Entrada inicial", num: true, value: (row) => row.entradaInicial, cell: (row) => qty(row.entradaInicial), hint: (row) => dataBr(row.dataInicial) },
    { key: "saida-ini", label: "Saída inicial", num: true, value: (row) => row.saidaInicial, cell: (row) => qty(row.saidaInicial), hint: (row) => dataBr(row.dataInicial) },
    { key: "inicial", label: "Estoque inicial", num: true, value: (row) => row.inicial, cell: (row) => qty(row.inicial), hint: (row) => equacaoEstoque(row.partidaInicial, row.entradaInicial, row.saidaInicial, row.inicial, row.dataInicial) },
    { key: "entrada-aut", label: "Recebido automático (pedido)", num: true, value: (row) => row.entradaAutomatica, cell: (row) => qty(row.entradaAutomatica), hint: pedido },
    { key: "entrada-man", label: "Recebido manual (pedido)", num: true, value: (row) => row.entradaManual, cell: (row) => qty(row.entradaManual), hint: pedido },
    { key: "venda", label: "Quantidade vendida", num: true, value: (row) => row.quantidade, cell: (row) => qty(row.quantidade), hint: () => "Quantidade dos quatro arquivos diários. A venda do dia do saldo inicial já está dentro desse saldo." },
    { key: "partida-fim", label: "Partida final", num: true, value: (row) => row.partidaFinal, cell: (row) => qty(row.partidaFinal), hint: (row) => dataBr(row.dataFinal) },
    { key: "entrada-fim", label: "Entrada final", num: true, value: (row) => row.entradaFinal, cell: (row) => qty(row.entradaFinal), hint: (row) => dataBr(row.dataFinal) },
    { key: "saida-fim", label: "Saída final", num: true, value: (row) => row.saidaFinal, cell: (row) => qty(row.saidaFinal), hint: (row) => dataBr(row.dataFinal) },
    { key: "final", label: "Estoque final", num: true, value: (row) => row.final, cell: (row) => qty(row.final), hint: (row) => equacaoEstoque(row.partidaFinal, row.entradaFinal, row.saidaFinal, row.final, row.dataFinal) },
    { key: "entrada-mov", label: "Entrada depois (NF)", num: true, value: (row) => row.entradaMov, cell: (row) => qty(row.entradaMov), hint: (row) => row.entradaTexto || "QTDITEM de Entradas.txt nos dias posteriores ao saldo inicial, até a data do estoque final." },
    { key: "saida-mov", label: "Saída depois", num: true, value: (row) => row.saidaMov, cell: (row) => qty(row.saidaMov), hint: (row) => row.saidaTexto || "QTDITEM das operações 802, 902 e 903 nesses dias." },
    { key: "venda-mov", label: "Venda depois", num: true, value: (row) => row.vendaMov, cell: (row) => qty(row.vendaMov), hint: () => "Venda dos dias posteriores ao saldo inicial, até a data do estoque final. A venda do dia inicial já está no saldo." },
    { key: "conta", label: "Estoque pela movimentação", num: true, value: (row) => row.conta, cell: (row) => qty(row.conta), hint: () => "Estoque inicial + entrada depois − saída depois − venda depois." },
    { key: "diferenca-conta", label: "Diferença da conta", num: true, value: (row) => row.diferencaConta, cell: (row) => qty(row.diferencaConta), hint: (row) => row.diferencaConta == null ? "" : row.diferencaConta < -EPS_TELA ? "Estoque final abaixo da conta: saiu mais do que a venda e as saídas registradas explicam." : row.diferencaConta > EPS_TELA ? "Estoque final acima da conta: entrou mais do que as entradas registradas explicam." : "A conta fecha." },
    { key: "intervalo", label: "Intervalo", num: true, value: (row) => row.intervalo, cell: (row) => qty(row.intervalo), hint: () => "Partida do estoque fim menos o estoque inicial. Os dois arquivos não detalham os dias entre as datas." },
    variacao,
    ...colunasPedido(),
  ];
}

function render() {
  view.onclick = null;
  state.keepFull = Boolean(document.fullscreenElement) || Boolean(document.querySelector("#panel.expanded"));
  title.textContent = state.view === "detalhe" ? state.detalheTitulo : VIEWS.find(([id]) => id === state.view)[1];
  [...nav.children].forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  const result = state.result;
  if (!result) {
    view.innerHTML = `<p class="note">Escolha a pasta da semana ou abra esta página pelo servidor local da pasta do projeto e aperte Atualizar.</p>`;
    return;
  }
  subtitle.textContent = `${result.periodo[0]} a ${result.periodo[3]} · quinta a domingo${state.lojaGlobal ? ` · só a loja ${LOJAS[state.lojaGlobal]}` : ""}`;
  sincronizarLoja();
  if (state.view === "capa") renderCapa(result);
  else if (state.view === "detalhe") renderDetalhe();
  else if (state.view === "lojas") renderLojas(result);
  else if (state.view === "compradores") renderBuyers(result);
  else if (state.view === "sobra") renderSobra(result);
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
  ["excesso", "Conta aberta", (row) => row.pares ? row.irregular / row.pares : 0, (row) => row.pares, (row) => row.irregular],
  ["sem-venda", "Sem venda com saldo", (row) => row.pares ? row.semVendaSaldo / row.pares : 0, (row) => row.pares, (row) => row.semVendaSaldo],
  ["sem-entrada", "Sem entrada", (row) => row.pares ? row.excecaoSem / row.pares : 0, (row) => row.pares, (row) => row.excecaoSem],
  ["zero-atrasado", "Ruptura com pedido atrasado", (row) => row.ruptura ? row.zeroAtrasado / row.ruptura : 0, (row) => row.ruptura, (row) => row.zeroAtrasado],
  ["zero-sem-pedido", "Ruptura sem pedido", (row) => row.ruptura ? row.zeroSemPedido / row.ruptura : 0, (row) => row.ruptura, (row) => row.zeroSemPedido],
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
        zeroAtrasado: 0,
        zeroSemPedido: 0,
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
    if (row.causaZero === "atrasado") item.zeroAtrasado += 1;
    if (row.causaZero === "sem-pedido") item.zeroSemPedido += 1;
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
        zeroAtrasado: 0,
        zeroSemPedido: 0,
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
    if (row.causaZero === "atrasado") item.zeroAtrasado += 1;
    if (row.causaZero === "sem-pedido") item.zeroSemPedido += 1;
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
  const ruptura = contagem((row) => row.situacao === "zero");
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
      ["sem-venda", "Sem venda com saldo", contagem((row) => !row.vendeu && row.situacao === "positivo"), pares, `Par sem venda e com saldo do estoque fim maior que zero. Já entra em pares sem venda. ${sobrePares}`],
    ]],
    ["Estoque", "A variação é o estoque final menos o inicial, dividido pelo inicial. Positivo: o saldo terminou maior. Negativo: o saldo terminou menor.", [
      ["excesso", "Conta aberta", contagem((row) => row.irregular), pares, result.quality.movimento ? `Par em que a conta não fecha: a linha de um dos arquivos (partida + entrada − saída) não chega no ESTOQUE, ou a conta da janela (estoque inicial + entrada − saída − venda dos dias seguintes) não chega no estoque final. ${sobrePares}` : `Estoque do primeiro dia + entrada dos dias seguintes − saída desses dias − venda desses dias, comparado ao estoque do último dia. Este número é o par em que a conta não fecha. ${sobrePares}`],
      ["ruptura", "Ruptura", contagem((row) => row.situacao === "zero"), pares, `Saldo do estoque fim igual a zero, quando existe linha nesse arquivo. Par sem linha não entra. ${sobrePares}`],
      ["provavel", "Ruptura provável", contagem((row) => row.provavel), pares, `Houve venda e o saldo de domingo cobre menos de um dia do ritmo desta semana. ${sobrePares}`],
      ["sem-entrada", "Sem entrada", contagem((row) => row.excecao === "sem-entrada"), pares, result.quality.movimento ? `O estoque fim ficou maior que o inicial e não há entrada nem na linha do estoque fim nem no Entradas.txt, nos dias depois do saldo inicial até a data do estoque fim. O pedido recebido não conta como entrada. ${sobrePares}` : `O estoque do último dia ficou maior que o do primeiro e a entrada desses dias está zerada. Pedido não entra nessa conta. ${sobrePares}`],
    ]],
    ["Abastecimento", "Modalidade pela quantidade recebida em Automatico.txt.", [
      ["ambos", "Duas modalidades", duas, receberam, `O par tem QTDRECEBIDA no automático e no manual. ${sobreRecebidos}`],
      ["so-automatico", "Só automático", soAuto, receberam, `QTDRECEBIDA automática maior que zero e manual igual a zero. ${sobreRecebidos}`],
      ["so-manual", "Só manual", soManual, receberam, `QTDRECEBIDA manual maior que zero e automática igual a zero. ${sobreRecebidos}`],
    ]],
    ["Causa da ruptura", `Cada par com saldo zero no estoque fim recebe uma causa só, pelo pedido do Automatico.txt. Total: ${itens(ruptura)} pares em ruptura. O saldo pendente é o da data de extração do arquivo. Pedido com entrega prevista depois do domingo não está no arquivo.`, [
      ...Object.entries(CAUSA_ZERO).map(([id, [nome, texto]]) => [
        `zero-${id}`,
        nome,
        contagem((row) => row.causaZero === id),
        ruptura,
        id === "atrasado" ? `${texto} Pendente nesses pares: ${qty(result.quality.pendenteZeroQtd)} unidades, ${money(result.quality.pendenteZeroValor)} a custo.` : texto,
      ]),
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
    excesso: ["Conta<br>aberta", "Conta aberta"],
    "sem-venda": ["Sem venda<br>com saldo", "Sem venda com saldo"],
    "sem-entrada": ["Sem<br>entrada", "Sem entrada"],
    "zero-atrasado": ["Ruptura<br>pedido atrasado", "Parte das rupturas em que há saldo pendente de entrega no pedido"],
    "zero-sem-pedido": ["Ruptura<br>sem pedido", "Parte das rupturas sem nenhum pedido com recebimento previsto na semana"],
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
  place(`
    <div class="cards">
      <article class="card">${dica("Soma de VLRTOTALVDA em Ofertas do período, nas 13 lojas.", esc, true)}<span>Venda da oferta</span><strong>${money(rede.venda)}</strong></article>
      <article class="card">${dica("Soma de VLRVENDA dos quatro arquivos diários, nas 13 lojas. Inclui o que não estava em oferta.", esc, true)}<span>Venda total do período</span><strong>${money(rede.total)}</strong></article>
      <article class="card">${dica("Venda da oferta dividida pela venda total do período.", esc, true)}<span>Participação da oferta</span><strong>${pct(rede.participacao)}</strong></article>
      <article class="card">${dica("Produtos distintos em Ofertas do período, nas 13 lojas.", esc, true)}<span>Produtos de oferta</span><strong>${result.quality.produtosOferta.toLocaleString("pt-BR")}</strong></article>
      <article class="card">${dica("Soma de VLRLUCRO dos pares loja e produto que venderam. O valor já vem no arquivo diário.", esc, true)}<span>Lucro bruto</span><strong>${money(rede.lucro)}</strong><em>VLRLUCRO</em></article>
      <article class="card">${dica("Venda dos itens de oferta menos o custo bruto da venda. É outra conta, separada do lucro bruto.", esc, true)}<span>Margem pelo custo bruto</span><strong>${money(rede.margem)}</strong><em>Venda − custo bruto</em></article>
    </div>
    ${htmlLancamento(result, esc)}
    <div class="campanha-grade">${campanha(result).map(([titulo, resumo, linhas]) => `<article class="card campanha-col${titulo === "Causa da ruptura" ? " campanha-larga" : ""}">${dica(resumo, esc, true)}<span class="campanha-titulo">${titulo}</span>${linhas.map(([id, nome, quantidade, base, texto]) => `<button type="button" class="stat" ${id ? `data-campanha="${id}" data-rotulo="${esc(nome)}"` : ""}><span class="stat-nome"><em>${nome}</em></span><span class="stat-fim"><span class="stat-num"><strong>${itens(quantidade)}</strong><small class="parte">${parte(quantidade, base)}</small></span>${dica(texto, esc)}</span></button>`).join("")}</article>`).join("")}</div>
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
      <div class="panel-bar"><button type="button" id="fullscreen">${document.fullscreenElement || state.keepFull ? "Sair da tela cheia" : "Tela cheia"}</button></div>
      <div class="table-wrap"><table class="capa-table"><thead><tr><th><button type="button" class="sort" data-sort="nome">${label}${sortMark("nome")}</button></th>${head}</tr></thead><tbody>${body || `<tr><td colspan="${CAPA_METRICS.length + 1 + (mostraVezes ? 1 : 0)}">Nenhum item neste filtro.</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${people.length.toLocaleString("pt-BR")} linhas · página ${state.page + 1} de ${pages}</span><span><button type="button" id="prev">Anterior</button> <button type="button" id="next">Próxima</button></span></div>
    </div>
    <p class="note">O número em verde é a quantidade de itens do percentual. Automático e manual dividem as linhas de revenda; na visão por produto, dividem as lojas que receberam o item. Dois abastecimentos é a parcela dos produtos recebidos que chegaram no automático e no manual. O clique abre esses produtos. O ponto de interrogação explica o critério da linha.</p>`);
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
  place(`<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button><input id="f-texto" placeholder="Nome ou código" value="${esc(state.texto)}"></div>${table([
    { key: "nome", label: "Nome da oferta", value: (row) => row.nome, cell: (row) => row.nome },
    { key: "codigos", label: "Cadastradas nesse nome", num: true, value: (row) => row.codigos, cell: (row) => itens(row.codigos) },
    { key: "lista", label: "Códigos", value: (row) => row.lista, cell: (row) => row.lista },
  ], rows)}<p class="note">Cada linha é um nome digitado em PROMOCAO. Cadastradas nesse nome é a quantidade de códigos (SEQPROMOCAO) com esse texto. São ${itens(item.nomes)} nomes e ${itens(item.codigos)} códigos.</p>`);
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
  place(`<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button></div>${filters()}${table(detailColumns(), rows)}`);
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
  place(`<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button><input id="f-texto" placeholder="Produto" value="${esc(state.texto)}"></div>${table([
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "vezes", label: "Semanas anteriores", num: true, value: (row) => row.vezes, cell: (row) => itens(row.vezes) },
    { key: "anterior", label: "Semana anterior", value: (row) => row.na ? "Sim" : "Não", cell: (row) => row.na ? "Sim" : "Não" },
  ], rows)}`);
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
  place(`<div class="filters"><button type="button" class="secondary" id="voltar">Voltar à capa</button><input id="f-texto" placeholder="Produto" value="${esc(state.texto)}"></div>${table([
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "antes", label: "Semana anterior", num: !estreante, value: (row) => estreante ? 0 : row.antes, cell: (row) => estreante ? "Não estava na oferta" : money(row.antes) },
    { key: "valor", label: "Esta semana", num: true, value: (row) => row.valor, cell: (row) => money(row.valor) },
    { key: "delta", label: "Diferença", num: true, value: (row) => row.delta, cell: (row) => estreante ? "—" : money(row.delta) },
    { key: "percentual", label: "Variação", num: true, value: (row) => row.percentual ?? -999, cell: (row) => row.percentual == null || estreante ? "—" : pct(row.percentual) },
  ], rows)}<p class="note">${estreante ? "Estreante começa nesta oferta. Na semana anterior ele não estava na oferta, então essa semana não entra como venda. Sem venda é a desta semana." : "Variação em branco é semana anterior sem venda. A lista sem venda nas duas semanas não separa ruptura."}</p>`);
  document.querySelector("#voltar").onclick = voltarCapa;
  bindFilters(rows);
}

function renderLojas(result) {
  place(table([
    { key: "loja", label: "Loja", value: (row) => row.nome, cell: (row) => row.nome },
    { key: "oferta", label: "Oferta", num: true, value: (row) => row.venda, cell: (row) => money(row.venda) },
    { key: "total", label: "Total da loja", num: true, value: (row) => row.totalLoja, cell: (row) => money(row.totalLoja) },
    { key: "participacao", label: "Participação", num: true, value: (row) => row.participacao, cell: (row) => pct(row.participacao) },
    { key: "lucro", label: "Lucro bruto", num: true, value: (row) => row.lucro, cell: (row) => money(row.lucro) },
    { key: "margem", label: "Margem custo bruto", num: true, value: (row) => row.margem, cell: (row) => money(row.margem) },
    { key: "ruptura", label: "Ruptura", num: true, value: (row) => row.ruptura, cell: (row) => qty(row.ruptura) },
    { key: "irregular", label: "Conta aberta", num: true, value: (row) => row.irregular, cell: (row) => qty(row.irregular) },
    { key: "sem-venda", label: "Sem venda com saldo", num: true, value: (row) => row.semVendaSaldo, cell: (row) => qty(row.semVendaSaldo) },
  ], result.lojas));
  bindFilters(result.lojas);
}

function renderBuyers(result) {
  place(table([
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "venda", label: "Venda", num: true, value: (row) => row.venda, cell: (row) => money(row.venda) },
    { key: "lucro", label: "Lucro bruto", num: true, value: (row) => row.lucro, cell: (row) => money(row.lucro) },
    { key: "margem", label: "Margem custo bruto", num: true, value: (row) => row.margem, cell: (row) => money(row.margem) },
    { key: "posicionado", label: "Posicionado na quinta", num: true, value: (row) => row.comPosicao ? row.posicionados / row.comPosicao : null, cell: (row) => row.comPosicao ? pct(row.posicionados / row.comPosicao) : "—" },
    { key: "ruptura", label: "Ruptura", num: true, value: (row) => row.ruptura, cell: (row) => qty(row.ruptura) },
    { key: "provavel", label: "Ruptura provável", num: true, value: (row) => row.provavel, cell: (row) => qty(row.provavel) },
    { key: "irregular", label: "Conta aberta", num: true, value: (row) => row.irregular, cell: (row) => qty(row.irregular) },
    { key: "sem-entrada", label: "Sem entrada", num: true, value: (row) => row.excecaoSem, cell: (row) => qty(row.excecaoSem) },
    { key: "sem-venda", label: "Sem venda com saldo", num: true, value: (row) => row.semVendaSaldo, cell: (row) => qty(row.semVendaSaldo) },
    { key: "zero-sem-pedido", label: "Ruptura sem pedido", num: true, value: (row) => row.zeroSemPedido, cell: (row) => qty(row.zeroSemPedido) },
    { key: "zero-atrasado", label: "Ruptura com pedido atrasado", num: true, value: (row) => row.zeroAtrasado, cell: (row) => qty(row.zeroAtrasado) },
    { key: "zero-recebido", label: "Ruptura com pedido recebido", num: true, value: (row) => row.zeroRecebido + row.zeroRecebidoSemEntrada, cell: (row) => qty(row.zeroRecebido + row.zeroRecebidoSemEntrada) },
    { key: "pendente-zero", label: "Pendente em ruptura (un)", num: true, value: (row) => row.pendenteZeroQtd, cell: (row) => qty(row.pendenteZeroQtd) },
    { key: "pendente-zero-valor", label: "Pendente em ruptura (R$)", num: true, value: (row) => row.pendenteZeroValor, cell: (row) => money(row.pendenteZeroValor) },
    { key: "automatico", label: "Automático", num: true, value: (row) => row.automatico, cell: (row) => qty(row.automatico) },
    { key: "manual", label: "Manual", num: true, value: (row) => row.manual, cell: (row) => qty(row.manual) },
    { key: "pct-auto", label: "% automático", num: true, value: (row) => (row.automatico + row.manual) ? row.automatico / (row.automatico + row.manual) : null, cell: (row) => (row.automatico + row.manual) ? pct(row.automatico / (row.automatico + row.manual)) : "—" },
    { key: "embalagem", label: "Embalagem", num: true, value: (row) => row.embalagem, cell: (row) => qty(row.embalagem) },
    { key: "materia", label: "Matéria-prima", num: true, value: (row) => row.materia, cell: (row) => qty(row.materia) },
    { key: "uso", label: "Uso e consumo", num: true, value: (row) => row.uso, cell: (row) => qty(row.uso) },
  ], result.compradores));
  bindFilters(result.compradores);
}

const sobraCfg = { risco: 1, dias: 7, ordem: "pct", sentido: "desc" };
const GRUPOS_SOBRA = [
  { id: "sobra", nome: "Com sobra", dica: "Nenhuma loja em risco e o saldo cobre o limite de sobra em dias de venda ou mais (ou não houve venda)." },
  { id: "padrao", nome: "No padrão", dica: "Nenhuma loja em risco e o saldo fica entre o limite de risco e o limite de sobra." },
  { id: "risco", nome: "Faltando / risco de ruptura", dica: "Pelo menos uma loja sem saldo, ou com saldo que cobre menos dias de venda que o limite de risco." },
];

function renderSobra(result) {
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const lista = sobraPorComprador(result.details, { risco: sobraCfg.risco, sobraDias: sobraCfg.dias });
  const soma = (campo) => lista.reduce((s, c) => s + (c[campo] || 0), 0);
  const rede = { comprador: "Rede", inicial: soma("inicial"), entrada: soma("entrada"), entAuto: soma("entAuto"), entManual: soma("entManual"), entSemPedido: soma("entSemPedido"), venda: soma("venda"), sobra: soma("sobra"), pares: soma("pares"), fora: soma("foraDaBase"), nSobra: soma("nSobra"), nPadrao: soma("nPadrao"), nRisco: soma("nRisco") };
  rede.disponivel = rede.inicial + rede.entrada;
  rede.pct = rede.disponivel > 0.05 ? rede.sobra / rede.disponivel : null;
  const nProd = (c) => c.nSobra + c.nPadrao + c.nRisco;
  const pc = (n, base) => (base ? pct(n / base) : "—");
  const barra = (c) => {
    const total = nProd(c) || 1;
    return `<span class="sobra-barra" title="Com sobra ${c.nSobra} · No padrão ${c.nPadrao} · Faltando ${c.nRisco}"><i class="b-sobra" style="width:${(100 * c.nSobra) / total}%"></i><i class="b-padrao" style="width:${(100 * c.nPadrao) / total}%"></i><i class="b-risco" style="width:${(100 * c.nRisco) / total}%"></i></span>`;
  };
  const botao = (alvo) => `<button type="button" class="sobra-full" data-full="${alvo}">Tela cheia</button>`;

  /* Comparação entre compradores */
  const COLS = [
    { k: "comprador", t: "Comprador", txt: true, v: (c) => c.comprador },
    { k: "produtos", t: "Produtos", v: (c) => nProd(c), c: (c) => itens(nProd(c)) },
    { k: "nSobra", t: "Com sobra", v: (c) => c.nSobra, c: (c) => `${itens(c.nSobra)} <small>${pc(c.nSobra, nProd(c))}</small>` },
    { k: "nPadrao", t: "No padrão", v: (c) => c.nPadrao, c: (c) => `${itens(c.nPadrao)} <small>${pc(c.nPadrao, nProd(c))}</small>` },
    { k: "nRisco", t: "Faltando / risco", v: (c) => c.nRisco, c: (c) => `${itens(c.nRisco)} <small>${pc(c.nRisco, nProd(c))}</small>` },
    { k: "grafico", t: "Distribuição", v: (c) => c.nRisco / (nProd(c) || 1), c: (c) => barra(c) },
    { k: "pct", t: "% sobra", v: (c) => c.pct ?? -1, c: (c) => `<b>${c.pct == null ? "—" : pct(c.pct)}</b>` },
    { k: "inicial", t: "Estoque inicial", v: (c) => c.inicial, c: (c) => qty(c.inicial) },
    { k: "entrada", t: "Entrada", v: (c) => c.entrada, c: (c) => qty(c.entrada) },
    { k: "entAuto", t: "Entrada automática", v: (c) => c.entAuto, c: (c) => qty(Math.round(c.entAuto)) },
    { k: "entManual", t: "Entrada manual", v: (c) => c.entManual, c: (c) => qty(Math.round(c.entManual)) },
    { k: "entSemPedido", t: "Entrada sem pedido", v: (c) => c.entSemPedido, c: (c) => qty(Math.round(c.entSemPedido)) },
    { k: "venda", t: "Vendeu", v: (c) => c.venda, c: (c) => qty(c.venda) },
    { k: "sobra", t: "Estoque final", v: (c) => c.sobra, c: (c) => qty(c.sobra) },
  ];
  const ordenar = (rows) => {
    const col = COLS.find((x) => x.k === sobraCfg.ordem) || COLS[6];
    const dir = sobraCfg.sentido === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.v(a), vb = col.v(b);
      const r = col.txt ? String(va).localeCompare(String(vb), "pt-BR") : va - vb;
      return r * dir || a.comprador.localeCompare(b.comprador, "pt-BR");
    });
  };
  const linhaComp = (c) => `<tr>${COLS.map((x) => `<td class="${x.txt ? "txt" : "num"}">${x.txt ? esc(c.comprador) : x.c(c)}</td>`).join("")}</tr>`;
  const cabecaComp = () => COLS.map((x) => `<th class="${x.txt ? "txt" : "num"}"><button type="button" class="sobra-ordem${sobraCfg.ordem === x.k ? " ativa" : ""}" data-ordem="${x.k}">${x.t}${sobraCfg.ordem === x.k ? (sobraCfg.sentido === "asc" ? " ▲" : " ▼") : ""}</button></th>`).join("");
  const comparacao = `
    <section class="sobra-comp" id="sobra-comp">
      <div class="sobra-comp-topo"><h2>Comparação entre compradores</h2><div class="sobra-acoes">${botao("sobra-comp")}${seletorLoja("no-card")}</div></div>
      <div class="table-wrap"><table class="sobra-tabela"><thead><tr>${cabecaComp()}</tr></thead>
        <tbody>${ordenar(lista).map(linhaComp).join("")}</tbody>
        <tfoot>${linhaComp(rede)}</tfoot></table></div>
    </section>`;

  /* Card por comprador */
  const ROTULO = { entAuto: "Automático", entManual: "Manual", entSemPedido: "Sem pedido" };
  const partesEntrada = (o) => ["entAuto", "entManual", "entSemPedido"].filter((k) => o[k] > 0.05).map((k) => ({ k, nome: ROTULO[k], v: o[k] }));
  const abastecimento = (p) => {
    const partes = partesEntrada(p);
    if (!partes.length) return "—";
    const dica = ["entAuto", "entManual", "entSemPedido"].map((k) => `${ROTULO[k]} ${qty(Math.round(p[k]))}`).join(" · ");
    const rotulo = partes.length === 1 ? partes[0].nome : "Misto";
    return `<span class="tag tag-${partes.length === 1 ? partes[0].k : "misto"}" title="${esc(dica)}">${rotulo}</span>`;
  };
  const ajusteCel = (v) => (Math.abs(v) < 0.5 ? "—" : (v > 0 ? "+" : "−") + qty(Math.abs(v)));
  const celulas = (o, sub = false) => `<td class="num">${qty(o.inicial)}</td><td class="num entrada">${qty(o.entrada)} ${sub && o.entrada <= 0.05 ? "" : abastecimento(o)}</td><td class="num">${qty(o.venda)}</td><td class="num ajuste">${ajusteCel(o.ajuste)}</td><td class="num"><b>${qty(o.sobra)}</b></td><td class="num">${o.pct == null ? "—" : pct(o.pct)}</td>`;
  /* Um nível a mais: as lojas do produto (mesmas colunas do produto; a soma das lojas é a linha do produto). */
  const linhaLoja = (l) => `<tr class="sub-loja${l.emRisco ? " sub-risco" : ""}" hidden><td class="txt prod" title="${esc(l.lojaNome)}${l.emRisco ? " · sem estoque ou em risco" : ""}"><span class="sub-nome">${esc(l.lojaNome)}</span>${l.emRisco ? `<small class="alerta">sem estoque ou em risco</small>` : ""}</td>${celulas(l, true)}</tr>`;
  const linhaProd = (p) => `<tr class="c-${p.classe} linha-prod"><td class="txt prod" title="${esc(p.produto)} · ${esc(p.descricao)}"><button type="button" class="seta-lojas" aria-expanded="false" title="Mostrar as lojas deste produto">▸</button><b>${esc(p.produto)}</b> ${esc(p.descricao)}${p.lojasRisco ? `<small class="alerta">${p.lojasRisco} de ${p.lojas} lojas sem estoque ou em risco</small>` : ""}</td>${celulas(p)}</tr>${p.porLoja.map(linhaLoja).join("")}`;
  const ordemGrupo = {
    sobra: (l) => l,
    padrao: (l) => l,
    risco: (l) => [...l].sort((a, b) => b.lojasRisco - a.lojasRisco || b.venda - a.venda),
  };
  const tabelaGrupo = (c, g) => {
    const itensG = ordemGrupo[g.id](c.produtos.filter((p) => p.classe === g.id));
    return `<tbody class="grupo-${g.id}">${itensG.map(linhaProd).join("") || `<tr><td colspan="7" class="txt">Nenhum produto neste grupo.</td></tr>`}</tbody>`;
  };
  const card = (c) => {
    const n = nProd(c);
    const partes = partesEntrada(c);
    return `
    <article class="card sobra-card g-sobra" data-comp="${esc(c.comprador)}">
      <header>
        <div><h3>${esc(c.comprador)}</h3><small>${itens(n)} produtos · ${itens(c.pares)} pares de loja</small></div>
        <b class="sobra-pct" title="Estoque final ÷ (estoque inicial + entrada). Estoque inicial ${qty(c.inicial)} + entrada ${qty(c.entrada)} = ${qty(c.disponivel)}.">${c.pct == null ? "—" : pct(c.pct)}<small>do disponível sobrou</small></b>
        <div class="sobra-acoes">${botao("card")}${seletorLoja("no-card")}</div>
      </header>
      <p class="sobra-conta"><span><em>Estoque inicial</em>${qty(c.inicial)}</span><i>+</i><span><em title="Entradas do Entradas.txt nos quatro dias do período.">Entrada</em>${qty(c.entrada)}</span><i>=</i><span><em>Disponível</em>${qty(c.disponivel)}</span><i>−</i><span><em>Vendeu</em>${qty(c.venda)}</span><i>±</i><span class="ajuste"><em title="O que a conta não explica: quebra, transferência de saída ou entrada não registrada.">Ajuste</em>${Math.abs(c.ajuste) < 0.05 ? "0" : (c.ajuste > 0 ? "+" : "−") + qty(Math.abs(c.ajuste))}</span><i>→</i><span class="destaque"><em>Estoque final</em>${qty(c.sobra)}</span></p>
      <p class="sobra-origem" title="Cada entrada é ligada ao abastecimento do par loja + produto no arquivo de pedidos. Sem pedido: transferência entre lojas e outras entradas que o arquivo de pedidos não traz.">Entrada por abastecimento: ${partes.length ? partes.map((x) => `${x.nome.toLowerCase()} <b>${qty(Math.round(x.v))}</b>`).join(" · ") : "sem entrada"}</p>
      <div class="sobra-situacao">
        <p class="sobra-quanto">Dos <b>${itens(n)}</b> produtos (conta de produtos, não de unidades):</p>
        ${barra(c)}
        <div class="sobra-grupos" role="group" aria-label="Produtos por situação">
          ${GRUPOS_SOBRA.map((g, i) => { const q = [c.nSobra, c.nPadrao, c.nRisco][i]; return `<button type="button" class="grupo-btn grupo-btn-${g.id}" data-grupo="${g.id}" title="${esc(g.dica)}"><span>${g.nome}</span><b>${itens(q)}</b><small>${pc(q, n)} dos produtos</small></button>`; }).join("")}
        </div>
      </div>
      <details class="sobra-lista">
        <summary>Ver os produtos do grupo escolhido <span class="dica-lojas">· a seta ▸ abre as lojas do produto</span></summary>
        <p class="sobra-lojas-ctl"><button type="button" class="lojas-todas" data-abrir="1">Abrir as lojas de todos os produtos</button></p>
        <div class="table-wrap"><table class="sobra-tabela sobra-prod">
          <thead><tr><th class="txt">Produto</th><th class="num" title="Saldo de abertura do período, antes do 1º dia.">Estoque inicial</th><th class="num" title="Entradas do Entradas.txt nos quatro dias. A etiqueta diz o abastecimento: automático, manual ou sem pedido no arquivo de pedidos. Misto: mais de um; passe o mouse para ver as quantidades.">Entrada</th><th class="num">Vendeu</th><th class="num" title="Fecha a conta da linha: estoque inicial + entrada − vendeu + ajuste = estoque final. É o que os arquivos não explicam: quebra, transferência de saída, entrada não registrada, saldo negativo do sistema.">Ajuste</th><th class="num" title="Estoque do último dia">Estoque final</th><th class="num" title="Estoque final ÷ (estoque inicial + entrada)">% sobra</th></tr></thead>
          ${GRUPOS_SOBRA.map((g) => tabelaGrupo(c, g)).join("")}
        </table></div>
      </details>
    </article>`;
  };

  view.innerHTML = `
    <div class="sobra-param">
      <label>Faltando: alguma loja sem saldo ou com saldo para menos de <input type="number" id="sobra-risco" min="0" step="0.5" value="${sobraCfg.risco}"> dia(s) de venda</label>
      <label>Sobra: saldo para <input type="number" id="sobra-dias" min="1" step="1" value="${sobraCfg.dias}"> dias de venda ou mais</label>
      <span>Os dois limites são referência e podem ser alterados. Não vêm dos arquivos.</span>
    </div>
    ${comparacao}
    <div class="sobra-grade">${lista.map(card).join("")}</div>
    <p class="note">Por comprador, o que sobrou do que a oferta teve disponível, só nas 13 lojas: a central (70, CD) fica de fora. Tudo é do período inteiro, os quatro dias: estoque inicial = saldo de abertura, antes do 1º dia (o arquivo de estoque do primeiro dia fecha o dia, então a abertura sai da partida da linha dele); entrada = Entradas.txt dos quatro dias; vendeu = venda dos quatro dias. Disponível = estoque inicial + entrada. Estoque final = saldo do último dia. Saldo negativo do sistema conta como zero. Duas porcentagens diferentes: o percentual grande do card é de unidades (estoque final ÷ disponível); os percentuais dos grupos são de produtos (quantos produtos estão com sobra, no padrão ou faltando). Ajuste = o que a conta não explica (estoque final − (disponível − vendeu)): negativo é saída que nenhum arquivo traz, como quebra ou transferência; positivo é entrada não registrada. A entrada é referenciada ao abastecimento do par loja + produto no arquivo de pedidos: automático, manual ou sem pedido (transferência entre lojas e outras entradas que o arquivo de pedidos não traz). Se o par tem pedido automático e manual, a entrada se divide pela quantidade recebida de cada um. Situação do produto, olhando as lojas uma a uma: Faltando = pelo menos uma loja sem saldo ou com saldo para menos dias de venda que o limite de risco; Com sobra = nenhuma loja em risco e saldo para o limite de sobra em dias de venda ou mais (ou sem venda); No padrão = nenhuma loja em risco e saldo entre os dois. Soma de unidades de produtos diferentes: compare pelo percentual e pelas contagens, e aja pela lista de produtos. Rede: ${rede.pct == null ? "—" : pct(rede.pct)} de sobra em ${itens(rede.pares)} pares; ${itens(rede.fora)} pares ficam fora por não terem as duas linhas de estoque. Exportar CSV traz todos os produtos de todos os compradores.</p>`;

  /* interações */
  const sair = () => {
    document.querySelectorAll(".expandido").forEach((el) => el.classList.remove("expandido"));
    document.querySelectorAll(".sobra-full").forEach((b) => { b.textContent = "Tela cheia"; });
  };
  document.onfullscreenchange = () => { if (!document.fullscreenElement) sair(); };
  view.onclick = (event) => {
    const full = event.target.closest(".sobra-full");
    if (full) {
      const alvo = full.dataset.full === "card" ? full.closest(".sobra-card") : document.getElementById(full.dataset.full);
      if (alvo.classList.contains("expandido")) {
        sair();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        return;
      }
      sair();
      alvo.classList.add("expandido");
      full.textContent = "Sair da tela cheia";
      const det = alvo.querySelector("details");
      if (det) det.open = true;
      const pedido = alvo.requestFullscreen?.();
      if (pedido && typeof pedido.catch === "function") pedido.catch(() => {});
      return;
    }
    const seta = event.target.closest(".seta-lojas");
    if (seta) {
      const linha = seta.closest("tr");
      const abrir = seta.getAttribute("aria-expanded") !== "true";
      seta.setAttribute("aria-expanded", abrir ? "true" : "false");
      seta.textContent = abrir ? "▾" : "▸";
      seta.title = abrir ? "Ocultar as lojas deste produto" : "Mostrar as lojas deste produto";
      for (let prox = linha.nextElementSibling; prox && prox.classList.contains("sub-loja"); prox = prox.nextElementSibling) prox.hidden = !abrir;
      return;
    }
    const todas = event.target.closest(".lojas-todas");
    if (todas) {
      const abrir = todas.dataset.abrir === "1";
      const lista = todas.closest(".sobra-lista");
      lista.querySelectorAll(".seta-lojas").forEach((b) => { b.setAttribute("aria-expanded", abrir ? "true" : "false"); b.textContent = abrir ? "▾" : "▸"; });
      lista.querySelectorAll(".sub-loja").forEach((tr) => { tr.hidden = !abrir; });
      todas.dataset.abrir = abrir ? "0" : "1";
      todas.textContent = abrir ? "Ocultar as lojas de todos os produtos" : "Abrir as lojas de todos os produtos";
      return;
    }
    const ordem = event.target.closest(".sobra-ordem");
    if (ordem) {
      const k = ordem.dataset.ordem;
      sobraCfg.sentido = sobraCfg.ordem === k ? (sobraCfg.sentido === "asc" ? "desc" : "asc") : (k === "comprador" ? "asc" : "desc");
      sobraCfg.ordem = k;
      const aberto = document.fullscreenElement;
      render();
      if (aberto) document.getElementById("sobra-comp")?.requestFullscreen?.().then(() => document.getElementById("sobra-comp")?.classList.add("expandido")).catch(() => {});
      return;
    }
    const grupo = event.target.closest(".grupo-btn");
    if (grupo) {
      const cardEl = grupo.closest(".sobra-card");
      cardEl.className = cardEl.className.replace(/\bg-\w+/g, "") + ` g-${grupo.dataset.grupo}`;
      cardEl.querySelector("details").open = true;
    }
  };
  document.querySelector("#sobra-risco").onchange = (e) => { sobraCfg.risco = Math.max(0, Number(e.target.value) || 0); render(); };
  document.querySelector("#sobra-dias").onchange = (e) => { sobraCfg.dias = Math.max(1, Number(e.target.value) || 1); render(); };
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
  place(filters() + table([
    { key: "loja", label: "Loja", value: (row) => row.lojaNome, cell: (row) => row.lojaNome },
    { key: "produto", label: "Produto", value: (row) => row.produto, cell: (row) => row.produto },
    { key: "descricao", label: "Descrição", value: (row) => row.descricao, cell: (row) => row.descricao },
    { key: "comprador", label: "Comprador", value: (row) => row.comprador, cell: (row) => row.comprador },
    { key: "relacao", label: "Relação", value: (row) => label[row.relacao] || row.relacao, cell: (row) => label[row.relacao] || row.relacao },
    { key: "manuais", label: "Pedidos manuais", num: true, value: (row) => row.manuais, cell: (row) => qty(row.manuais) },
  ], rows));
  bindFilters(rows);
}

function renderCentral(result) {
  const central = result.central;
  if (!central.disponivel) {
    view.innerHTML = `<p class="note">Os arquivos de estoque desta semana não trazem a central (empresa 70) nos dois dias. Sem o saldo inicial e o saldo final da central, esta tela não calcula transferência nem compra.</p>`;
    return;
  }
  view.innerHTML = `
    <div class="cards">
      <article class="card"><span>Oferta com saldo na central</span><strong>${qty(central.oferta)}</strong></article>
      <article class="card"><span>Central cresceu</span><strong>${qty(central.cresceu)}</strong></article>
      <article class="card"><span>Central caiu</span><strong>${qty(central.caiu)}</strong></article>
      <article class="card"><span>Loja zerada e central com saldo</span><strong>${qty(central.lojaZeradaCdComSaldo)}</strong></article>
      <article class="card"><span>Loja e central zeradas</span><strong>${qty(central.ambosZerados)}</strong></article>
    </div>
    <p class="note">${result.quality.movimento ? "Loja zerada com saldo na central indica falta de transferência. As duas zeradas indicam falta de compra. A saída da central escrita no arquivo é a QTDSAIDA do último movimento." : "Loja zerada com saldo na central indica falta de transferência. As duas zeradas indicam falta de compra. Esta pasta ainda não tem a saída no arquivo de estoque."}</p>`;
}

function renderQuality(result) {
  const quality = result.quality;
  view.innerHTML = `
    <div class="cards">
      <article class="card"><span>Linhas de venda</span><strong>${qty(quality.salesRows)}</strong></article>
      <article class="card"><span>Pares com venda</span><strong>${qty(quality.paresComVenda)}</strong></article>
      <article class="card"><span>Conta de saldo que fecha</span><strong>${qty(quality.fecha)}</strong></article>
      <article class="card"><span>Conta que não fecha</span><strong>${qty(quality.aberta)}</strong></article>
      <article class="card"><span>Pares com a conta da janela</span><strong>${qty(quality.janelaPares)}</strong></article>
      <article class="card"><span>Janela fecha</span><strong>${qty(quality.janelaFecha)}</strong></article>
      <article class="card"><span>Final abaixo da conta</span><strong>${qty(quality.janelaAbaixo)}</strong></article>
      <article class="card"><span>Final acima da conta</span><strong>${qty(quality.janelaAcima)}</strong></article>
      <article class="card"><span>Pares com recebido do pedido</span><strong>${qty(quality.recebidoPares)}</strong><small>${qty(quality.recebidoQtd)} unidades</small></article>
      <article class="card"><span>Recebido sem entrada no estoque</span><strong>${qty(quality.recebidoSemEntradaPares)}</strong><small>${qty(quality.recebidoSemEntradaQtd)} unidades</small></article>
      <article class="card"><span>Ruptura (saldo zero)</span><strong>${qty(quality.zero)}</strong><small>${qty(quality.zeroSemPedido)} sem pedido · ${qty(quality.zeroAtrasado)} pedido atrasado · ${qty(quality.zeroRecebido)} recebido e vendido · ${qty(quality.zeroRecebidoSemEntrada)} recebido sem entrada · ${qty(quality.zeroCancelado)} cancelado</small></article>
      <article class="card"><span>Pendente nas rupturas</span><strong>${qty(quality.pendenteZeroQtd)}</strong><small>unidades · ${money(quality.pendenteZeroValor)} a custo</small></article>
      <article class="card"><span>Linhas de estoque fora da conta</span><strong>${qty(quality.naoFecha)}</strong></article>
      <article class="card"><span>Vendeu sem linha de estoque</span><strong>${qty(quality.semPosicaoVenda)}</strong></article>
      <article class="card"><span>Entradas repetidas descartadas</span><strong>${qty(quality.entradasRepetidas)}</strong></article>
      <article class="card"><span>Nome do pedido diferente do cadastro</span><strong>${qty(result.sistematica.nomesDiferentes)}</strong></article>
      <article class="card"><span>Linhas do automático</span><strong>${qty(result.sistematica.linhas)}</strong></article>
      <article class="card"><span>Pares na mesma loja com as duas sistemáticas</span><strong>${qty(result.datas.length)}</strong></article>
    </div>
    <p class="note">${quality.movimento ? "A conta de cada linha de estoque é partida + entrada − saída. Ela usa EstoqueInicio.txt e EstoqueFim.txt. Empresas 2, 3, 4, 6, 18, 50, 60 e 61 ficam de fora. O comprador vem de Dimproduto." : "A posição vem do arquivo do primeiro dia e do arquivo do último dia. A conta da semana soma entrada, saída e venda só dos dias posteriores ao primeiro. Empresas 2, 3, 4, 6, 18, 50, 60 e 61 ficam de fora. O comprador vem de Dimproduto."}</p>`;
}

function renderDetail() {
  const rows = currentRows();
  const groups = {
    ruptura: [["zero", "Saldo zero"], ["negativo", "Saldo negativo"], ["provavel", "Ruptura provável"]],
    "sem-venda": [["positivo", "Com saldo"], ["zero", "Saldo zero"], ["sem-linha", "Sem linha de estoque"]],
    excecao: [["sem-entrada", "Sem entrada"], ["insuficiente", "Entrada insuficiente"]],
  };
  const buttons = (groups[state.view] || []).map(([id, label]) => `<button type="button" class="${state.grupo === id ? "" : "secondary"}" data-grupo="${id}">${label}</button>`).join("");
  place(`<div class="filters">${buttons}</div>${filters()}${table(detailColumns(), rows)}`);
  bindFilters(rows);
}

function exportCsv() {
  const rows = state.view === "detalhe" && state.grupo === "venda-semana"
    ? linhasDaFaixa().map((row) => ({ produto: row.produto, descricao: row.descricao, comprador: row.comprador, semanaAnterior: state.repeticao === "estreia-zero" ? "Não estava na oferta" : row.antes, estaSemana: row.valor, diferenca: state.repeticao === "estreia-zero" ? "" : row.delta, variacao: state.repeticao === "estreia-zero" ? "" : row.percentual }))
    : state.view === "detalhe" && state.grupo === "lancamento"
    ? state.result?.lancamento?.porNome || []
    : state.view === "sobra" ? sobraPorComprador(state.result?.details || [], { risco: sobraCfg.risco, sobraDias: sobraCfg.dias }).flatMap((c) => c.produtos.map((p) => ({ comprador: c.comprador, produto: p.produto, descricao: p.descricao, lojas: p.lojas, estoqueInicial: p.inicial, entrada: p.entrada, entradaAutomatica: Math.round(p.entAuto), entradaManual: Math.round(p.entManual), entradaSemPedido: Math.round(p.entSemPedido), vendeu: p.venda, estoqueFinal: p.sobra, percentualSobra: p.pct == null ? "" : p.pct, situacao: p.classe, lojasEmRisco: p.lojasRisco, contaAberta: p.abertos, recebidoSemEntrada: p.recSemEntrada })))
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

document.querySelector("#reload").onclick = () => run(() => loadServerFiles(state.qual));
document.querySelector("#semana-periodo").onclick = () => run(() => loadServerFiles("periodo"));
document.querySelector("#semana-raiz").onclick = () => run(() => loadServerFiles("raiz"));
document.querySelector("#pick").onclick = async () => {
  if (!window.showDirectoryPicker) {
    setProgress(0, "Este navegador não guarda a pasta. Use Chrome ou Edge.");
    return;
  }
  const dir = await window.showDirectoryPicker();
  run(() => loadPickedDirectory(dir));
};
document.querySelector("#export").onclick = exportCsv;
// Filtro por loja: o do alto da página e os dos cards são o mesmo filtro.
document.querySelector("#loja-global-caixa").innerHTML = seletorLoja("no-topo");
document.addEventListener("change", (event) => {
  if (event.target.classList?.contains("sel-loja")) trocarLoja(event.target.value);
});
window.__fdsTeste = { state, trocarLoja, comparacaoVenda, sobraPorComprador };
render();
run(loadServerFiles);
