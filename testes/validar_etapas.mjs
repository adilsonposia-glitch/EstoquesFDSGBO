// Validação etapa por etapa de uma semana. Uso:
//   node testes/validar_etapas.mjs "Entrada Novo Período"
//   node testes/validar_etapas.mjs "Semanas anteriores/08-11 Out 2026"
// Cada etapa recalcula o número a partir do arquivo cru, sem usar o engine.js, e compara com o que o engine.js devolve.
// PASS / FALHA: o cálculo bate (ou não) com o arquivo. ACHADO: o arquivo mostra algo que a regra precisa explicar.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pasta = path.resolve(RAIZ, process.argv[2] || "Entrada Novo Período");
const { analyze, lojasFromXlsx, sobraPorComprador } = await import(pathToFileURL(path.join(RAIZ, "visualizar/engine.js")).href + "?t=" + Date.now());

const RETAIL = ["1", "5", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];
const KEEP = new Set([...RETAIL, "70"]);
const SAIDA = new Set(["802", "902", "903"]);
const EPS = 0.05;
const dec = (p) => new TextDecoder("windows-1252").decode(fs.readFileSync(p));
const sa = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const num = (v) => { const t = String(v ?? "").trim(); if (!t) return 0; const n = Number(t.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const iso = (t) => { const [d, m, a] = String(t || "").slice(0, 10).split(/[/-]/); return a ? `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : ""; };
const linhas = (t) => t.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
const f2 = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n0 = (v) => v.toLocaleString("pt-BR");

let falhas = 0;
let etapa = "";
const titulo = (t) => { etapa = t; console.log(`\n== ${t}`); };
const pass = (t, d = "") => console.log(`  [PASS]   ${t}${d ? ` — ${d}` : ""}`);
const falha = (t, d = "") => { falhas += 1; console.log(`  [FALHA]  ${t}${d ? ` — ${d}` : ""}`); };
const achado = (t, d = "") => console.log(`  [ACHADO] ${t}${d ? ` — ${d}` : ""}`);
const info = (t, d = "") => console.log(`  [info]   ${t}${d ? ` — ${d}` : ""}`);
const confere = (t, a, b, tol = 0.005) => (Math.abs(a - b) <= tol ? pass(t, `${f2(a)}`) : falha(t, `arquivo ${f2(a)} × engine ${f2(b)}`));

// ---------- carga ----------
const nomes = fs.readdirSync(pasta);
const achar = (alvo) => nomes.find((n) => sa(n) === sa(alvo));
const ofertaNome = nomes.find((n) => sa(n).startsWith("ofertasdoper"));
const ofertasTexto = dec(path.join(pasta, ofertaNome));
const ano = (ofertasTexto.split(/\r?\n/)[1].match(/\b\d{2}[-/]\d{2}[-/](\d{4})\b/) || [])[1];
const vendasArq = [];
for (const n of nomes) {
  const c = n.match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
  const s = n.match(/^vendas?\s*(\d{2})(\d{2})\.txt$/i);
  if (c) vendasArq.push({ date: c[1], n });
  else if (s) vendasArq.push({ date: `${s[1]}-${s[2]}-${ano}`, n });
}
const kd = (d) => d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);
vendasArq.sort((a, b) => kd(a.date).localeCompare(kd(b.date)));
let estIni = achar("EstoqueInicio.txt");
let estFim = achar("EstoqueFim.txt");
if (!estIni || !estFim) {
  const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const est = (d) => nomes.find((n) => new RegExp(`^estoque\\s*${d.slice(0, 2)}${MES[Number(d.slice(3, 5)) - 1]}(\\d{2})?\\.txt$`, "i").test(n));
  estIni = est(vendasArq[0].date);
  estFim = est(vendasArq[vendasArq.length - 1].date);
}
const dimDir = fs.existsSync(path.join(pasta, "Dimproduto.txt")) ? pasta : RAIZ;
const lojasPath = fs.existsSync(path.join(pasta, "Lojas.xlsx")) ? path.join(pasta, "Lojas.xlsx") : path.join(RAIZ, "Lojas.xlsx");
const entrada = {
  sales: vendasArq.map((v) => ({ date: v.date, text: dec(path.join(pasta, v.n)) })),
  inicio: dec(path.join(pasta, estIni)), fim: dec(path.join(pasta, estFim)),
  entradas: dec(path.join(pasta, achar("Entradas.txt"))), dim: dec(path.join(dimDir, "Dimproduto.txt")),
  automatico: dec(path.join(pasta, achar("Automatico.txt"))), ofertas: ofertasTexto,
  lojas: await lojasFromXlsx(new Uint8Array(fs.readFileSync(lojasPath))), coverLimit: 1,
};
console.log(`Pasta: ${pasta}`);
console.log(`Vendas: ${vendasArq.map((v) => v.n).join(", ")} | Estoque: ${estIni}, ${estFim} | Ofertas: ${ofertaNome}`);
const r = analyze(entrada);
if (!r.ok) { console.log("engine recusou a semana:", r.message); process.exit(1); }
const dias = entrada.sales.map((s) => iso(s.date));

// ---------- Etapa 1: arquivos e período ----------
titulo("Etapa 1 — Arquivos e período");
{
  const dow = dias.map((d) => new Date(d + "T12:00:00").getDay());
  if (dias.length === 4 && dow[0] === 4 && dow[3] === 0) pass("Quatro dias, de quinta a domingo", `${dias[0]} a ${dias[3]}`); else falha("Janela quinta a domingo", dias.join(", "));
  const seg = dias.every((d, i) => i === 0 || (new Date(d) - new Date(dias[i - 1])) / 86400000 === 1);
  seg ? pass("Dias seguidos") : falha("Dias seguidos");
  const lerEst = (t) => linhas(t).slice(1).map((l) => l.split(";"));
  const cab = linhas(entrada.inicio)[0];
  const movimento = cab.startsWith("NROEMPRESA;SEQPRODUTO;ULTDTAMOVIMENTO");
  info("Layout do estoque", movimento ? "movimento de sete colunas" : "posição");
  if (movimento) {
    const maxIni = lerEst(entrada.inicio).map((p) => iso(p[2])).reduce((a, b) => (b > a ? b : a), "");
    const maxFim = lerEst(entrada.fim).map((p) => iso(p[2])).reduce((a, b) => (b > a ? b : a), "");
    maxIni <= dias[0] ? pass("Estoque inicial: nenhum movimento depois do primeiro dia", `último ${maxIni}`) : falha("Estoque inicial com movimento depois do primeiro dia", maxIni);
    maxFim <= dias[3] ? pass("Estoque final: nenhum movimento depois do último dia", `último ${maxFim}`) : falha("Estoque final com movimento depois do último dia", maxFim);
  }
  const rec = linhas(entrada.automatico).slice(1).map((l) => l.split(";")).filter((p) => p.length > 28 && KEEP.has(p[0]));
  const fora = rec.filter((p) => { const d = iso(p[23]); return d < dias[0] || d > dias[3]; }).length;
  fora === 0 ? pass("Automático: todo DTRECEBIMENTO dentro dos quatro dias", `${n0(rec.length)} linhas`) : achado("Automático com DTRECEBIMENTO fora dos quatro dias", `${n0(fora)} de ${n0(rec.length)}`);
  const ent = linhas(entrada.entradas).slice(1).map((l) => l.split(";")).filter((p) => p.length > 7 && KEEP.has(p[4]));
  const dEnt = ent.map((p) => iso(p[0])).sort();
  info("Entradas.txt cobre", `${dEnt[0]} a ${dEnt[dEnt.length - 1]} (${n0(ent.length)} linhas)`);
  const dentro = ent.filter((p) => iso(p[0]) >= dias[0] && iso(p[0]) <= dias[3]).length;
  dentro === ent.length ? pass("Entradas.txt dentro dos quatro dias") : achado("Entradas.txt com linhas fora dos quatro dias", `${n0(ent.length - dentro)} de ${n0(ent.length)}`);
  const of = linhas(ofertasTexto).slice(1).map((l) => l.split(";")).filter((p) => p.length > 10 && RETAIL.includes(p[0]));
  const semCruzar = of.filter((p) => iso(p[5]) < dias[0] || iso(p[4]) > dias[3]).length;
  semCruzar === 0 ? pass("Ofertas: toda linha tem promoção que cruza a janela") : achado("Ofertas com promoção que não cruza a janela", `${n0(semCruzar)} de ${n0(of.length)} linhas`);
  const fimDepois = of.filter((p) => iso(p[5]) > dias[3]);
  fimDepois.length === 0 ? pass("Ofertas: nenhuma promoção termina depois do domingo") : achado("Ofertas com promoção que termina depois do domingo (VLRTOTALVDA acumula além da semana)", `${n0(fimDepois.length)} linhas, R$ ${f2(fimDepois.reduce((t, p) => t + num(p[10]), 0))}`);
}

// ---------- Etapa 2: venda ----------
titulo("Etapa 2 — Venda diária");
const vendaChave = new Map(); // `${dia}|${loja}|${prod}` -> qtd
const vendaPar = new Map();
let vendaTotal = 0;
const vendaLoja = {};
{
  let violacoes = 0, duplicadas = 0, central = 0, lidas = 0;
  entrada.sales.forEach((s) => {
    const vistos = new Set();
    linhas(s.text).slice(1).forEach((l) => {
      const p = l.split(";");
      if (p.length < 7) return;
      if (p[0] === "70") { central += 1; return; }
      if (!RETAIL.includes(p[0])) return;
      lidas += 1;
      const k = `${p[0]}|${p[1]}`;
      if (vistos.has(k)) duplicadas += 1;
      vistos.add(k);
      const q = num(p[3]), v = num(p[4]);
      if (q > 0 && Math.abs(num(p[8]) - v / q) > 0.011) violacoes += 1;
      vendaChave.set(`${iso(s.date)}|${k}`, (vendaChave.get(`${iso(s.date)}|${k}`) || 0) + q);
      vendaPar.set(k, (vendaPar.get(k) || 0) + q);
      vendaTotal += v;
      vendaLoja[p[0]] = (vendaLoja[p[0]] || 0) + v;
    });
  });
  violacoes === 0 ? pass("VLRUNITARIOMED = VLRVENDA / QUANTIDADE em todas as linhas", `${n0(lidas)} linhas`) : achado("VLRUNITARIOMED diferente de VLRVENDA / QUANTIDADE", `${n0(violacoes)} linhas`);
  duplicadas === 0 ? pass("Nenhum par loja + produto repetido no mesmo dia") : achado("Par loja + produto repetido no mesmo dia", n0(duplicadas));
  central === 0 ? pass("Central (70) sem venda") : achado("Central com linhas de venda", n0(central));
  confere("Venda total das 13 lojas (soma dos quatro dias)", vendaTotal, r.rede.total);
}

// ---------- Etapa 3: oferta e participação ----------
titulo("Etapa 3 — Oferta e participação");
const produtosOferta = new Set();
const ofertaLoja = {};
{
  let soma = 0;
  linhas(ofertasTexto).slice(1).forEach((l) => {
    const p = l.split(";");
    if (p.length < 11 || !RETAIL.includes(p[0])) return;
    produtosOferta.add(p[6]);
    ofertaLoja[p[0]] = (ofertaLoja[p[0]] || 0) + num(p[10]);
    soma += num(p[10]);
  });
  confere("Venda da oferta (soma de VLRTOTALVDA nas 13 lojas)", soma, r.rede.venda);
  produtosOferta.size === r.quality.produtosOferta ? pass("Produtos de oferta", n0(produtosOferta.size)) : falha("Produtos de oferta", `${produtosOferta.size} × ${r.quality.produtosOferta}`);
  r.details.length === produtosOferta.size * RETAIL.length ? pass("Pares loja + produto = 13 × produtos", n0(r.details.length)) : falha("Pares loja + produto", `${r.details.length} × ${produtosOferta.size * RETAIL.length}`);
  confere("Participação da rede", soma / vendaTotal, r.rede.participacao, 1e-9);
  let erroLoja = 0;
  for (const loja of r.lojas) if (Math.abs(loja.participacao - (ofertaLoja[loja.id] || 0) / (vendaLoja[loja.id] || 1)) > 1e-9) erroLoja += 1;
  erroLoja === 0 ? pass("Participação das 13 lojas recalculada") : falha("Participação por loja", `${erroLoja} lojas diferentes`);
  const maior = RETAIL.filter((id) => (ofertaLoja[id] || 0) > (vendaLoja[id] || 0));
  maior.length === 0 ? pass("Nenhuma loja com venda da oferta acima da venda total") : achado("Loja com venda da oferta acima da venda total (VLRTOTALVDA acumula além dos quatro dias)", maior.join(", "));
  const dimIds = new Set(linhas(entrada.dim).slice(1).map((l) => l.split(";")[1]));
  const semCad = [...produtosOferta].filter((p) => !dimIds.has(p));
  semCad.length === 0 ? pass("Todos os produtos da oferta estão no Dimproduto") : achado("Produtos da oferta fora do Dimproduto", n0(semCad.length));
}

// ---------- Etapa 4: estoque por arquivo ----------
titulo("Etapa 4 — Estoque, arquivo por arquivo");
const ler = (texto) => {
  const mapa = new Map();
  let abertas = 0, dup = 0, neg = 0, lidas = 0;
  const cab = linhas(texto)[0];
  if (!cab.startsWith("NROEMPRESA;SEQPRODUTO;ULTDTAMOVIMENTO")) return { mapa, naoMovimento: true };
  linhas(texto).slice(1).forEach((l) => {
    const p = l.split(";");
    if (p.length < 7 || !KEEP.has(p[0])) return;
    lidas += 1;
    const k = `${p[0]}|${p[1]}`;
    if (mapa.has(k)) dup += 1;
    const reg = { data: iso(p[2]), partida: num(p[3]), ent: num(p[4]), sai: num(p[5]), est: num(p[6]) };
    if (Math.abs(reg.partida + reg.ent - reg.sai - reg.est) > EPS) abertas += 1;
    if (reg.est < -EPS) neg += 1;
    mapa.set(k, reg);
  });
  return { mapa, abertas, dup, neg, lidas };
};
const E1 = ler(entrada.inicio), E2 = ler(entrada.fim);
const movimentoMode = !E1.naoMovimento && !E2.naoMovimento;
if (!movimentoMode) {
  info("Semana com estoque de posição: etapas 4 a 6 não se aplicam a este layout");
} else {
  for (const [nome, E] of [["inicial", E1], ["final", E2]]) {
    E.abertas === 0 ? pass(`Arquivo ${nome}: partida + entrada − saída = estoque em todas as linhas`, `${n0(E.lidas)} linhas`) : achado(`Arquivo ${nome}: linhas em que a conta não fecha`, n0(E.abertas));
    E.dup === 0 ? pass(`Arquivo ${nome}: sem loja + produto repetido`) : achado(`Arquivo ${nome}: loja + produto repetido`, n0(E.dup));
    info(`Arquivo ${nome}: saldo negativo`, n0(E.neg));
  }
  const cd = (E) => [...E.mapa.keys()].filter((k) => k.startsWith("70|")).length;
  cd(E1) && cd(E2) ? pass("Central presente nos dois arquivos", `${n0(cd(E1))} e ${n0(cd(E2))} linhas`) : achado("Central ausente em um dos arquivos", `${cd(E1)} e ${cd(E2)}`);
  const naOferta = (E) => { let n = 0; for (const k of E.mapa.keys()) { const [l, p] = k.split("|"); if (RETAIL.includes(l) && produtosOferta.has(p)) n += 1; } return n; };
  info("Pares da oferta com linha no estoque inicial / final", `${n0(naOferta(E1))} / ${n0(naOferta(E2))} de ${n0(r.details.length)}`);
}

// ---------- Etapa 5: encadeamento ----------
const entPar = new Map(), saiPar = new Map();
if (movimentoMode) {
  titulo("Etapa 5 — Encadeamento dos dois arquivos");
  let ambos = 0, invertida = 0, iguais = 0, mesmaDataDif = 0, encadeia = 0, intervalo = 0;
  for (const d of r.details) {
    const a = E1.mapa.get(`${d.loja}|${d.produto}`), b = E2.mapa.get(`${d.loja}|${d.produto}`);
    if (!a || !b) continue;
    ambos += 1;
    if (b.data < a.data) invertida += 1;
    if (b.data === a.data) { iguais += 1; if (Math.abs(a.est - b.est) > EPS) mesmaDataDif += 1; }
    if (b.data > a.data) { if (Math.abs(b.partida - a.est) <= EPS) encadeia += 1; else intervalo += 1; }
  }
  const comLinha = r.details.filter((d) => d.inicial != null && d.final != null).length;
  comLinha === ambos ? pass("Pares com as duas linhas", n0(ambos)) : falha("Pares com as duas linhas", `${ambos} × engine ${comLinha}`);
  invertida === 0 ? pass("Data do último movimento do arquivo final nunca anterior à do inicial") : falha("Data do movimento invertida", n0(invertida));
  mesmaDataDif === 0 ? pass("Mesma data de movimento nos dois arquivos: mesmo saldo", `${n0(iguais)} pares`) : achado("Mesma data de movimento com saldo diferente", n0(mesmaDataDif));
  info("Linha final continua o saldo inicial (partida final = estoque inicial)", `${n0(encadeia)} pares`);
  info("Linha final com intervalo (dias do meio sem linha)", `${n0(intervalo)} pares`);
}

// ---------- Etapa 6: conta da janela ----------
if (movimentoMode) {
  titulo("Etapa 6 — Conta da janela: estoque inicial + entrada − saída − venda = estoque final");
  const vistos = new Set();
  const entradaDia = new Map(), saidaDia = new Map();
  linhas(entrada.entradas).slice(1).forEach((l) => {
    if (vistos.has(l)) return;
    vistos.add(l);
    const p = l.split(";");
    if (p.length < 8 || !KEEP.has(p[4])) return;
    const k = `${iso(p[0])}|${p[4]}|${p[5]}`;
    (SAIDA.has(p[2]) ? saidaDia : entradaDia).set(k, ((SAIDA.has(p[2]) ? saidaDia : entradaDia).get(k) || 0) + num(p[7]));
  });
  let comparados = 0, iguais = 0, fecha = 0, abaixo = 0, acima = 0;
  const abaixoLista = [];
  for (const d of r.details) {
    const chave = `${d.loja}|${d.produto}`;
    const a = E1.mapa.get(chave), b = E2.mapa.get(chave);
    if (!a || !b) continue;
    const dd = dias.filter((x) => x > a.data && x <= b.data);
    const soma = (mapa) => dd.reduce((t, x) => t + (mapa.get(`${x}|${chave}`) || 0), 0);
    const ent = soma(entradaDia), sai = soma(saidaDia), ven = dd.reduce((t, x) => t + (vendaChave.get(`${x}|${chave}`) || 0), 0);
    const conta = a.est + ent - sai - ven;
    comparados += 1;
    if (d.conta != null && Math.abs(d.conta - conta) < 1e-6) iguais += 1;
    const dif = b.est - conta;
    if (Math.abs(dif) <= EPS) fecha += 1; else if (dif < 0) { abaixo += 1; abaixoLista.push({ chave, dif }); } else acima += 1;
  }
  iguais === comparados ? pass("Conta de cada par recalculada do arquivo cru igual à do engine", `${n0(comparados)} pares`) : falha("Conta recalculada diferente da do engine", `${n0(comparados - iguais)} de ${n0(comparados)}`);
  fecha === r.quality.janelaFecha && abaixo === r.quality.janelaAbaixo && acima === r.quality.janelaAcima ? pass("Fecha / abaixo / acima iguais aos do engine", `${n0(fecha)} / ${n0(abaixo)} / ${n0(acima)}`) : falha("Fecha / abaixo / acima", `arquivo ${fecha}/${abaixo}/${acima} × engine ${r.quality.janelaFecha}/${r.quality.janelaAbaixo}/${r.quality.janelaAcima}`);
  const pct = (v) => `${(v / comparados * 100).toFixed(2).replace(".", ",")}%`;
  achado("A conta da janela fecha", `${n0(fecha)} de ${n0(comparados)} (${pct(fecha)})`);
  achado("Estoque final abaixo da conta (saiu mais do que venda e saídas registradas explicam)", `${n0(abaixo)} (${pct(abaixo)}), ${f2(abaixoLista.reduce((t, x) => t + x.dif, 0))} unidades`);
  achado("Estoque final acima da conta (entrou mais do que as entradas registradas explicam)", `${n0(acima)} (${pct(acima)})`);
  const abertas = r.details.filter((d) => d.irregular).length;
  abertas === r.quality.aberta ? pass("Conta aberta da tela = linha aberta ou janela aberta", n0(abertas)) : falha("Conta aberta da tela", `${abertas} × ${r.quality.aberta}`);
}

// ---------- Etapa 7: pedido recebido x estoque ----------
titulo("Etapa 7 — Pedido recebido x entrada no estoque");
{
  const recebido = new Map();
  linhas(entrada.automatico).slice(1).forEach((l) => {
    const p = l.split(";");
    if (p.length < 29 || !RETAIL.includes(p[0]) || !produtosOferta.has(p[5])) return;
    const k = `${p[0]}|${p[5]}`;
    recebido.set(k, (recebido.get(k) || 0) + num(p[18]));
  });
  let errados = 0;
  for (const d of r.details) {
    const esperado = recebido.get(`${d.loja}|${d.produto}`) || 0;
    if (Math.abs(((d.entradaAutomatica || 0) + (d.entradaManual || 0)) - esperado) > 1e-6) errados += 1;
  }
  errados === 0 ? pass("Quantidade recebida por par igual à soma de QTDRECEBIDA do arquivo", `${n0(recebido.size)} pares`) : falha("Quantidade recebida por par", `${n0(errados)} pares diferentes`);
  const pares = r.details.filter((d) => (d.recebido || 0) > EPS && d.conta != null);
  const qtd = pares.reduce((t, d) => t + d.recebido, 0);
  const sem = pares.filter((d) => d.recebidoSemEntrada);
  info("Pares com recebido do pedido e as duas linhas de estoque", `${n0(pares.length)} (${f2(qtd)} unidades)`);
  achado("Recebido do pedido sem nenhuma entrada visível (nem na linha do estoque nem no Entradas.txt)", `${n0(sem.length)} pares, ${f2(sem.reduce((t, d) => t + d.recebido, 0))} unidades`);
  const fechaSem = sem.filter((d) => d.fechaConta).length;
  achado("Desses, a conta da janela fecha sem a quantidade recebida (o estoque confirma que ela não entrou)", `${n0(fechaSem)} de ${n0(sem.length)}`);
  const entradaNesses = pares.reduce((t, d) => t + (d.entradaMov || 0), 0);
  info("Entradas.txt nos pares com recebido", `${f2(entradaNesses)} unidades contra ${f2(qtd)} recebidas`);
}

// ---------- Etapa 8: ruptura, cobertura, sem venda ----------
titulo("Etapa 8 — Ruptura, saldo negativo, ruptura provável e sem venda");
{
  let zero = 0, neg = 0, prov = 0, semVendaSaldo = 0, semVendaZero = 0, semLinha = 0;
  for (const d of r.details) {
    const venda = vendaPar.get(`${d.loja}|${d.produto}`) || 0;
    const vendeu = vendaPar.has(`${d.loja}|${d.produto}`);
    const b = movimentoMode ? E2.mapa.get(`${d.loja}|${d.produto}`) : null;
    if (!movimentoMode) break;
    if (!b) { if (!vendeu) semLinha += 1; continue; }
    if (Math.abs(b.est) <= EPS) { zero += 1; if (!vendeu) semVendaZero += 1; }
    else if (b.est < -EPS) neg += 1;
    else if (!vendeu) semVendaSaldo += 1;
    if (vendeu && venda > EPS && b.est > EPS && (b.est * 4) / venda < 1) prov += 1;
  }
  if (movimentoMode) {
    const eng = (f) => r.details.filter(f).length;
    const cmp = (t, a, b2) => (a === b2 ? pass(t, n0(a)) : falha(t, `arquivo ${n0(a)} × engine ${n0(b2)}`));
    cmp("Ruptura (saldo final zero)", zero, eng((d) => d.situacao === "zero"));
    cmp("Saldo negativo", neg, eng((d) => d.situacao === "negativo"));
    cmp("Ruptura provável (cobertura < 1 dia)", prov, eng((d) => d.provavel));
    cmp("Sem venda com saldo positivo", semVendaSaldo, eng((d) => !d.vendeu && d.situacao === "positivo"));
    cmp("Sem venda com saldo zero", semVendaZero, eng((d) => !d.vendeu && d.situacao === "zero"));
    cmp("Sem venda e sem linha de estoque", semLinha, eng((d) => !d.vendeu && d.situacao === "sem-linha"));
  }
}

// ---------- Etapa 9: sem entrada e entrada insuficiente ----------
if (movimentoMode) {
  titulo("Etapa 9 — Exceções do estoque que subiu");
  const subiu = r.details.filter((d) => d.inicial != null && d.final != null && d.final > d.inicial + EPS);
  const semEnt = subiu.filter((d) => (d.entradaDepois || 0) <= EPS && (d.entradaMov || 0) <= EPS);
  const insuf = subiu.filter((d) => d.conta != null && d.final > d.conta + EPS && !((d.entradaDepois || 0) <= EPS && (d.entradaMov || 0) <= EPS));
  const eng = (t) => r.details.filter((d) => d.excecao === t).length;
  semEnt.length === eng("sem-entrada") ? pass("Sem entrada", `${n0(semEnt.length)} de ${n0(subiu.length)} pares que subiram`) : falha("Sem entrada", `${semEnt.length} × ${eng("sem-entrada")}`);
  insuf.length === eng("entrada-insuficiente") ? pass("Entrada insuficiente", `${n0(insuf.length)}`) : falha("Entrada insuficiente", `${insuf.length} × ${eng("entrada-insuficiente")}`);
  const soLinhaFinal = subiu.filter((d) => (d.entradaDepois || 0) <= EPS && (d.entradaMov || 0) > EPS).length;
  info("Pares que subiram com entrada só no Entradas.txt (não eram 'sem entrada' pela regra antiga, da linha final)", n0(soLinhaFinal));
}

// ---------- Etapa 10: causa da ruptura pelo pedido (saldo pendente) ----------
if (movimentoMode) {
  titulo("Etapa 10 — Causa do estoque zero: pedido pendente, recebido, cancelado ou sem pedido");
  const fora = new Set(["EMBALAGEM", "MATERIAPRIMA", "USOCONSUMO", ""]);
  const ped = new Map();
  let linhasPed = 0, saldoErrado = 0, canceladoComSaldo = 0;
  linhas(entrada.automatico).slice(1).forEach((l) => {
    const p = l.split(";");
    if (p.length < 29 || !RETAIL.includes(p[0]) || !produtosOferta.has(p[5]) || fora.has(p[28].trim().toUpperCase())) return;
    linhasPed += 1;
    const aprovada = num(p[16]), recebida = num(p[18]), cancelada = num(p[19]), saldo = num(p[20]);
    if (Math.abs(aprovada - recebida - cancelada - saldo) > EPS) saldoErrado += 1;
    if (p[25] === "C" && saldo > EPS) canceladoComSaldo += 1;
    const k = `${p[0]}|${p[5]}`;
    const a = ped.get(k) || { rec: 0, can: 0, sal: 0, val: 0, prev: "" };
    a.rec += recebida; a.can += cancelada; a.sal += saldo;
    if (saldo > EPS) { a.val += saldo * num(p[8]); const d = iso(p[23]); if (d && (!a.prev || d < a.prev)) a.prev = d; }
    ped.set(k, a);
  });
  saldoErrado === 0 ? pass("Em toda linha do pedido: aprovada − recebida − cancelada = saldo", `${n0(linhasPed)} linhas`) : achado("Linhas do pedido em que aprovada − recebida − cancelada ≠ saldo", n0(saldoErrado));
  canceladoComSaldo === 0 ? pass("Item cancelado não deixa saldo pendente") : achado("Item cancelado com saldo pendente", n0(canceladoComSaldo));

  const causas = { "sem-pedido": 0, atrasado: 0, recebido: 0, "recebido-sem-entrada": 0, cancelado: 0 };
  let divergentes = 0, zeroN = 0, pendQtd = 0, pendVal = 0, atrasoErrado = 0;
  for (const d of r.details) {
    const b = E2.mapa.get(`${d.loja}|${d.produto}`);
    const ehZero = b && Math.abs(b.est) <= EPS;
    if (!ehZero) { if (d.causaZero) divergentes += 1; continue; }
    zeroN += 1;
    const a = ped.get(`${d.loja}|${d.produto}`);
    const semEntradaVisivel = d.conta != null && (d.entradaMov || 0) <= EPS && (d.entradaInicial || 0) <= EPS && (d.entradaFinal || 0) <= EPS;
    let c;
    if (!a) c = "sem-pedido";
    else if (a.sal > EPS) c = "atrasado";
    else if (a.rec > EPS) c = semEntradaVisivel ? "recebido-sem-entrada" : "recebido";
    else c = "cancelado";
    causas[c] += 1;
    if (c !== d.causaZero) divergentes += 1;
    if (a && a.sal > EPS) {
      pendQtd += a.sal; pendVal += a.val;
      const esperado = Math.max(0, Math.round((new Date(dias[3] + "T00:00:00Z") - new Date(a.prev + "T00:00:00Z")) / 86400000));
      if (d.pedidoAtraso !== esperado) atrasoErrado += 1;
    }
  }
  divergentes === 0 ? pass("Causa de cada par em ruptura igual à recalculada do arquivo", `${n0(zeroN)} pares`) : falha("Causa do par em ruptura", `${n0(divergentes)} pares diferentes`);
  const soma = Object.values(causas).reduce((t, v) => t + v, 0);
  soma === zeroN && zeroN === r.quality.zero ? pass("Uma causa só por par: a soma das causas é igual à ruptura", `${n0(soma)}`) : falha("Soma das causas × ruptura", `${soma} × ${zeroN} × ${r.quality.zero}`);
  const q = r.quality;
  const par = [["sem-pedido", q.zeroSemPedido], ["atrasado", q.zeroAtrasado], ["recebido", q.zeroRecebido], ["recebido-sem-entrada", q.zeroRecebidoSemEntrada], ["cancelado", q.zeroCancelado]];
  par.every(([k, v]) => causas[k] === v) ? pass("Totais por causa iguais aos do engine") : falha("Totais por causa", JSON.stringify(causas) + " × " + JSON.stringify(par));
  Math.abs(pendQtd - q.pendenteZeroQtd) < 0.01 && Math.abs(pendVal - q.pendenteZeroValor) < 0.01 ? pass("Quantidade e valor pendentes nas rupturas", `${f2(pendQtd)} un · R$ ${f2(pendVal)}`) : falha("Pendente nas rupturas", `${f2(pendQtd)}/${f2(pendVal)} × ${f2(q.pendenteZeroQtd)}/${f2(q.pendenteZeroValor)}`);
  atrasoErrado === 0 ? pass("Dias de atraso até o domingo") : falha("Dias de atraso", n0(atrasoErrado));
  const somaComprador = r.compradores.reduce((t, c) => t + c.zeroSemPedido + c.zeroAtrasado + c.zeroRecebido + c.zeroRecebidoSemEntrada + c.zeroCancelado, 0);
  const somaLoja = r.lojas.reduce((t, c) => t + c.zeroSemPedido + c.zeroAtrasado + c.zeroRecebido + c.zeroRecebidoSemEntrada + c.zeroCancelado, 0);
  somaComprador === zeroN && somaLoja === zeroN ? pass("Soma por comprador e por loja fecha com a ruptura", n0(zeroN)) : falha("Soma por comprador/loja", `${somaComprador} / ${somaLoja} × ${zeroN}`);
  for (const [k, v] of Object.entries(causas)) info(`Ruptura: ${k}`, `${n0(v)} (${zeroN ? ((100 * v) / zeroN).toFixed(1) : 0}%)`);
  const porComprador = r.compradores.filter((c) => c.zeroAtrasado > 0).sort((a, b) => b.zeroAtrasado - a.zeroAtrasado).slice(0, 6);
  porComprador.forEach((c) => info(`Pedido atrasado em ruptura — ${c.comprador}`, `${n0(c.zeroAtrasado)} pares, ${f2(c.pendenteZeroQtd)} un, R$ ${f2(c.pendenteZeroValor)}`));
}

// ---------- Etapa 11: abastecimento e sobra por comprador ----------
if (movimentoMode) {
  titulo("Etapa 11 — Sobra por comprador: inicial + entrada = disponível, estoque final, abastecimento e situação do produto");
  // Tudo é recalculado aqui, direto dos arquivos crus, sem usar o resultado do engine.
  const comprador = new Map();
  linhas(entrada.dim).slice(1).forEach((l) => { const p = l.split(";"); comprador.set(p[1], p[7].trim()); });
  const vistos = new Set();
  const entradaDia = new Map(), saidaDia11 = new Map();
  linhas(entrada.entradas).slice(1).forEach((l) => {
    if (vistos.has(l)) return;
    vistos.add(l);
    const p = l.split(";");
    if (p.length < 8 || !KEEP.has(p[4])) return;
    const k = `${iso(p[0])}|${p[4]}|${p[5]}`;
    if (SAIDA.has(p[2])) { saidaDia11.set(k, (saidaDia11.get(k) || 0) + num(p[7])); return; }
    entradaDia.set(k, (entradaDia.get(k) || 0) + num(p[7]));
  });
  // Pedido recebido por loja + produto, separado em automático e manual (revenda), como na seção 5.7.
  const recAut = new Map(), recMan = new Map();
  linhas(entrada.automatico).slice(1).forEach((l) => {
    const p = l.split(";");
    if (p.length < 29 || !RETAIL.includes(p[0]) || !produtosOferta.has(p[5])) return;
    const cls = p[28].trim().toUpperCase();
    if (["EMBALAGEM", "MATERIAPRIMA", "USOCONSUMO", ""].includes(cls)) return;
    const k = `${p[0]}|${p[5]}`;
    const alvo = cls === "ABAST.AUT" ? recAut : recMan;
    alvo.set(k, (alvo.get(k) || 0) + num(p[18]));
  });

  const esperado = new Map();       // por comprador
  const prodEsperado = new Map();   // por comprador + produto
  let pares = 0, fora = 0, riscoPares = 0;
  const residuo = new Map();
  const lojasVistas = new Set();
  for (const d of r.details) {
    lojasVistas.add(d.loja);
    const chave = `${d.loja}|${d.produto}`;
    const a = E1.mapa.get(chave), b = E2.mapa.get(chave);
    if (!a || !b) { fora += 1; continue; }
    // Período inteiro: abertura = partida da linha inicial quando a última movimentação é o 1º dia (senão o saldo do arquivo); entrada e venda dos quatro dias.
    const abertura = Math.max(0, a.data === dias[0] ? a.partida : a.est);
    const ent = dias.reduce((t, x) => t + (entradaDia.get(`${x}|${chave}`) || 0), 0);
    const venda = vendaPar.get(chave) || 0;
    const sobra = b.est < -EPS ? 0 : b.est;
    const nome = comprador.get(d.produto) || "";
    const aut = (recAut.get(chave) || 0) > EPS ? recAut.get(chave) : 0, man = (recMan.get(chave) || 0) > EPS ? recMan.get(chave) : 0;
    const parteAuto = aut + man > 0 ? ent * (aut / (aut + man)) : 0;
    const parteMan = aut + man > 0 ? ent - parteAuto : 0;
    const parteSem = aut + man > 0 ? 0 : ent;
    const emRisco = b.est <= EPS || (venda > EPS && b.est > EPS && (b.est * 4) / venda < 1);
    for (const [mapa, k] of [[esperado, nome], [prodEsperado, `${nome}|${d.produto}`]]) {
      const c = mapa.get(k) || { nome, produto: d.produto, inicial: 0, entrada: 0, entAuto: 0, entManual: 0, entSemPedido: 0, venda: 0, sobra: 0, pares: 0, lojasRisco: 0 };
      c.inicial += abertura; c.entrada += ent; c.entAuto += parteAuto; c.entManual += parteMan; c.entSemPedido += parteSem;
      c.venda += venda; c.sobra += sobra; c.pares += 1; c.lojasRisco += emRisco ? 1 : 0;
      mapa.set(k, c);
    }
    if (emRisco) riscoPares += 1;
    // De onde vem o ajuste (resíduo) do par: saldo negativo zerado, saída registrada no arquivo de entradas, ou o que nenhum arquivo explica.
    const resid = sobra - (abertura + ent - venda);
    if (Math.abs(resid) > EPS) {
      const sai = dias.reduce((t, x) => t + (saidaDia11.get(`${x}|${chave}`) || 0), 0);
      const aberturaBruta = a.data === dias[0] ? a.partida : a.est;
      const clip = b.est < -EPS || aberturaBruta < -EPS;
      const cat = clip ? "negativo" : sai > EPS && Math.abs(resid + sai) <= EPS ? "saidaRegistrada" : "semExplicacao";
      residuo.set(cat, { n: (residuo.get(cat)?.n || 0) + 1, u: (residuo.get(cat)?.u || 0) + resid });
    }
    pares += 1;
  }
  const lista = sobraPorComprador(r.details);
  const naoVazio = lista.filter((c) => esperado.has(c.comprador));

  // 11.1 Só as 13 lojas
  !lojasVistas.has("70") && [...lojasVistas].every((l) => RETAIL.includes(l)) ? pass("11.1 Só as 13 lojas: a central (70) fica de fora", `${lojasVistas.size} lojas`) : falha("11.1 Loja fora das 13 lojas (central 70?)", [...lojasVistas].filter((l) => !RETAIL.includes(l)).join(", "));

  // 11.2 Pares na base
  const somaPares = lista.reduce((t, c) => t + c.pares, 0), somaFora = lista.reduce((t, c) => t + c.foraDaBase, 0);
  somaPares === pares && somaFora === fora ? pass("11.2 Pares na base + pares fora = todos os pares", `${n0(pares)} + ${n0(fora)} = ${n0(r.details.length)}`) : falha("11.2 Pares na base", `${somaPares}+${somaFora} × ${pares}+${fora}`);

  // 11.3 Inicial, entrada, venda e estoque final por comprador
  let errados = 0;
  for (const c of naoVazio) {
    const e = esperado.get(c.comprador);
    if (c.pares !== e.pares || ["inicial", "entrada", "venda", "sobra"].some((k) => Math.abs(c[k] - e[k]) > 0.01)) errados += 1;
  }
  errados === 0 ? pass("11.3 Estoque inicial, entrada, venda e estoque final de cada comprador iguais aos do arquivo cru", `${n0(naoVazio.length)} compradores`) : falha("11.3 Totais por comprador", `${errados} compradores diferentes`);

  // 11.4 Entrada por abastecimento
  let erroEnt = 0, erroSoma = 0;
  for (const c of naoVazio) {
    const e = esperado.get(c.comprador);
    if (["entAuto", "entManual", "entSemPedido"].some((k) => Math.abs(c[k] - e[k]) > 0.01)) erroEnt += 1;
    if (Math.abs(c.entAuto + c.entManual + c.entSemPedido - c.entrada) > 0.01) erroSoma += 1;
  }
  erroEnt === 0 ? pass("11.4a Entrada automática, manual e sem pedido de cada comprador iguais às recalculadas do arquivo de pedidos", `${n0(naoVazio.length)} compradores`) : falha("11.4a Entrada por abastecimento", `${erroEnt} compradores diferentes`);
  erroSoma === 0 ? pass("11.4b Automática + manual + sem pedido = entrada, em cada comprador") : falha("11.4b A entrada por abastecimento não fecha com a entrada", `${erroSoma} compradores`);
  let erroProdEnt = 0;
  for (const c of lista) for (const p of c.produtos) if (Math.abs(p.entAuto + p.entManual + p.entSemPedido - p.entrada) > 0.01) erroProdEnt += 1;
  erroProdEnt === 0 ? pass("11.4c Em cada produto: automática + manual + sem pedido = entrada") : falha("11.4c Produto com abastecimento que não fecha com a entrada", n0(erroProdEnt));

  // 11.5 Situação do produto: recalculada loja a loja
  const classeEsperada = (p) => (p.lojasRisco > 0 ? "risco" : p.venda <= EPS ? "sobra" : (p.sobra * 4) / p.venda >= 7 ? "sobra" : "padrao");
  let erroClasse = 0, produtosTotal = 0;
  const contEsperada = new Map();
  for (const c of lista) {
    for (const p of c.produtos) {
      produtosTotal += 1;
      const e = prodEsperado.get(`${c.comprador}|${p.produto}`);
      if (!e || classeEsperada(e) !== p.classe || e.lojasRisco !== p.lojasRisco) erroClasse += 1;
    }
  }
  for (const e of prodEsperado.values()) {
    const x = contEsperada.get(e.nome) || { sobra: 0, padrao: 0, risco: 0 };
    x[classeEsperada(e)] += 1;
    contEsperada.set(e.nome, x);
  }
  erroClasse === 0 ? pass("11.5a Situação de cada produto igual à recalculada loja a loja do arquivo cru", `${n0(produtosTotal)} produtos`) : falha("11.5a Situação do produto", `${n0(erroClasse)} produtos diferentes`);
  let erroCont = 0;
  for (const c of naoVazio) {
    const e = contEsperada.get(c.comprador) || { sobra: 0, padrao: 0, risco: 0 };
    if (c.nSobra !== e.sobra || c.nPadrao !== e.padrao || c.nRisco !== e.risco) erroCont += 1;
  }
  erroCont === 0 ? pass("11.5b Produtos com sobra / no padrão / faltando de cada comprador iguais aos recalculados") : falha("11.5b Contagem por grupo", `${erroCont} compradores diferentes`);
  lista.every((c) => c.nSobra + c.nPadrao + c.nRisco === c.produtos.length) ? pass("11.5c Cada produto cai em um grupo só: a soma dos grupos = produtos do comprador") : falha("11.5c Soma dos grupos × produtos");

  // 11.6 Varredura de consistência card × lista
  let contradicao = 0, riscoSemLoja = 0, lojaSemRisco = 0;
  for (const c of lista) {
    for (const p of c.produtos) {
      if (p.classe !== "risco" && (p.zeradas > 0 || p.lojasRisco > 0)) { contradicao += 1; }
      if (p.classe === "risco" && p.lojasRisco === 0) riscoSemLoja += 1;
      if (p.zeradas > p.lojasRisco) lojaSemRisco += 1;
    }
  }
  contradicao === 0 ? pass("11.6a Nenhum produto com loja zerada ou em risco fora do grupo Faltando") : falha("11.6a Produto com loja em risco fora do grupo Faltando", n0(contradicao));
  riscoSemLoja === 0 ? pass("11.6b Todo produto do grupo Faltando tem pelo menos uma loja sem estoque ou em risco") : falha("11.6b Produto em Faltando sem loja em risco", n0(riscoSemLoja));
  lojaSemRisco === 0 ? pass("11.6c Loja zerada sempre conta como em risco") : falha("11.6c Loja zerada fora do risco", n0(lojaSemRisco));
  const riscoEngine = r.details.filter((d) => d.inicial != null && d.final != null && (d.situacao === "zero" || d.situacao === "negativo" || d.provavel)).length;
  const riscoLista = lista.reduce((t, c) => t + c.lojasRisco, 0);
  riscoLista === riscoPares && riscoPares === riscoEngine ? pass("11.6d Pares de loja em risco = ruptura (zero) + saldo negativo + ruptura provável da capa", n0(riscoPares)) : falha("11.6d Pares em risco", `lista ${riscoLista} · arquivo ${riscoPares} · capa ${riscoEngine}`);
  const somaProdutosRisco = lista.reduce((t, c) => t + c.produtos.filter((p) => p.classe === "risco").length, 0);
  somaProdutosRisco === lista.reduce((t, c) => t + c.nRisco, 0) ? pass("11.6e Produtos listados em Faltando = contagem do card", n0(somaProdutosRisco)) : falha("11.6e Produtos em Faltando × card");

  // 11.7 Fechamento da conta
  lista.every((c) => Math.abs(c.produtos.reduce((t, p) => t + p.sobra, 0) - c.sobra) < 0.01 && Math.abs(c.produtos.reduce((t, p) => t + p.inicial + p.entrada, 0) - c.disponivel) < 0.01) ? pass("11.7a A soma da lista de produtos fecha com o total do card, em cada comprador") : falha("11.7a Lista de produtos × total do comprador");
  lista.every((c) => Math.abs(c.disponivel - c.venda + c.ajuste - c.sobra) < 0.01) ? pass("11.7b Disponível − vendeu + ajuste = estoque final, em cada comprador") : falha("11.7b Identidade do ajuste");
  let erroPct = 0;
  for (const c of lista) {
    if (c.disponivel > EPS && Math.abs(c.pct - c.sobra / (c.inicial + c.entrada)) > 1e-9) erroPct += 1;
    for (const p of c.produtos) {
      const e = prodEsperado.get(`${c.comprador}|${p.produto}`);
      if (!e || Math.abs(p.inicial - e.inicial) > 0.01 || (e.inicial + e.entrada > EPS && Math.abs(p.pct - e.sobra / (e.inicial + e.entrada)) > 1e-9)) erroPct += 1;
    }
  }
  erroPct === 0 ? pass("11.7c Estoque inicial e % sobra = estoque final ÷ (inicial + entrada), em cada produto e comprador, recalculados do arquivo cru") : falha("11.7c % sobra ou estoque inicial", n0(erroPct));
  // 11.8 O ajuste da rede é a soma dos resíduos dos pares recalculados do arquivo cru, e cada resíduo tem uma categoria.
  const residuoTotal = [...residuo.values()].reduce((s, x) => s + x.u, 0);
  const ajusteRede = lista.reduce((s, c) => s + c.ajuste, 0);
  Math.abs(residuoTotal - ajusteRede) < 0.5 ? pass("11.8a Ajuste da rede = soma dos resíduos dos pares recalculados do arquivo cru", f2(ajusteRede)) : falha("11.8a Ajuste da rede", `engine ${f2(ajusteRede)} × arquivo ${f2(residuoTotal)}`);
  const nomeCat = { negativo: "par com saldo negativo no sistema (conta como zero)", saidaRegistrada: "saída registrada no arquivo de entradas (operação 802, 902 ou 903)", semExplicacao: "sem explicação nos arquivos (quebra, transferência de saída, entrada não registrada)" };
  for (const [cat, x] of residuo) info(`Ajuste: ${nomeCat[cat]}`, `${n0(x.n)} pares, ${f2(x.u)} un`);
  const fechamPares = pares - [...residuo.values()].reduce((s, x) => s + x.n, 0);
  info("Pares em que a conta fecha sem ajuste", `${n0(fechamPares)} de ${n0(pares)} (${(100 * fechamPares / pares).toFixed(1).replace(".", ",")}%)`);
  // 11.9 Casos conferidos à mão na tela
  for (const id of ["56713"]) {
    const alvo = lista.flatMap((c) => c.produtos).find((p) => p.produto === id);
    if (alvo) info(`Produto ${id} ${alvo.descricao}`, `inicial ${f2(alvo.inicial)} + entrada ${f2(alvo.entrada)} − vendeu ${f2(alvo.venda)} ${alvo.ajuste >= 0 ? "+" : "−"} ajuste ${f2(Math.abs(alvo.ajuste))} = final ${f2(alvo.sobra)}`);
  }
  const t = lista.reduce((s, c) => ({ d: s.d + c.disponivel, s: s.s + c.sobra, a: s.a + c.ajuste }), { d: 0, s: 0, a: 0 });
  info("Rede", `disponível ${f2(t.d)} · estoque final ${f2(t.s)} (${(100 * t.s / t.d).toFixed(2).replace(".", ",")}%) · ajuste ${f2(t.a)}`);
  for (const c of lista) info(`${c.comprador}`, `${n0(c.produtos.length)} produtos: ${n0(c.nSobra)} com sobra · ${n0(c.nPadrao)} no padrão · ${n0(c.nRisco)} faltando`);
}

console.log(`\n${falhas === 0 ? "RESULTADO: todas as etapas conferem com o arquivo." : `RESULTADO: ${falhas} verificação(ões) com FALHA.`}`);
process.exit(falhas === 0 ? 0 : 1);
