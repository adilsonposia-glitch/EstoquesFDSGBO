// Gera o resumo executivo da semana nova contra a semana anterior.
//   node relatorios/gerar_resumo.mjs
// Semana nova: "Entrada Novo Período". Semana anterior: raiz do projeto. Semanas mais antigas: "Semanas anteriores\<período>".
// Os números saem do visualizar/engine.js (o mesmo da capa). O HTML sai em relatorios/resumo_executivo_oferta_fds.html.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { analyze, lojasFromXlsx, classeLinha, sobraPorComprador } = await import(pathToFileURL(path.join(RAIZ, "visualizar/engine.js")).href + "?t=" + Date.now());
const dec = (p) => new TextDecoder("windows-1252").decode(fs.readFileSync(p));
const sa = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const num = (v) => { const t = String(v ?? "").trim(); if (!t) return 0; const n = Number(t.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const iso = (t) => { const [d, m, a] = String(t || "").slice(0, 10).split(/[/-]/); return a ? `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : ""; };
const kd = (d) => d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);

/* ---------- leitura de uma pasta de semana ---------- */
async function carregar(dir) {
  const nomes = fs.readdirSync(dir);
  const achar = (alvo) => nomes.find((n) => sa(n) === sa(alvo));
  const ofertaNome = nomes.find((n) => sa(n).startsWith("ofertasdoper"));
  if (!ofertaNome) return null;
  const ofertasTexto = dec(path.join(dir, ofertaNome));
  const ano = (ofertasTexto.split(/\r?\n/)[1].match(/\b\d{2}[-/]\d{2}[-/](\d{4})\b/) || [])[1];
  const vendas = [];
  for (const n of nomes) {
    const c = n.match(/^(\d{2}-\d{2}-\d{4})\.txt$/i);
    const s = n.match(/^vendas?\s*(\d{2})(\d{2})\.txt$/i);
    if (c) vendas.push({ date: c[1], n });
    else if (s) vendas.push({ date: `${s[1]}-${s[2]}-${ano}`, n });
  }
  if (vendas.length !== 4) return null;
  vendas.sort((a, b) => kd(a.date).localeCompare(kd(b.date)));
  let ini = achar("EstoqueInicio.txt"), fim = achar("EstoqueFim.txt");
  if (!ini || !fim) {
    const est = (d) => nomes.find((n) => new RegExp(`^estoque\\s*${d.slice(0, 2)}${MES[Number(d.slice(3, 5)) - 1]}(\\d{2})?\\.txt$`, "i").test(n));
    ini = est(vendas[0].date); fim = est(vendas[3].date);
  }
  const dimDir = fs.existsSync(path.join(dir, "Dimproduto.txt")) ? dir : RAIZ;
  const xlsx = fs.existsSync(path.join(dir, "Lojas.xlsx")) ? path.join(dir, "Lojas.xlsx") : path.join(RAIZ, "Lojas.xlsx");
  const automaticoNome = achar("Automatico.txt");
  const entrada = {
    sales: vendas.map((v) => ({ date: v.date, text: dec(path.join(dir, v.n)) })),
    inicio: dec(path.join(dir, ini)), fim: dec(path.join(dir, fim)),
    entradas: dec(path.join(dir, achar("Entradas.txt"))), dim: dec(path.join(dimDir, "Dimproduto.txt")),
    automatico: dec(path.join(dir, automaticoNome)), ofertas: ofertasTexto,
    lojas: await lojasFromXlsx(new Uint8Array(fs.readFileSync(xlsx))), coverLimit: 1,
  };
  const r = analyze(entrada);
  if (!r.ok) throw new Error(`${dir}: ${r.message}`);
  return { dir, entrada, r };
}

/* ---------- números por semana ---------- */
const RETAIL = ["1", "5", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];
function dadosOferta(entrada) {
  const linhas = entrada.ofertas.split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(";")).filter((p) => p.length > 14 && RETAIL.includes(p[0]));
  const domingo = iso(entrada.sales[3].date);
  const depois = linhas.filter((p) => iso(p[5]) > domingo);
  const alteracao = linhas.reduce((m, p) => (p[14] > m ? p[14] : m), "");
  return { extraidoEm: alteracao.slice(0, 10).split("-").reverse().join("/"), depoisDomingo: depois.reduce((t, p) => t + num(p[10]), 0) };
}
function porDepartamento(entrada, r) {
  const n1 = new Map(r.details.map((x) => [String(x.produto), x.n1 || "Sem departamento"]));
  const mapa = {};
  const total = { aut: 0, man: 0, outras: 0 };
  for (const l of entrada.automatico.split(/\r?\n/).slice(1)) {
    const p = l.split(";");
    if (p.length < 29 || !n1.has(p[5])) continue;
    const kind = classeLinha(p[28]);
    const d = n1.get(p[5]);
    mapa[d] = mapa[d] || { aut: 0, man: 0 };
    if (kind === "automatico") { mapa[d].aut += 1; total.aut += 1; }
    else if (kind === "manual") { mapa[d].man += 1; total.man += 1; }
    else total.outras += 1;
  }
  return { mapa, total };
}
const rotuloPeriodo = (dias) => {
  const [d0, m0] = dias[0].split("-"), [d3, m3] = dias[3].split("-");
  return m0 === m3 ? `${d0} a ${d3}/${m3}` : `${d0}/${m0} a ${d3}/${m3}`;
};
function resumo(w) {
  const { r, entrada } = w;
  const d = r.details;
  const c = (p) => d.filter(p).length;
  const duas = d.filter((x) => x.inicial != null && x.final != null);
  const aut = r.compradores.reduce((t, b) => t + b.automatico, 0), man = r.compradores.reduce((t, b) => t + b.manual, 0);
  const prod = new Map();
  for (const x of d) prod.set(String(x.produto), (prod.get(String(x.produto)) || 0) + x.venda);
  return {
    rotulo: rotuloPeriodo(r.periodo), periodo: r.periodo, rede: r.rede, quality: r.quality, central: r.central,
    produtos: r.quality.produtosOferta, pares: d.length, comVenda: c((x) => x.vendeu),
    produtosSemVenda: r.quality.produtosOferta - new Set(d.filter((x) => x.vendeu).map((x) => x.produto)).size,
    comFinal: c((x) => x.final != null), duas: duas.length,
    ruptura: c((x) => x.situacao === "zero"), negativo: c((x) => x.situacao === "negativo"), provavel: c((x) => x.provavel),
    contaAberta: c((x) => x.irregular), semEntrada: c((x) => x.excecao === "sem-entrada"),
    semVendaSaldo: c((x) => !x.vendeu && x.situacao === "positivo"),
    estoqueSubiu: duas.filter((x) => x.final > x.inicial + 0.05).length, estoqueCaiu: duas.filter((x) => x.final < x.inicial - 0.05).length,
    paresVendaSemFinal: c((x) => x.vendeu && x.final == null),
    aut, man, pctAut: aut + man ? (aut / (aut + man)) * 100 : null,
    lojas: r.lojas.map((l) => ({ nome: l.nome, id: l.id, part: l.participacao })),
    compradores: r.compradores.filter((b) => b.pares > 0 || b.automatico + b.manual > 0),
    dept: porDepartamento(entrada, r),
    vendaProduto: prod, descricao: new Map(d.map((x) => [String(x.produto), x.descricao])), compradorDe: new Map(d.map((x) => [String(x.produto), x.comprador])),
    oferta: dadosOferta(entrada),
  };
}

/* ---------- leitura das semanas ---------- */
const novaW = await carregar(path.join(RAIZ, "Entrada Novo Período"));
const raizW = await carregar(RAIZ);
if (!novaW || !raizW) throw new Error("Falta a semana nova em Entrada Novo Período ou a semana anterior na raiz.");
const nova = resumo(novaW), raiz = resumo(raizW);
const historico = [];
const arq = path.join(RAIZ, "Semanas anteriores");
for (const nome of fs.existsSync(arq) ? fs.readdirSync(arq) : []) {
  const dir = path.join(arq, nome);
  if (!fs.statSync(dir).isDirectory()) continue;
  const w = await carregar(dir);
  if (w) historico.push(resumo(w));
}
historico.push(raiz, nova);
historico.sort((a, b) => kd(a.periodo[0]).localeCompare(kd(b.periodo[0])));

/* ---------- formatação ---------- */
const f = (v, c = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const int = (v) => Math.round(v).toLocaleString("pt-BR");
const brl = (v) => "R$ " + f(v, 2);
const sg = (v, c = 2, suf = "%") => (v > 0 ? "+" : v < 0 ? "−" : "") + f(Math.abs(v), c) + suf;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const cnt = (v, c = 0, pre = "", suf = "") => `<span data-contar="${Math.abs(v)}" data-casas="${c}" data-prefixo="${pre}" data-sufixo="${suf}">${pre}${f(Math.abs(v), c)}${suf}</span>`;
const nome = (s) => ({ "ANDRE MALHEIROS": "André Malheiros", MODELO: "Modelo" }[s] || s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()));
const pp = (n, base) => (base ? f((n / base) * 100, 2) + "%" : "—");
const cls = (v) => (v < 0 ? "neg" : "pos");
const desceSobe = (v, a, b) => (v < 0 ? a : b);
const LA = raiz.rotulo, LN = nova.rotulo;

/* ---------- números derivados ---------- */
const vOfA = raiz.rede.venda, vOfN = nova.rede.venda, vTotA = raiz.rede.total, vTotN = nova.rede.total;
const partA = raiz.rede.participacao * 100, partN = nova.rede.participacao * 100;
const pctProd = ((nova.produtos - raiz.produtos) / raiz.produtos) * 100;
const pctOf = ((vOfN - vOfA) / vOfA) * 100, pctTot = ((vTotN - vTotA) / vTotA) * 100, ppRede = partN - partA;
const mediaA = vOfA / raiz.produtos, mediaN = vOfN / nova.produtos;
const pctLucro = ((nova.rede.lucro - raiz.rede.lucro) / raiz.rede.lucro) * 100, pctMargem = ((nova.rede.margem - raiz.rede.margem) / raiz.rede.margem) * 100;
const lojas = nova.lojas.map((l) => { const a = raiz.lojas.find((x) => x.id === l.id); return { nome: l.nome, agora: l.part * 100, antes: a.part * 100, pontos: (l.part - a.part) * 100 }; }).sort((a, b) => b.pontos - a.pontos);
const lojasSobem = lojas.filter((l) => l.pontos > 0).length;

/* repetidos e estreantes */
const M = 0.05;
const repetidos = [], estreantes = [];
for (const [id, agora] of nova.vendaProduto) {
  const linha = { id, descricao: nova.descricao.get(id), comprador: nova.compradorDe.get(id), antes: raiz.vendaProduto.get(id) || 0, agora };
  linha.delta = agora - linha.antes;
  (raiz.vendaProduto.has(id) ? repetidos : estreantes).push(linha);
}
const soma = (l, k) => l.reduce((t, x) => t + x[k], 0);
const faixa = (x) => (x.antes <= M && x.agora <= M ? "zero" : x.antes <= M ? "passou" : x.agora > x.antes + M ? "subiu" : x.antes > x.agora + M ? "caiu" : "manteve");
const cont = (l, k) => l.filter((x) => faixa(x) === k).length;
const ordem = (l, k, d) => [...l].sort((a, b) => d * (a[k] - b[k]));
const cruz = {
  repetidos: repetidos.length, estreantes: estreantes.length, sairam: [...raiz.vendaProduto.keys()].filter((x) => !nova.vendaProduto.has(x)).length,
  vendaRepAntes: soma(repetidos, "antes"), vendaRepAgora: soma(repetidos, "agora"), deltaRep: soma(repetidos, "delta"),
  subiu: cont(repetidos, "subiu"), caiu: cont(repetidos, "caiu"), zero: cont(repetidos, "zero"), passou: cont(repetidos, "passou"), manteve: cont(repetidos, "manteve"),
  vendaEstreantes: soma(estreantes, "agora"), estreantesSemVenda: estreantes.filter((x) => x.agora <= M).length,
  maioresAltas: ordem(repetidos, "delta", -1).slice(0, 5), maioresQuedas: ordem(repetidos, "delta", 1).slice(0, 5), maioresEstreantes: ordem(estreantes, "agora", -1).slice(0, 5),
};
const pctRep = cruz.deltaRep / cruz.vendaRepAntes * 100;
if (cruz.subiu + cruz.caiu + cruz.zero + cruz.passou + cruz.manteve !== cruz.repetidos) throw new Error("grupos dos repetidos não somam");

/* verificações de coerência antes de escrever o texto */
for (const [rot, w] of [[LA, raiz], [LN, nova]]) {
  if (!w.quality.movimento) throw new Error(`${rot}: estoque de posição; o texto deste resumo supõe movimento nas duas semanas`);
  const q = w.quality;
  if (q.janelaFecha + q.janelaAbaixo + q.janelaAcima !== q.janelaPares) throw new Error(`${rot}: a conta da janela não soma`);
  if (q.zero !== w.ruptura) throw new Error(`${rot}: causas da ruptura não somam com a ruptura`);
  if (q.zeroSemPedido + q.zeroAtrasado + q.zeroRecebido + q.zeroRecebidoSemEntrada + q.zeroCancelado !== q.zero) throw new Error(`${rot}: causas não somam`);
}
const autSomaN = Object.values(nova.dept.mapa).reduce((t, v) => t + v.aut, 0), manSomaN = Object.values(nova.dept.mapa).reduce((t, v) => t + v.man, 0);
if (autSomaN !== nova.aut || manSomaN !== nova.man) throw new Error("linhas por comprador e por departamento não conferem");
const autPN = nova.pctAut, autPA = raiz.pctAut, ppAut = autPN - autPA;

/* ---------- blocos ---------- */
let cestoN = 0;
const cesta = (p, rotulo) => {
  cestoN += 1;
  return `<svg class="cesta" style="--p:${p.toFixed(2)}" viewBox="0 0 34 30" role="img" aria-label="${esc(rotulo)}">
          <defs><clipPath id="cesto${cestoN}"><path d="M9.2 7h19.6l-2.9 9.5H11.6z"/></clipPath></defs>
          <path class="cesto" d="M9.2 7h19.6l-2.9 9.5H11.6z"/>
          <g clip-path="url(#cesto${cestoN})"><rect class="nivel" x="8" y="7" width="22" height="9.5"/></g>
          <path d="M1.5 2.5h5l3.2 15h16.3l3.5-11.5H8.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12.8" cy="25.4" r="3.3" fill="currentColor"/><circle cx="24" cy="25.4" r="3.3" fill="currentColor"/>
        </svg>`;
};
const chip = (v, c, suf, rotulo, pre = "") => { const baixo = v < 0; return `<span class="chip ${baixo ? "desce" : "sobe"}"><span class="seta">${baixo ? "▼" : "▲"}</span> ${cnt(v, c, (baixo ? "−" : "+") + pre, suf)} ${rotulo}</span>`; };
const ind = (rotulo, valor, extra = "", cestaHtml = "") => `
    <div class="indicador">
      <div class="rotulo">${rotulo}</div>
      ${cestaHtml ? `<div class="linha-valor"><div class="valor">${valor}</div>${cestaHtml}</div>` : `<div class="valor">${valor}</div>`}
      ${extra}
    </div>`;
const apoio = (t) => `<span class="apoio-linha">${t}</span>`;

function graficoLojas() {
  const x0 = 150, k = 6.2, topo0 = 46, passo = 46;
  const maxPart = Math.max(...lojas.map((l) => Math.max(l.agora, l.antes)));
  const kk = Math.min(k, 560 / maxPart);
  const H = topo0 + lojas.length * passo + 6;
  let s = `<svg class="largo" viewBox="0 0 860 ${H}" role="img" aria-label="Participação da oferta na venda de cada loja, nas duas semanas">
        <rect class="barra-a" x="150" y="8" width="12" height="12" rx="2" style="transform:none;animation:none"/><text x="168" y="19">${LN}</text>
        <rect class="barra-b" x="290" y="8" width="12" height="12" rx="2" style="transform:none;animation:none"/><text x="308" y="19">${LA}</text>
        <text x="840" y="19" text-anchor="end">Variação em pontos</text>
        <line class="eixo" x1="${x0}" y1="30" x2="${x0}" y2="${H - 4}"/>`;
  lojas.forEach((l, i) => {
    const t = topo0 + i * passo, wa = l.agora * kk, wb = l.antes * kk, atraso = (i * 0.07).toFixed(2);
    s += `
        <text x="140" y="${t + 15}" text-anchor="end">${esc(l.nome)}</text>
        <rect class="barra-a" x="${x0}" y="${t}" width="${wa.toFixed(1)}" height="18" rx="3" style="--atraso:${atraso}s"/>
        <g class="viaja" style="--w:${wa.toFixed(1)}px;--atraso:${atraso}s"><use class="carro" href="#carrinho" x="${(x0 + wa + 3).toFixed(1)}" y="${t - 1}" width="24" height="21"/><text x="${(x0 + wa + 31).toFixed(1)}" y="${t + 14}">${f(l.agora, 1)}%</text></g>
        <rect class="barra-b" x="${x0}" y="${t + 21}" width="${wb.toFixed(1)}" height="12" rx="3" style="--atraso:${(i * 0.07 + 0.1).toFixed(2)}s"/>
        <text class="apoio" x="${(x0 + wb + 6).toFixed(1)}" y="${t + 31}">${f(l.antes, 1)}%</text>
        <text class="${l.pontos < 0 ? "queda" : "alta"}" x="840" y="${t + 15}" text-anchor="end">${sg(l.pontos, 1, " pts")}</text>`;
  });
  return s + "\n      </svg>";
}
function graficoGrupos() {
  const total = cruz.repetidos;
  const linhas = [["Venderam mais", cruz.subiu, "barra-a"], ["Venderam menos", cruz.caiu, "barra-neg"], ["Sem venda nas duas semanas", cruz.zero, "barra-n"], ["Passaram a vender", cruz.passou, "barra-b"], ...(cruz.manteve ? [["Mesma venda (diferença até R$ 0,05)", cruz.manteve, "barra-n"]] : [])];
  const x0 = 210, k = Math.min(0.85, 380 / Math.max(...linhas.map((l) => l[1]), 1));
  let s = `<svg class="largo" viewBox="0 0 720 ${linhas.length * 40 + 16}" role="img" aria-label="Os ${int(total)} produtos que repetiram na oferta, por comportamento de venda">
        <line class="eixo" x1="${x0}" y1="6" x2="${x0}" y2="${linhas.length * 40 + 8}"/>`;
  linhas.forEach(([rot, n, c], i) => {
    const t = 14 + i * 40, w = n * k;
    s += `
        <text x="${x0 - 10}" y="${t + 16}" text-anchor="end">${rot}</text>
        <rect class="${c}" x="${x0}" y="${t}" width="${w.toFixed(1)}" height="22" rx="3"/>
        <text x="${(x0 + w + 8).toFixed(1)}" y="${t + 16}">${int(n)} · ${f((n / total) * 100, 2)}%</text>`;
  });
  return s + "\n      </svg>";
}
function tabelaProdutos(lista, titulo, comAntes) {
  const corpo = lista.map((p) => {
    const dl = p.agora - p.antes, pc = p.antes > 0.05 ? (dl / p.antes) * 100 : null, c = dl >= 0 ? "pos" : "neg";
    return comAntes
      ? `<tr><td>${p.id}</td><td class="txt">${esc(p.descricao)}</td><td class="txt">${esc(nome(p.comprador))}</td><td>${f(p.antes)}</td><td>${f(p.agora)}</td><td class="${c}">${sg(dl, 2, "")}</td><td class="${c}">${pc == null ? "—" : sg(pc)}</td></tr>`
      : `<tr><td>${p.id}</td><td class="txt">${esc(p.descricao)}</td><td class="txt">${esc(nome(p.comprador))}</td><td>${f(p.agora)}</td></tr>`;
  }).join("");
  const cab = comAntes
    ? `<tr><th>Código</th><th class="txt">Produto</th><th class="txt">Comprador</th><th>${LA} (R$)</th><th>${LN} (R$)</th><th>Diferença (R$)</th><th>Variação</th></tr>`
    : `<tr><th>Código</th><th class="txt">Produto</th><th class="txt">Comprador</th><th>Venda ${LN} (R$)</th></tr>`;
  return `<h3>${titulo}</h3>
    <div class="rolagem"><table><thead>${cab}</thead><tbody>${corpo}</tbody></table></div>`;
}

/* compradores */
const compr = nova.compradores.filter((b) => b.venda > 0).map((b) => { const a = raiz.compradores.find((x) => x.comprador === b.comprador); return { nome: nome(b.comprador), vendaN: b.venda, pesoN: (b.venda / vOfN) * 100, pesoA: a ? (a.venda / vOfA) * 100 : 0 }; });

/* sobra por comprador (PRD 5.13) */
const sobraN = sobraPorComprador(novaW.r.details, { risco: 1, sobraDias: 7 }), sobraA = sobraPorComprador(raizW.r.details, { risco: 1, sobraDias: 7 });
const sobraRede = (l) => { const t = l.reduce((s, c) => ({ d: s.d + c.disponivel, s: s.s + c.sobra, i: s.i + c.inicial, e: s.e + c.entrada, v: s.v + c.venda, a: s.a + c.entAuto, m: s.m + c.entManual, sp: s.sp + c.entSemPedido, p: s.p + c.pares, o: s.o + c.foraDaBase, ns: s.ns + c.nSobra, np: s.np + c.nPadrao, nr: s.nr + c.nRisco }), { d: 0, s: 0, i: 0, e: 0, v: 0, a: 0, m: 0, sp: 0, p: 0, o: 0, ns: 0, np: 0, nr: 0 }); return { ...t, pct: t.d > 0.05 ? (t.s / t.d) * 100 : null }; };
const sRedeN = sobraRede(sobraN), sRedeA = sobraRede(sobraA);
const sAnt = (c) => { const a = sobraA.find((x) => x.comprador === c.comprador); return a && a.pct != null ? a.pct * 100 : null; };
const ajusteTxt = (v) => (Math.abs(v) < 0.05 ? "0" : `<span class="${v > 0 ? "pos" : "neg"}">${v > 0 ? "+" : "−"}${f(Math.abs(v), 0)}</span>`);
const linhaSobra = (c) => { const ant = sAnt(c), atual = c.pct == null ? null : c.pct * 100; const dp = ant != null && atual != null ? atual - ant : null; const np = c.nSobra + c.nPadrao + c.nRisco; const gp = (n) => `${int(n)} <small>${pp(n, np)}</small>`; return `<tr><td class="txt">${esc(nome(c.comprador))}</td><td>${int(np)}</td><td>${gp(c.nSobra)}</td><td>${gp(c.nPadrao)}</td><td class="${c.nRisco ? "neg" : ""}">${gp(c.nRisco)}</td><td>${f(c.inicial, 0)}</td><td>${f(c.entrada, 0)}</td><td>${f(c.disponivel, 0)}</td><td>${f(c.entAuto, 0)}</td><td>${f(c.entManual, 0)}</td><td>${f(c.entSemPedido, 0)}</td><td>${f(c.venda, 0)}</td><td>${ajusteTxt(c.ajuste)}</td><td>${f(c.sobra, 0)}</td><td><b>${atual == null ? "—" : f(atual, 2) + "%"}</b></td><td>${ant == null ? "—" : f(ant, 2) + "%"}</td><td>${dp == null ? "—" : `<span class="${dp > 0 ? "neg" : "pos"}">${sg(dp, 2, "")}</span>`}</td></tr>`; };
const abastTxt = (p) => { const partes = [["Automático", p.entAuto], ["Manual", p.entManual], ["Sem pedido", p.entSemPedido]].filter(([, v]) => v > 0.05); if (!partes.length) return "—"; return partes.length === 1 ? partes[0][0] : "Misto: " + partes.map(([n, v]) => `${n.toLowerCase()} ${f(v, 0)}`).join(" · "); };
const tabProdSobra = (lista) => `<div class="rolagem"><table><thead><tr><th>Código</th><th class="txt">Produto</th><th>Estoque inicial</th><th>Entrada</th><th class="txt">Abastecimento</th><th>Vendeu</th><th>Ajuste</th><th>Estoque final</th><th>% sobra</th><th>Lojas sem estoque ou em risco</th></tr></thead><tbody>${lista.map((p) => `<tr><td>${p.produto}</td><td class="txt">${esc(p.descricao)}</td><td>${f(p.inicial, 0)}</td><td>${f(p.entrada, 0)}</td><td class="txt">${abastTxt(p)}</td><td>${f(p.venda, 0)}</td><td>${ajusteTxt(p.ajuste)}</td><td><b>${f(p.sobra, 0)}</b></td><td>${p.pct == null ? "—" : f(p.pct * 100, 2) + "%"}</td><td>${p.lojasRisco ? `${p.lojasRisco} de ${p.lojas}` : "—"}</td></tr>`).join("")}</tbody></table></div>`;
const detalheSobra = (c) => {
  const risco = c.produtos.filter((p) => p.classe === "risco").sort((x, y) => y.lojasRisco - x.lojasRisco || y.venda - x.venda).slice(0, 8);
  const np = c.nSobra + c.nPadrao + c.nRisco;
  return `<details class="sobra-detalhe"><summary>${esc(nome(c.comprador))}: ${c.pct == null ? "—" : f(c.pct * 100, 2) + "%"} de sobra · ${int(c.nSobra)} com sobra, ${int(c.nPadrao)} no padrão, ${int(c.nRisco)} faltando</summary>
      <p class="fonte">Dos ${int(np)} produtos de ${esc(nome(c.comprador))}: ${int(c.nSobra)} com sobra (${pp(c.nSobra, np)}), ${int(c.nPadrao)} no padrão (${pp(c.nPadrao, np)}) e ${int(c.nRisco)} faltando ou com risco de ruptura (${pp(c.nRisco, np)}). Entrada por abastecimento: automático ${f(c.entAuto, 0)} · manual ${f(c.entManual, 0)} · sem pedido ${f(c.entSemPedido, 0)}.</p>
      <h3>Dez produtos com mais sobra</h3>
      ${tabProdSobra(c.produtos.filter((p) => p.classe === "sobra").slice(0, 10))}
      ${risco.length ? `<h3>Faltando ou com risco de ruptura${c.nRisco > risco.length ? ` (${risco.length} de ${int(c.nRisco)}, os com mais lojas em risco)` : ""}</h3>${tabProdSobra(risco)}` : ""}
    </details>`;
};
/* abastecimento */
const pa = (aut, man) => (aut + man ? (aut / (aut + man)) * 100 : null);
const linhaAbast = (rot, n, a) => ({ rot, an: n.aut, mn: n.man, aa: a ? a.aut : 0, ma: a ? a.man : 0, pn: pa(n.aut, n.man), pa: a ? pa(a.aut, a.man) : null });
const abastCompr = nova.compradores.concat(raiz.compradores.filter((b) => !nova.compradores.some((x) => x.comprador === b.comprador)).map((b) => ({ ...b, automatico: 0, manual: 0, _soAntes: true })))
  .map((b) => { const a = raiz.compradores.find((x) => x.comprador === b.comprador); return linhaAbast(nome(b.comprador), { aut: b.automatico, man: b.manual }, a ? { aut: a.automatico, man: a.manual } : null); })
  .filter((x) => x.an + x.mn + x.aa + x.ma > 0);
const nomeDept = (d) => ({ PERECIVEIS: "Perecíveis", MERCEARIA: "Mercearia", "MERCEARIA NAO ALIMENTOS": "Mercearia não alimentos" }[d] || d);
const abastDept = Object.keys({ ...nova.dept.mapa, ...raiz.dept.mapa }).map((d) => linhaAbast(nomeDept(d), nova.dept.mapa[d] || { aut: 0, man: 0 }, raiz.dept.mapa[d] || { aut: 0, man: 0 }));
const ordAbast = (l) => [...l].sort((x, y) => (y.pn ?? -1) - (x.pn ?? -1) || x.rot.localeCompare(y.rot, "pt-BR"));
const celPct = (p) => (p == null ? "—" : f(p) + "%");
const celPP = (x) => { if (x.pn == null || x.pa == null) return `<td>—</td>`; const d = x.pn - x.pa; return Math.abs(d) < 0.005 ? `<td>0,00</td>` : `<td class="${d > 0 ? "pos" : "neg"}">${sg(d, 2, "")}</td>`; };
const tabelaAbast = (titulo, l) => `<div class="rolagem">
      <table>
        <thead>
          <tr><th class="txt" rowspan="2">${titulo}</th><th colspan="3" class="grupo">${LA}</th><th colspan="3" class="grupo">${LN}</th><th rowspan="2">Variação (p.p.)</th></tr>
          <tr><th>Linhas aut.</th><th>Linhas man.</th><th>% aut.</th><th>Linhas aut.</th><th>Linhas man.</th><th>% aut.</th></tr>
        </thead>
        <tbody>${ordAbast(l).map((x) => `<tr><td class="txt">${esc(x.rot)}</td><td>${int(x.aa)}</td><td>${int(x.ma)}</td><td>${celPct(x.pa)}</td><td>${int(x.an)}</td><td>${int(x.mn)}</td><td><b>${celPct(x.pn)}</b></td>${celPP(x)}</tr>`).join("")}</tbody>
        <tfoot><tr><td class="txt">Rede</td><td>${int(raiz.aut)}</td><td>${int(raiz.man)}</td><td>${celPct(autPA)}</td><td>${int(nova.aut)}</td><td>${int(nova.man)}</td><td>${celPct(autPN)}</td><td>${sg(ppAut, 2, "")}</td></tr></tfoot>
      </table>
    </div>`;
function graficoAbast() {
  const l = ordAbast(abastCompr);
  const x0 = 150, k = 5.4, topo0 = 46, passo = 46, H = topo0 + l.length * passo + 6;
  let s = `<svg class="largo" viewBox="0 0 860 ${H}" role="img" aria-label="Percentual de abastecimento automático por comprador, nas duas semanas">
        <rect class="barra-a" x="150" y="8" width="12" height="12" rx="2" style="transform:none;animation:none"/><text x="168" y="19">${LN}</text>
        <rect class="barra-b" x="290" y="8" width="12" height="12" rx="2" style="transform:none;animation:none"/><text x="308" y="19">${LA}</text>
        <line class="eixo" x1="${x0}" y1="30" x2="${x0}" y2="${H - 4}"/>`;
  l.forEach((x, i) => {
    const t = topo0 + i * passo, wn = (x.pn || 0) * k, wa = (x.pa || 0) * k;
    s += `
        <text x="140" y="${t + 15}" text-anchor="end">${esc(x.rot)}</text>
        <rect class="barra-a" x="${x0}" y="${t}" width="${wn.toFixed(1)}" height="18" rx="3" style="transform:none;animation:none"/>
        <text x="${(x0 + wn + 8).toFixed(1)}" y="${t + 14}">${celPct(x.pn)}${x.an + x.mn ? ` · ${int(x.an + x.mn)} linhas` : ""}</text>
        <rect class="barra-b" x="${x0}" y="${t + 21}" width="${wa.toFixed(1)}" height="12" rx="3" style="transform:none;animation:none"/>
        <text class="apoio" x="${(x0 + wa + 8).toFixed(1)}" y="${t + 31}">${celPct(x.pa)}${x.aa + x.ma ? ` · ${int(x.aa + x.ma)} linhas` : ""}</text>`;
  });
  return s + "\n      </svg>";
}

/* histórico das semanas */
const linhaHist = (w) => {
  const atual = w === nova;
  const b = (t) => (atual ? `<b>${t}</b>` : t);
  return `<tr><td class="txt">${b(w.rotulo)}</td><td>${b(int(w.produtos))}</td><td>${b(f(w.rede.venda))}</td><td>${b(f(w.rede.total))}</td><td>${b(f(w.rede.participacao * 100) + "%")}</td><td>${b(f(w.pctAut) + "%")}</td><td>${b(w.oferta.extraidoEm)}</td><td>${b(f(w.oferta.depoisDomingo))}</td></tr>`;
};

/* estoque lado a lado */
const q = (w) => w.quality;
const linhaEst = (rot, a, b, bA, bN, nota, neg = true) => `<tr><td class="txt">${rot}</td><td>${int(a)}</td><td>${bA ? pp(a, bA) : "—"}</td><td class="${neg ? "neg" : ""}">${int(b)}</td><td>${bN ? pp(b, bN) : "—"}</td><td class="txt">${nota}</td></tr>`;
const compradoresRuptura = nova.compradores.filter((b) => b.ruptura > 0).sort((a, b) => b.ruptura - a.ruptura);
const centralN = nova.central;

const baseN = nova.comFinal, baseA = raiz.comFinal, conN = q(nova).janelaPares, conA = q(raiz).janelaPares;
const emRuptura = (w, campo) => q(w)[campo];
const atrasadoQtd = q(nova).pendenteZeroQtd, atrasadoVal = q(nova).pendenteZeroValor;
const topAtrasados = [...nova.compradores].filter((b) => b.zeroAtrasado > 0).sort((a, b) => b.zeroAtrasado - a.zeroAtrasado).slice(0, 3);
const topSemPedido = [...nova.compradores].filter((b) => b.zeroSemPedido > 0).sort((a, b) => b.zeroSemPedido - a.zeroSemPedido).slice(0, 3);
const jan = (w) => ({ fecha: q(w).janelaFecha, abaixo: q(w).janelaAbaixo, acima: q(w).janelaAcima });
const sai = (l, campo) => l.map((b) => `${esc(nome(b.comprador))} (${int(b[campo])})`).join(", ");

const main = `
  <nav class="percurso" aria-label="Percurso do resumo">
    <a href="#inicio"><b>Início</b><span>O ponto de partida</span></a>
    <a href="#meio"><b>Meio</b><span>O que mudou na venda, no abastecimento e no estoque</span></a>
    <a href="#fim"><b>Fim</b><span>O que decidir agora</span></a>
  </nav>

  <p class="abertura">Duas semanas de oferta, de quinta a domingo, medidas pela mesma régua. Em ${LA} a oferta teve ${int(raiz.produtos)} produtos e respondeu por ${f(partA)}% da venda das 13 lojas. Em ${LN} teve ${int(nova.produtos)} produtos e ${f(partN)}%. Este resumo mostra o que mudou, onde mudou, quanto do abastecimento passou pelo sistema automático e o que o estoque registra sobre cada produto, inclusive a causa de cada ruptura pelo pedido, com os limites de cada arquivo.</p>

  <!-- ===== INÍCIO ===== -->
  <section id="inicio">
    <p class="ato">Início</p>
    <h2>A semana de ${LA} fixa a régua</h2>
    <p class="lead">Com ${int(raiz.produtos)} produtos, a oferta vendeu ${brl(vOfA)} de um total de ${brl(vTotA)} nas 13 lojas. Dos ${int(raiz.pares)} pares de loja e produto, ${int(raiz.comVenda)} venderam. ${int(raiz.produtosSemVenda)} produtos não venderam em loja nenhuma.</p>
    <div class="indicadores" data-anima>${ind("Produtos em oferta", cnt(raiz.produtos, 0))}${ind("Venda da oferta", cnt(vOfA, 2, "R$ "))}${ind("Participação na venda das lojas", cnt(partA, 2, "", "%"), "", cesta(partA, `Cesta com ${f(partA)}% de enchimento`))}${ind("Pares com venda", cnt(raiz.comVenda, 0), apoio(`de ${int(raiz.pares)} pares loja e produto`))}
    </div>
    <div class="rolagem">
      <table>
        <thead><tr><th class="txt">As semanas</th><th>Produtos em oferta</th><th>Venda da oferta (R$)</th><th>Venda total das lojas (R$)</th><th>Participação</th><th>% automático</th><th>Ofertas extraídas em</th><th>Venda em promoção que termina depois do domingo (R$)</th></tr></thead>
        <tbody>
          ${historico.map(linhaHist).join("\n          ")}
        </tbody>
      </table>
    </div>
    <p class="fonte">A venda de cada promoção, no arquivo de ofertas, soma tudo até o dia em que o arquivo foi extraído. Promoção que termina depois do domingo carrega venda de fora da semana, e quanto mais tarde a extração, maior o excesso. Por isso a participação só compara bem semanas com extração perto do domingo, e a última coluna mostra o tamanho do problema em cada semana. O percentual automático é o das linhas de pedido de revenda da oferta, como na tela de compradores.</p>
  </section>

  <!-- ===== MEIO ===== -->
  <section id="meio">
    <p class="ato">Meio</p>
    <h2>A oferta ${desceSobe(pctProd, "encolheu", "cresceu")} ${f(Math.abs(pctProd))}% em produtos e a participação ${desceSobe(ppRede, "caiu", "subiu")}</h2>
    <p class="lead">Em ${LN} a oferta passou de ${int(raiz.produtos)} para ${int(nova.produtos)} produtos. A venda da oferta ${desceSobe(pctOf, "caiu", "subiu")} ${f(Math.abs(pctOf))}% e a venda total das lojas ${desceSobe(pctTot, "caiu", "subiu")} ${f(Math.abs(pctTot))}%. Por produto em oferta, a venda média foi de ${brl(mediaA)} para ${brl(mediaN)}. Atenção: o arquivo de ofertas de ${LN} foi extraído em ${nova.oferta.extraidoEm} e o de ${LA}, em ${raiz.oferta.extraidoEm}. Cada um carrega venda de promoções que terminam depois do domingo (${brl(nova.oferta.depoisDomingo)} e ${brl(raiz.oferta.depoisDomingo)}), então a venda da oferta e a participação não são só da semana.</p>
    <div class="indicadores" data-anima>${ind("Produtos em oferta", cnt(nova.produtos, 0), chip(pctProd, 2, "%", `vs. ${LA}`))}${ind("Venda da oferta", cnt(vOfN, 2, "R$ "), chip(pctOf, 2, "%", `vs. ${LA}`))}${ind("Participação na venda das lojas", cnt(partN, 2, "", "%"), chip(ppRede, 2, " p.p.", `vs. ${LA}`), cesta(partN, `Cesta com ${f(partN)}% de enchimento`))}${ind("Venda total das lojas", cnt(vTotN, 2, "R$ "), chip(pctTot, 2, "%", `vs. ${LA}`))}
    </div>
    <div class="rolagem estreita">
      <table>
        <thead><tr><th class="txt">Resultado da oferta</th><th>${LA} (R$)</th><th>${LN} (R$)</th><th>Variação</th></tr></thead>
        <tbody>
          <tr><td class="txt">Venda da oferta</td><td>${f(vOfA)}</td><td>${f(vOfN)}</td><td class="${cls(pctOf)}">${sg(pctOf)}</td></tr>
          <tr><td class="txt">Lucro bruto</td><td>${f(raiz.rede.lucro)}</td><td>${f(nova.rede.lucro)}</td><td class="${cls(pctLucro)}">${sg(pctLucro)}</td></tr>
          <tr><td class="txt">Margem pelo custo bruto</td><td>${f(raiz.rede.margem)}</td><td>${f(nova.rede.margem)}</td><td class="${cls(pctMargem)}">${sg(pctMargem)}</td></tr>
        </tbody>
      </table>
    </div>
    <p class="fonte">Lucro bruto e margem pelo custo bruto são duas contas separadas, como na capa do programa. Percentuais calculados sobre os valores sem arredondamento. As duas ofertas têm tamanhos diferentes, então os valores totais não comparam produto com produto: para isso servem os que repetiram, mais abaixo. A venda da oferta, no arquivo de ofertas, tem o limite de extração descrito na tabela do início.</p>
  </section>

  <section>
    <h2>A participação ${lojasSobem === lojas.length ? "subiu nas 13 lojas" : lojasSobem === 0 ? "caiu nas 13 lojas" : `subiu em ${lojasSobem} das 13 lojas`}</h2>
    <p class="lead">A maior variação foi em ${lojas[0].nome.replace(/^\d+ /, "")} (${sg(lojas[0].pontos, 1, " pts")}), seguida de ${lojas[1].nome.replace(/^\d+ /, "")} (${sg(lojas[1].pontos, 1, " pts")}) e ${lojas[2].nome.replace(/^\d+ /, "")} (${sg(lojas[2].pontos, 1, " pts")}). A menor foi em ${lojas[lojas.length - 1].nome.replace(/^\d+ /, "")} (${sg(lojas[lojas.length - 1].pontos, 1, " pts")}). Participação é a venda da oferta dividida pela venda total da própria loja.</p>
    <div class="grafico" data-anima>
      ${graficoLojas()}
    </div>
  </section>

  <section>
    <h2>Os ${int(cruz.repetidos)} produtos que repetiram venderam ${f(Math.abs(pctRep))}% ${desceSobe(pctRep, "menos", "mais")}</h2>
    <p class="lead">Este é o comparativo mais direto, porque o produto é o mesmo nas duas semanas. A venda do conjunto foi de ${brl(cruz.vendaRepAntes)} para ${brl(cruz.vendaRepAgora)}, diferença de ${sg(cruz.deltaRep, 2, "").replace(/^([+−])/, "$1R$ ")}. ${int(cruz.sairam)} produtos de ${LA} não voltaram à oferta.</p>
    <div class="grafico">
      ${graficoGrupos()}
    </div>
    ${tabelaProdutos(cruz.maioresAltas, "As cinco maiores altas, em valor", true)}
    ${tabelaProdutos(cruz.maioresQuedas, "As cinco maiores quedas, em valor", true)}
    <p class="fonte">A venda do produto é a soma de VLRVENDA dos quatro arquivos diários nas 13 lojas. Maior alta e maior queda seguem o valor da diferença.</p>
  </section>

  <section>
    <h2>${int(cruz.estreantes)} produtos estrearam e ${int(cruz.estreantesSemVenda)} não venderam</h2>
    <p class="lead">Os estreantes são ${f((cruz.estreantes / nova.produtos) * 100)}% da oferta de ${LN} e venderam ${brl(cruz.vendaEstreantes)}. Como não estavam na oferta anterior, a semana passada não entra como venda deles. Os ${int(cruz.estreantesSemVenda)} sem venda são ${f((cruz.estreantesSemVenda / cruz.estreantes) * 100)}% dos estreantes.</p>
    ${tabelaProdutos(cruz.maioresEstreantes, "As cinco maiores vendas entre os estreantes", false)}
  </section>

  <section>
    <h2>Quanto cada comprador pesa na oferta</h2>
    <p class="lead">${compr[0].nome} respondeu por ${f(compr[0].pesoN)}% da venda da oferta em ${LN}. Em ${LA} eram ${f(compr[0].pesoA)}%. O comprador é o do cadastro do produto.</p>
    <div class="rolagem estreita">
      <table>
        <thead><tr><th class="txt">Comprador</th><th>Venda da oferta ${LN} (R$)</th><th>Peso ${LN}</th><th>Peso ${LA}</th></tr></thead>
        <tbody>${compr.map((b) => `<tr><td class="txt">${esc(b.nome)}</td><td>${f(b.vendaN)}</td><td>${f(b.pesoN)}%</td><td>${f(b.pesoA)}%</td></tr>`).join("")}</tbody>
      </table>
    </div>
  </section>

  <section id="abastecimento">
    <h2>Quanto do abastecimento passou pelo sistema automático</h2>
    <p class="lead">O percentual automático mostra quem usa melhor o sistema, com menos intervenção manual. Na rede, ${f(autPN)}% das linhas de pedido de revenda foram automáticas e ${f(100 - autPN)}% foram manuais em ${LN}. Em ${LA} eram ${f(autPA)}% e ${f(100 - autPA)}%.</p>
    <div class="indicadores" data-anima>${ind("Abastecimento automático", cnt(autPN, 2, "", "%"), chip(ppAut, 2, " p.p.", `vs. ${LA}`), cesta(autPN, `Cesta com ${f(autPN)}% de enchimento`))}${ind("Abastecimento manual", cnt(100 - autPN, 2, "", "%"), apoio(`em ${LA}: ${f(100 - autPA)}%`))}${ind("Linhas automáticas", cnt(nova.aut, 0), apoio(`em ${LA}: ${int(raiz.aut)}`))}${ind("Linhas manuais", cnt(nova.man, 0), apoio(`em ${LA}: ${int(raiz.man)}`))}
    </div>
    <h3>Por comprador</h3>
    ${tabelaAbast("Comprador", abastCompr)}
    <div class="grafico">
      ${graficoAbast()}
    </div>
    <h3>Por departamento</h3>
    ${tabelaAbast("Departamento", abastDept)}
    <p class="fonte">O percentual é sobre as linhas de pedido de revenda do arquivo Automático, dos produtos de oferta: automático ÷ (automático + manual). A coluna de variação mostra a diferença em pontos percentuais do automático entre as duas semanas. O comprador é o do cadastro do produto. Embalagem, matéria-prima e uso e consumo ficam fora da revenda. Comprador sem linha aparece com traço.</p>
  </section>

  <section id="sobra">
    <h2>Quanto sobrou da oferta, comprador a comprador</h2>
    <p class="lead">Na rede, a oferta de ${LN} teve ${f(sRedeN.d, 0)} unidades disponíveis (estoque inicial de abertura mais as entradas dos quatro dias), vendeu ${f(sRedeN.v, 0)} e terminou a semana com ${f(sRedeN.s, 0)} em estoque: ${f(sRedeN.pct, 2)}% de sobra. Em ${LA} a sobra foi de ${f(sRedeA.pct, 2)}%. Cada produto é classificado loja a loja: se alguma loja ficou sem estoque ou com saldo para menos de 1 dia de venda, o produto entra em faltando, mesmo que o total pareça alto.</p>
    <div class="rolagem">
      <table>
        <thead><tr><th class="txt">Comprador</th><th>Produtos</th><th>Com sobra</th><th>No padrão</th><th>Faltando / risco</th><th>Estoque inicial</th><th>Entrada</th><th>Disponível</th><th>Entrada automática</th><th>Entrada manual</th><th>Entrada sem pedido</th><th>Vendeu</th><th>Ajuste</th><th>Estoque final</th><th>% sobra ${LN}</th><th>% sobra ${LA}</th><th>Variação (p.p.)</th></tr></thead>
        <tbody>${sobraN.map(linhaSobra).join("")}</tbody>
        <tfoot><tr><td class="txt">Rede</td><td>${int(sRedeN.ns + sRedeN.np + sRedeN.nr)}</td><td>${int(sRedeN.ns)} <small>${pp(sRedeN.ns, sRedeN.ns + sRedeN.np + sRedeN.nr)}</small></td><td>${int(sRedeN.np)} <small>${pp(sRedeN.np, sRedeN.ns + sRedeN.np + sRedeN.nr)}</small></td><td>${int(sRedeN.nr)} <small>${pp(sRedeN.nr, sRedeN.ns + sRedeN.np + sRedeN.nr)}</small></td><td>${f(sRedeN.i, 0)}</td><td>${f(sRedeN.e, 0)}</td><td>${f(sRedeN.d, 0)}</td><td>${f(sRedeN.a, 0)}</td><td>${f(sRedeN.m, 0)}</td><td>${f(sRedeN.sp, 0)}</td><td>${f(sRedeN.v, 0)}</td><td>${ajusteTxt(sRedeN.s - (sRedeN.d - sRedeN.v))}</td><td>${f(sRedeN.s, 0)}</td><td>${f(sRedeN.pct, 2)}%</td><td>${f(sRedeA.pct, 2)}%</td><td>${sg(sRedeN.pct - sRedeA.pct, 2, "")}</td></tr></tfoot>
      </table>
    </div>
    <h3>Produtos por comprador: com mais sobra e faltando</h3>
    ${sobraN.map(detalheSobra).join("\n    ")}
    <p class="fonte">Só as 13 lojas entram: a central (loja 70, CD) fica de fora, porque o foco é o que foi abastecido em excesso nas lojas. Tudo é do período inteiro, os quatro dias. Estoque inicial = saldo de abertura, antes do 1º dia (o arquivo de estoque do primeiro dia fecha o dia, então a abertura sai da partida da linha dele). Entrada = entradas dos quatro dias no arquivo de entradas. Vendeu = venda dos quatro dias. Saldo negativo do sistema conta como zero. Estoque final = saldo do último dia. % sobra = estoque final ÷ (estoque inicial + entrada), e quanto maior, mais mercadoria ficou parada. Exemplo: 10 de estoque inicial + 20 de entrada = 30 disponíveis; vendeu 10; sobraram 20, ou 66,7%. O percentual de sobra é de unidades; os percentuais de com sobra, no padrão e faltando são de produtos. Ajuste é o que a conta não explica (estoque final − (disponível − vendeu)): negativo é saída que nenhum arquivo traz (quebra, transferência, consumo); positivo é entrada que o arquivo não registra. Abastecimento da entrada: cada entrada é ligada ao pedido do mesmo produto e da mesma loja no arquivo de pedidos. Automático e manual vêm do comprador da linha do pedido (ABAST.AUT é automático; nome de pessoa é manual). Sem pedido é a entrada que o arquivo de pedidos não traz, como transferência entre lojas, e também entrada cujo pedido tem recebimento previsto fora dos quatro dias. Se o par tem pedido automático e manual, a entrada se divide pela quantidade recebida de cada um. Situação do produto, olhando as lojas uma a uma: faltando = pelo menos uma loja sem saldo ou com saldo para menos de 1 dia de venda (cobertura = estoque final × 4 ÷ vendeu, a mesma régua da ruptura provável); com sobra = nenhuma loja em risco e cobertura total de 7 dias ou mais (ou sem venda); no padrão = nenhuma loja em risco e cobertura entre os dois. O limite de 1 dia é o da ruptura provável. O de 7 dias é uma referência deste resumo: não vem dos arquivos e pode ser alterado na tela do programa. Somar unidades de produtos diferentes mistura medidas: compare pelo percentual e aja pela lista de produtos. Contam só os pares de loja e produto com as duas linhas de estoque: ${int(sRedeN.p)} pares em ${LN} (${int(sRedeN.o)} ficaram de fora) e ${int(sRedeA.p)} em ${LA} (${int(sRedeA.o)} fora).</p>
  </section>

  <section>
    <h2>O estoque conta a outra metade da história</h2>
    <p class="lead">Para cada produto em cada loja, a análise lê dois números: o estoque inicial, do arquivo do primeiro dia (a venda desse dia já está dentro dele), e o estoque final, do arquivo do último dia. A diferença, dividida pelo inicial, é a variação do estoque. Positiva, o saldo terminou maior. Negativa, terminou menor. O exemplo abaixo é da semana de 01 a 04/10.</p>
    <div class="fluxo" role="group" aria-label="Isotônico Gatorade laranja, loja 01 Américas: de 126 para 99 unidades">
      <div class="passo cinza"><span class="r">Estoque inicial</span><b>126</b><small>01/10. A venda de 15 unidades desse dia já está dentro.</small></div>
      <div class="op" aria-hidden="true">−</div>
      <div class="passo"><span class="r">Vendas depois</span><b>27</b><small>8 + 10 + 9, de 02 a 04/10</small></div>
      <div class="op" aria-hidden="true">=</div>
      <div class="passo cinza"><span class="r">Estoque final</span><b>99</b><small>04/10. Confere com o arquivo.</small></div>
      <div class="op" aria-hidden="true">→</div>
      <div class="passo desce"><span class="r">Variação do estoque</span><b>−21,43%</b><small>(99 − 126) ÷ 126</small></div>
    </div>
    <p class="fonte">Isotônico Gatorade 500 ml laranja, loja 01 Américas. Não há corte inventado para “entrou demais” ou “entrou de menos”: ordenar a variação mostra quem sobrou e quem faltou.</p>
  </section>

  <section>
    <h2>A conta fecha em ${f((q(nova).janelaFecha / conN) * 100)}% dos pares de ${LN}</h2>
    <p class="lead">Os dois arquivos de estoque desta semana vêm do movimento e trazem as 22 empresas, com a central. Dos ${int(nova.pares)} pares de loja e produto da oferta, ${int(nova.duas)} têm as duas linhas. Para cada um, a conta é: estoque do primeiro dia, mais as entradas do arquivo de entradas, menos as saídas, menos a venda dos dias seguintes. O resultado é comparado com o estoque do último dia.</p>
    <div class="indicadores" data-anima>${ind("Pares com as duas linhas", cnt(nova.duas, 0), apoio(`de ${int(nova.pares)} pares · ${LA}: ${int(raiz.duas)} de ${int(raiz.pares)}`))}${ind("A conta fecha", cnt(jan(nova).fecha, 0), apoio(`${pp(jan(nova).fecha, conN)} · ${LA}: ${pp(jan(raiz).fecha, conA)}`))}${ind("Estoque final abaixo da conta", cnt(jan(nova).abaixo, 0), apoio(`${pp(jan(nova).abaixo, conN)} · ${LA}: ${pp(jan(raiz).abaixo, conA)}`))}${ind("Estoque final acima da conta", cnt(jan(nova).acima, 0), apoio(`${pp(jan(nova).acima, conN)} · ${LA}: ${pp(jan(raiz).acima, conA)}`))}
    </div>
    <p class="fonte">Estoque final abaixo da conta: saiu mais mercadoria do que a venda e as saídas registradas explicam (quebra, transferência de saída, consumo ou ajuste que nenhum arquivo traz). Acima da conta: entrou mais do que as entradas registradas explicam. A diferença não recebe causa neste resumo. A saída por devolução vem no arquivo de entradas sem quantidade em unidades, e por isso fica fora da conta.</p>
  </section>

  <section>
    <h2>Onde o estoque pede atenção, semana contra semana</h2>
    <p class="lead">Os percentuais são sobre os pares que têm a linha do último dia (${int(baseN)} em ${LN} e ${int(baseA)} em ${LA}), porque é nela que se lê o saldo final. A conta da janela e a sem entrada usam a base dos pares com as duas linhas, e a causa da ruptura, a das rupturas.</p>
    <div class="rolagem">
      <table>
        <thead><tr><th class="txt" rowspan="2">Situação</th><th colspan="2" class="grupo">${LA}</th><th colspan="2" class="grupo">${LN}</th><th class="txt" rowspan="2">O que significa</th></tr><tr><th>Pares</th><th>%</th><th>Pares</th><th>%</th></tr></thead>
        <tbody>
          ${linhaEst("Ruptura", raiz.ruptura, nova.ruptura, baseA, baseN, "Terminaram a semana com saldo zero.")}
          ${linhaEst("Saldo negativo", raiz.negativo, nova.negativo, baseA, baseN, "Listados à parte. Não são ruptura.")}
          ${linhaEst("Ruptura provável", raiz.provavel, nova.provavel, baseA, baseN, "Houve venda e o saldo final cobre menos de um dia do ritmo da semana.")}
          ${linhaEst("Conta aberta", raiz.contaAberta, nova.contaAberta, raiz.pares, nova.pares, "A conta da linha ou a conta da janela não fecha. Percentual sobre todos os pares da oferta.")}
          ${linhaEst("Sem entrada", raiz.semEntrada, nova.semEntrada, raiz.duas, nova.duas, "O saldo terminou maior e nem o estoque nem o arquivo de entradas registram entrada.")}
          ${linhaEst("Sem venda com saldo", raiz.semVendaSaldo, nova.semVendaSaldo, raiz.pares, nova.pares, "Havia saldo e o produto não vendeu na loja. Percentual sobre todos os pares da oferta.", false)}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>A ruptura nasce, em geral, de produto sem pedido na semana</h2>
    <p class="lead">Em ${LN}, ${int(q(nova).zeroSemPedido)} das ${int(nova.ruptura)} rupturas (${pp(q(nova).zeroSemPedido, nova.ruptura)}) não tinham nenhum pedido com recebimento previsto nos quatro dias. Em ${int(q(nova).zeroAtrasado)} (${pp(q(nova).zeroAtrasado, nova.ruptura)}) havia pedido com saldo pendente de entrega: ${int(atrasadoQtd)} unidades, ${brl(atrasadoVal)} a custo.</p>
    <div class="rolagem estreita">
      <table>
        <thead><tr><th class="txt" rowspan="2">Causa da ruptura</th><th colspan="2" class="grupo">${LA}</th><th colspan="2" class="grupo">${LN}</th></tr><tr><th>Pares</th><th>%</th><th>Pares</th><th>%</th></tr></thead>
        <tbody>
          <tr><td class="txt">Sem pedido na semana</td><td>${int(q(raiz).zeroSemPedido)}</td><td>${pp(q(raiz).zeroSemPedido, raiz.ruptura)}</td><td class="neg">${int(q(nova).zeroSemPedido)}</td><td>${pp(q(nova).zeroSemPedido, nova.ruptura)}</td></tr>
          <tr><td class="txt">Pedido atrasado (saldo pendente)</td><td>${int(q(raiz).zeroAtrasado)}</td><td>${pp(q(raiz).zeroAtrasado, raiz.ruptura)}</td><td class="neg">${int(q(nova).zeroAtrasado)}</td><td>${pp(q(nova).zeroAtrasado, nova.ruptura)}</td></tr>
          <tr><td class="txt">Recebido e vendido</td><td>${int(q(raiz).zeroRecebido)}</td><td>${pp(q(raiz).zeroRecebido, raiz.ruptura)}</td><td>${int(q(nova).zeroRecebido)}</td><td>${pp(q(nova).zeroRecebido, nova.ruptura)}</td></tr>
          <tr><td class="txt">Recebido sem entrada no estoque</td><td>${int(q(raiz).zeroRecebidoSemEntrada)}</td><td>${pp(q(raiz).zeroRecebidoSemEntrada, raiz.ruptura)}</td><td>${int(q(nova).zeroRecebidoSemEntrada)}</td><td>${pp(q(nova).zeroRecebidoSemEntrada, nova.ruptura)}</td></tr>
          <tr><td class="txt">Pedido cancelado</td><td>${int(q(raiz).zeroCancelado)}</td><td>${pp(q(raiz).zeroCancelado, raiz.ruptura)}</td><td>${int(q(nova).zeroCancelado)}</td><td>${pp(q(nova).zeroCancelado, nova.ruptura)}</td></tr>
        </tbody>
        <tfoot><tr><td class="txt">Rupturas</td><td>${int(raiz.ruptura)}</td><td>100,00%</td><td>${int(nova.ruptura)}</td><td>100,00%</td></tr></tfoot>
      </table>
    </div>
    <h3>Por comprador, em ${LN}</h3>
    <div class="rolagem estreita">
      <table>
        <thead><tr><th class="txt">Comprador</th><th>Rupturas</th><th>Sem pedido</th><th>Pedido atrasado</th><th>Pendente (un)</th><th>Pendente (R$ a custo)</th></tr></thead>
        <tbody>${compradoresRuptura.map((b) => `<tr><td class="txt">${esc(nome(b.comprador))}</td><td>${int(b.ruptura)}</td><td>${int(b.zeroSemPedido)}</td><td>${int(b.zeroAtrasado)}</td><td>${b.pendenteZeroQtd ? int(b.pendenteZeroQtd) : "—"}</td><td>${b.pendenteZeroValor ? f(b.pendenteZeroValor) : "—"}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="fonte">Cada ruptura recebe uma causa só, pelo arquivo Automático: sem pedido (nenhuma linha de pedido com recebimento previsto nos quatro dias), pedido atrasado (saldo pendente, QTDSALDO), recebido e vendido, recebido sem entrada (consta recebido, mas nem o estoque nem o arquivo de entradas registram entrada) e cancelado. O saldo pendente é o da data de extração do arquivo, posterior ao domingo, e o arquivo não traz pedido com entrega prevista para depois do domingo: “sem pedido” quer dizer sem pedido com entrega na semana. “Recebido sem entrada” pode ser mercadoria que chegou depois do domingo.</p>
  </section>

  <section>
    <h2>${centralN.disponivel ? "A central: falta de transferência ou falta de compra" : "A central não vem nos arquivos desta semana"}</h2>
    ${centralN.disponivel
      ? `<p class="lead">A central (empresa 70) tem linha nos dois arquivos de estoque. Entre as ${int(nova.ruptura)} rupturas das lojas, ${int(centralN.lojaZeradaCdComSaldo)} tinham saldo na central ao fim da semana (falha de transferência) e ${int(centralN.ambosZerados)} estavam zeradas nas duas pontas (falha de compra). Nos produtos de oferta com linha da central nos dois dias, o saldo da central cresceu em ${int(centralN.cresceu)}, caiu em ${int(centralN.caiu)} e ficou igual em ${int(centralN.estavel)}.</p>`
      : `<p class="lead">Sem o saldo inicial e o final da central, esta semana não separa falta de transferência de falta de compra.</p>`}
  </section>

  <!-- ===== FIM ===== -->
  <section id="fim">
    <p class="ato">Fim</p>
    <h2>O que decidir agora</h2>
    <p class="lead">Cada item abaixo nasce de um número desta página. Nenhum depende de meta ou de corte que não esteja nos arquivos.</p>
    <ol class="passos">
      <li><b>Destravar o pedido atrasado.</b> ${int(q(nova).zeroAtrasado)} rupturas têm pedido com saldo pendente de entrega (${int(atrasadoQtd)} unidades, ${brl(atrasadoVal)} a custo)${topAtrasados.length ? `, concentradas em ${sai(topAtrasados, "zeroAtrasado")}` : ""}. Para cada uma, decidir: cobrar a entrega, cancelar ou repor por outro caminho, antes de perder a venda.</li>
      <li><b>Olhar o produto sem pedido.</b> ${int(q(nova).zeroSemPedido)} rupturas (${pp(q(nova).zeroSemPedido, nova.ruptura)}) não tinham pedido com entrega na semana${topSemPedido.length ? `, mais em ${sai(topSemPedido, "zeroSemPedido")}` : ""}. Aqui a falta nasce na compra, não na entrega.</li>
      <li><b>Conferir o recebido sem entrada.</b> ${int(q(nova).recebidoSemEntradaPares)} pares têm pedido recebido e nenhuma entrada visível no estoque (${int(q(nova).recebidoSemEntradaQtd)} unidades). Se a mercadoria chegou depois do domingo, o próximo arquivo mostra; se não, o recebimento está lançado sem a mercadoria.</li>
      <li><b>Explicar a conta aberta.</b> A conta da janela não fecha em ${int(jan(nova).abaixo + jan(nova).acima)} pares (${pp(jan(nova).abaixo + jan(nova).acima, conN)} dos que têm as duas linhas), ${int(jan(nova).abaixo)} deles com o estoque final abaixo da conta. Abrir esses pares na capa mostra a diferença de cada um.</li>
      <li><b>Rever a venda.</b> ${int(cruz.caiu)} dos ${int(cruz.repetidos)} produtos que repetiram venderam menos. As cinco maiores quedas em valor estão na tabela acima.</li>
      <li><b>Acompanhar o automático.</b> Na rede, o abastecimento automático foi de ${f(autPN)}% das linhas, contra ${f(autPA)}% na semana anterior. Ver, comprador a comprador, quem avança e quem recua é ver quem usa melhor o sistema com menos intervenção manual.</li>
      <li><b>Pedir o arquivo de ofertas na segunda-feira.</b> O arquivo de ${LN} foi extraído em ${nova.oferta.extraidoEm}. Com a extração logo depois do domingo, a participação deixa de carregar venda de outros dias e a comparação entre semanas fica justa.</li>
    </ol>
  </section>

  <section>
    <h2>Limites desta leitura</h2>
    <ul class="limites">
      <li>${int(nova.pares - nova.duas)} dos ${int(nova.pares)} pares não têm uma das duas linhas de estoque. Nesses pares a tela não conclui. A linha que não existe no arquivo não é tratada como estoque zero.</li>
      <li>A venda da oferta e a participação vêm do arquivo de ofertas, que soma a venda da promoção até a extração. ${LN}: extração em ${nova.oferta.extraidoEm}, com ${brl(nova.oferta.depoisDomingo)} em promoções que terminam depois do domingo. ${LA}: extração em ${raiz.oferta.extraidoEm}, com ${brl(raiz.oferta.depoisDomingo)}.</li>
      <li>As duas ofertas têm tamanhos diferentes (${int(raiz.produtos)} e ${int(nova.produtos)} produtos). A comparação mais direta é a dos ${int(cruz.repetidos)} produtos que repetiram.</li>
      <li>O percentual automático conta linhas de pedido, não unidades nem valor. Comprador com poucas linhas tem percentual de base pequena.</li>
      <li>O arquivo de pedidos só traz linhas com recebimento previsto nos quatro dias. Pedido com entrega para depois do domingo não aparece, e o saldo pendente é o da data de extração.</li>
      <li>Os arquivos não trazem preço de concorrente, exposição de gôndola, estoque mínimo ou cobertura-alvo, nem transferência de saída, quebra ou ajuste. A análise aponta o grupo e não a causa.</li>
    </ul>
  </section>
`;

const css = `
/* ===== Resumo executivo: complementos do template ===== */
:root { --cinza-destaque: #E4E7EA; }
.sobra-detalhe { margin: .6rem 0; border: 1px solid var(--linha); border-radius: 10px; padding: .2rem 1rem; background: var(--papel); }
.sobra-detalhe summary { cursor: pointer; font-weight: 600; padding: .6rem 0; }
.sobra-detalhe[open] summary { border-bottom: 1px solid var(--linha); margin-bottom: .6rem; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --cinza-destaque: #243246; } }
:root[data-theme="dark"] { --cinza-destaque: #243246; }
.percurso { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 1.5rem; background: var(--papel); border: 1px solid var(--linha); border-radius: 10px; overflow: hidden; }
.percurso a { display: block; padding: .8rem 1.1rem; color: var(--tinta); text-decoration: none; border-left: 1px solid var(--linha); }
.percurso a:first-child { border-left: 0; }
.percurso a b { display: block; font: 700 1.05rem/1.2 "Outfit", sans-serif; color: var(--verde-texto); }
.percurso a span { font-size: .85rem; color: var(--tinta-suave); }
.percurso a:hover { background: var(--verde-fundo); }
.abertura { font-size: 1.12rem; max-width: 74ch; margin: 1.5rem 0 0; }
.ato { margin: 0 0 .25rem .8rem; font: 600 .95rem/1.2 "Outfit", sans-serif; color: var(--vermelho); }
section > h2 + p.lead, section > .ato + h2 { margin-top: 0; }
section > h3 { font-size: 1.05rem; font-weight: 700; margin: 1.5rem 0 .6rem .8rem; }
.apoio-linha { font-size: .85rem; color: var(--tinta-suave); }
.fonte { font-size: .85rem; color: var(--tinta-suave); max-width: 80ch; margin: .75rem 0 0 .8rem; }
.rolagem.estreita { max-width: 880px; }
th.txt, td.txt { text-align: left; }
td.txt { white-space: normal; min-width: 160px; }
.grafico svg.largo { max-width: 860px; }
.grafico text.apoio { fill: var(--tinta-suave); font-size: 11px; }
.grafico text.queda { fill: var(--vermelho); font-weight: 600; }
.grafico text.alta { fill: var(--verde-texto); font-weight: 600; }
.barra-n { fill: var(--linha); }
.grafico { margin-bottom: .5rem; }
.fluxo { display: flex; flex-wrap: wrap; align-items: stretch; gap: .6rem; background: var(--papel); border: 1px solid var(--linha); border-radius: 10px; padding: 1.1rem; }
.fluxo .op { display: flex; align-items: center; font: 700 1.6rem/1 "Outfit", sans-serif; color: var(--tinta-suave); }
.fluxo .passo { flex: 1 1 150px; border-radius: 8px; padding: .8rem .9rem; background: var(--fundo); }
.fluxo .passo.cinza { background: var(--cinza-destaque); }
.fluxo .passo.desce { background: var(--vermelho-fundo); }
.fluxo .passo .r { display: block; font-size: .85rem; color: var(--tinta-suave); }
.fluxo .passo b { display: block; font: 800 1.9rem/1.2 "Outfit", sans-serif; }
.fluxo .passo.desce b { color: var(--vermelho); }
.fluxo .passo small { display: block; font-size: .8rem; color: var(--tinta-suave); line-height: 1.35; }
.passos { margin: 0 0 0 .8rem; padding: 0; list-style: none; counter-reset: p; max-width: 80ch; }
.passos li { counter-increment: p; position: relative; padding: .8rem 0 .8rem 3rem; border-top: 1px solid var(--linha); }
.passos li:last-child { border-bottom: 1px solid var(--linha); }
.passos li::before { content: counter(p); position: absolute; left: 0; top: .7rem; width: 2rem; height: 2rem; border-radius: 50%; background: var(--verde); color: #fff; font: 700 1rem/2rem "Outfit", sans-serif; text-align: center; }
.rolagem thead th { position: static; }
th.grupo { text-align: center; border-left: 1px solid rgba(255,255,255,.4); }
thead tr + tr th:first-child { text-align: right; }
thead th[rowspan] { vertical-align: bottom; }
.limites { max-width: 80ch; margin: 0 0 0 .8rem; padding-left: 1.2rem; color: var(--tinta-suave); }
.limites li { margin: .4rem 0; }
@media (max-width: 640px) { .percurso { grid-template-columns: 1fr; } .percurso a { border-left: 0; border-top: 1px solid var(--linha); } .percurso a:first-child { border-top: 0; } }
@media print { .percurso { display: none; } section { break-inside: avoid-page; } }
`;

const skill = path.join(RAIZ, ".cursor/skills/supermarket-visual");
let html = fs.readFileSync(path.join(skill, "assets/template.html"), "utf8");
html = html.replace(/<main class="wrap">[\s\S]*<\/main>/, () => `<main class="wrap">${main}</main>`);
html = html.replace("</style>", () => css + "</style>");
html = html.replace(/\{\{TITULO\}\}/g, "Resumo executivo: oferta de fim de semana");
html = html.replace("{{SUBTITULO}}", `Semanas de ${LA} e de ${LN}/2026 · 13 lojas · para os sócios`);
const trabalho = path.join(os.tmpdir(), "resumo_trabalho.html");
fs.writeFileSync(trabalho, html, "utf8");
const saida = path.join(RAIZ, "relatorios", "resumo_executivo_oferta_fds.html");
execFileSync("python", [path.join(skill, "scripts/embed_logos.py"), trabalho, saida], { stdio: "inherit" });
fs.unlinkSync(trabalho);
console.log("gerado", saida, `(${LA} → ${LN})`);
console.log({ participacao: [partA, partN], ruptura: [raiz.ruptura, nova.ruptura], causasN: [q(nova).zeroSemPedido, q(nova).zeroAtrasado, q(nova).zeroRecebido, q(nova).zeroRecebidoSemEntrada, q(nova).zeroCancelado], automatico: [autPA, autPN], repetidos: cruz.repetidos });
