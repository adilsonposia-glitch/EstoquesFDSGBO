const RETAIL = ["1", "5", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];
const KEEP = new Set([...RETAIL, "70"]);
const DROP = new Set(["2", "3", "4", "6", "18", "50", "60", "61"]);

const LOJAS = {
  1: "01 Américas",
  5: "05 Gardênia Azul",
  7: "07 Abelardo",
  8: "08 Magarça",
  9: "09 Riachuelo",
  10: "10 Barra",
  11: "11 Via Parque",
  12: "12 Campo Grande",
  13: "13 Tanque",
  14: "14 Cascadura",
  15: "15 Pedra",
  16: "16 Terreirão",
  17: "17 P. Lucas",
  70: "70 Central",
};

const EPS = 0.05;

function num(value) {
  if (value == null) return 0;
  const text = String(value).trim();
  if (!text) return 0;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function linesOf(text) {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
}

function stamp(value) {
  const text = (value || "").trim();
  if (!text) return "";
  const [date, time = "00:00:00"] = text.split(" ");
  const [dd, mm, yy] = date.split("-");
  if (!yy) return "";
  return `${yy}${mm}${dd}${time.replace(/:/g, "")}`;
}

function dayOf(stampValue) {
  return stampValue.slice(0, 8);
}

function classeLinha(value) {
  const text = (value || "").trim().toUpperCase();
  if (text === "ABAST.AUT") return "automatico";
  if (text === "EMBALAGEM") return "embalagem";
  if (text === "MATERIAPRIMA") return "materia-prima";
  if (text === "USOCONSUMO") return "uso e consumo";
  if (!text) return "indefinido";
  return "manual";
}

function readStock(text, label) {
  const rows = linesOf(text);
  const header = rows[0] || "";
  if (!header.startsWith("EMPRESA;NOME_EMPRESA;SEQPRODUTO;DESCCOMPLETA;ESTOQUE_DTBASE;DT_BASE")) {
    return { ok: false, message: `Cabeçalho inesperado em ${label}.` };
  }
  const map = new Map();
  let fora = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const parts = rows[index].split(";");
    if (parts.length < 6) continue;
    if (DROP.has(parts[0])) {
      fora += 1;
      continue;
    }
    if (!KEEP.has(parts[0])) continue;
    map.set(`${parts[0]}|${parts[2]}`, num(parts[4]));
  }
  return { ok: true, map, fora };
}

function parseLojas(rows) {
  const totals = {};
  for (const row of rows) {
    const name = String(row.nome || "").trim();
    const match = name.match(/^(\d+)/);
    if (!match) continue;
    totals[String(Number(match[1]))] = num(row.valor);
  }
  return totals;
}

function weekday(dateText) {
  const [dd, mm, yy] = dateText.split("-");
  return new Date(Number(yy), Number(mm) - 1, Number(dd)).getDay();
}

function validateDates(dates) {
  const sorted = [...dates].sort((a, b) => a.split("-").reverse().join("").localeCompare(b.split("-").reverse().join("")));
  if (sorted.length !== 4) {
    return { ok: false, message: "A pasta precisa ter quatro arquivos de venda, de quinta a domingo." };
  }
  const keys = sorted.map((date) => date.split("-").reverse().join(""));
  for (let index = 1; index < keys.length; index += 1) {
    const previous = new Date(keys[index - 1].slice(0, 4), Number(keys[index - 1].slice(4, 6)) - 1, Number(keys[index - 1].slice(6, 8)));
    const current = new Date(keys[index].slice(0, 4), Number(keys[index].slice(4, 6)) - 1, Number(keys[index].slice(6, 8)));
    const diff = (current - previous) / 86400000;
    if (diff !== 1) {
      return { ok: false, message: "As quatro datas de venda precisam ser dias seguidos." };
    }
  }
  if (weekday(sorted[0]) !== 4 || weekday(sorted[3]) !== 0) {
    return { ok: false, message: "A janela oficial começa na quinta e termina no domingo." };
  }
  return { ok: true, dates: sorted };
}

function analyze(input) {
  const salesFiles = input.sales || [];
  const dates = salesFiles.map((file) => file.date);
  const period = validateDates(dates);
  if (!period.ok) {
    return { ok: false, message: period.message };
  }

  const salesQty = new Map();
  const salesValue = new Map();
  const salesProfit = new Map();
  const salesCost = new Map();
  const sold = new Set();
  const offer = new Set();
  const periodByStore = {};
  let periodTotal = 0;
  let salesRows = 0;

  for (const file of salesFiles) {
    const rows = linesOf(file.text);
    const header = rows[0].split(";");
    if (header[0] !== "IDEMPRESA" || header[1] !== "IDPRODUTO") {
      return { ok: false, message: `Cabeçalho inesperado em ${file.date}.txt.` };
    }
    for (let index = 1; index < rows.length; index += 1) {
      const parts = rows[index].split(";");
      if (parts.length < 7) continue;
      const store = parts[0];
      if (!KEEP.has(store) || store === "70") continue;
      const product = parts[1];
      const key = `${store}|${product}`;
      const value = num(parts[4]);
      salesRows += 1;
      sold.add(key);
      periodByStore[store] = (periodByStore[store] || 0) + value;
      periodTotal += value;
      salesQty.set(key, (salesQty.get(key) || 0) + num(parts[3]));
      salesValue.set(key, (salesValue.get(key) || 0) + value);
      salesProfit.set(key, (salesProfit.get(key) || 0) + num(parts[5]));
      salesCost.set(key, (salesCost.get(key) || 0) + num(parts[6]));
    }
  }

  const dim = new Map();
  const dimRows = linesOf(input.dim);
  for (let index = 1; index < dimRows.length; index += 1) {
    const parts = dimRows[index].split(";");
    if (parts.length < 12) continue;
    dim.set(parts[1], {
      comprador: parts[7] || "Sem comprador",
      descricao: parts[6] || "",
      n1: parts[11] || "",
      n2: parts[12] || "",
      n3: parts[13] || "",
      n4: parts[14] || "",
    });
  }

  if (!input.ofertas) {
    return { ok: false, message: "Falta o arquivo Ofertas do período." };
  }
  const offerRows = linesOf(input.ofertas);
  if (!offerRows[0] || !offerRows[0].startsWith("NROEMPRESA;")) {
    return { ok: false, message: "Cabeçalho inesperado em Ofertas do período." };
  }
  const offerValueStore = {};
  const offerValueBuyer = {};
  let offerValue = 0;
  const promoByCode = new Map();
  const codesByName = new Map();
  const segmentMap = new Map();
  for (let index = 1; index < offerRows.length; index += 1) {
    const parts = offerRows[index].split(";");
    if (parts.length < 11) continue;
    const store = parts[0];
    if (!RETAIL.includes(store)) continue;
    const product = parts[6];
    offer.add(product);
    const value = num(parts[10]);
    offerValue += value;
    offerValueStore[store] = (offerValueStore[store] || 0) + value;
    const buyerName = dim.get(product)?.comprador || "Sem comprador";
    offerValueBuyer[buyerName] = (offerValueBuyer[buyerName] || 0) + value;
    const code = parts[2];
    const name = (parts[3] || "").trim() || "Sem nome";
    const segment = (parts[1] || "").trim() || "Sem segmento";
    let promo = promoByCode.get(code);
    if (!promo) {
      promo = { segmentos: new Set() };
      promoByCode.set(code, promo);
    }
    promo.segmentos.add(segment);
    let codes = codesByName.get(name);
    if (!codes) {
      codes = new Set();
      codesByName.set(name, codes);
    }
    codes.add(code);
    let bucket = segmentMap.get(segment);
    if (!bucket) {
      bucket = { segmento: segment, produtos: new Set(), venda: 0 };
      segmentMap.set(segment, bucket);
    }
    bucket.produtos.add(product);
    bucket.venda += value;
  }
  const porNome = [...codesByName.entries()]
    .map(([nome, codes]) => ({
      nome,
      codigos: codes.size,
      lista: [...codes].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })).join(", "),
    }))
    .sort((a, b) => b.codigos - a.codigos || a.nome.localeCompare(b.nome, "pt-BR"));
  const lancamento = {
    codigos: promoByCode.size,
    nomes: codesByName.size,
    nomesRepetidos: porNome.filter((row) => row.codigos > 1).length,
    codigosEmVariosSegmentos: [...promoByCode.values()].filter((promo) => promo.segmentos.size > 1).length,
    exemplos: porNome.filter((row) => row.codigos > 1).slice(0, 4),
    porNome,
  };
  const segmentos = [...segmentMap.values()]
    .map((bucket) => ({
      segmento: bucket.segmento,
      itens: bucket.produtos.size,
      venda: bucket.venda,
      participacao: offerValue ? bucket.venda / offerValue : 0,
    }))
    .sort((a, b) => Number(a.segmento) - Number(b.segmento) || a.segmento.localeCompare(b.segmento, "pt-BR"));

  const estoqueInicial = readStock(input.inicio, "estoque de quinta");
  if (!estoqueInicial.ok) return estoqueInicial;
  const estoqueFinal = readStock(input.fim, "estoque de domingo");
  if (!estoqueFinal.ok) return estoqueFinal;
  const inicial = estoqueInicial.map;
  const final = estoqueFinal.map;
  const inicioFora = estoqueInicial.fora;
  const fimFora = estoqueFinal.fora;

  const entradas = new Map();
  const seenEntry = new Set();
  let entradasRepetidas = 0;
  const entradaRows = linesOf(input.entradas);
  for (let index = 1; index < entradaRows.length; index += 1) {
    const line = entradaRows[index];
    if (seenEntry.has(line)) {
      entradasRepetidas += 1;
      continue;
    }
    seenEntry.add(line);
    const parts = line.split(";");
    if (parts.length < 8) continue;
    if (!KEEP.has(parts[4])) continue;
    const key = `${parts[4]}|${parts[5]}`;
    entradas.set(key, (entradas.get(key) || 0) + num(parts[7]));
  }

  const lojasTotal = parseLojas(input.lojas || []);
  const coverLimit = input.coverLimit == null ? 1 : input.coverLimit;

  const compradores = new Map();
  const lojas = new Map();
  const ensureBuyer = (name) => {
    if (!compradores.has(name)) {
      compradores.set(name, {
        comprador: name,
        venda: 0,
        lucro: 0,
        margem: 0,
        pares: 0,
        comVenda: 0,
        posicionados: 0,
        comPosicao: 0,
        ruptura: 0,
        negativo: 0,
        provavel: 0,
        irregular: 0,
        excecaoSem: 0,
        excecaoInsuf: 0,
        semVendaSaldo: 0,
        semVendaZero: 0,
        automatico: 0,
        manual: 0,
        ambos: 0,
        comAbastecimento: 0,
        embalagem: 0,
        materia: 0,
        uso: 0,
      });
    }
    return compradores.get(name);
  };
  const ensureStore = (id) => {
    if (!lojas.has(id)) {
      lojas.set(id, {
        id,
        nome: LOJAS[id] || id,
        venda: 0,
        lucro: 0,
        margem: 0,
        totalLoja: lojasTotal[id] || 0,
        ruptura: 0,
        provavel: 0,
        irregular: 0,
        excecaoSem: 0,
        semVendaSaldo: 0,
        semVendaZero: 0,
        pares: 0,
        comVenda: 0,
        comPosicao: 0,
        automatico: 0,
        manual: 0,
        ambos: 0,
        comAbastecimento: 0,
      });
    }
    return lojas.get(id);
  };

  const details = [];
  const quality = {
    salesRows,
    produtosOferta: offer.size,
    paresComVenda: sold.size,
    fecha: 0,
    semPosicaoVenda: 0,
    inicioFora,
    fimFora,
    entradasRepetidas,
  };

  let redeLucro = 0;
  let redeMargem = 0;
  const redeTotal = periodTotal;

  for (const product of offer) {
    const info = dim.get(product) || {
      comprador: "Sem comprador",
      descricao: product,
      n1: "",
      n2: "",
      n3: "",
      n4: "",
    };
    for (const store of RETAIL) {
      const key = `${store}|${product}`;
      const hasSale = sold.has(key);
      const qi = inicial.has(key) ? inicial.get(key) : null;
      const ef = final.has(key) ? final.get(key) : null;
      const hasBoth = qi != null && ef != null;
      const hasFinal = ef != null;
      const en = entradas.get(key) || 0;
      const qv = salesQty.get(key) || 0;
      const vv = salesValue.get(key) || 0;
      const lucro = salesProfit.get(key) || 0;
      const margem = vv - (salesCost.get(key) || 0);
      const buyer = ensureBuyer(info.comprador);
      const storeRow = ensureStore(store);
      buyer.pares += 1;
      storeRow.pares += 1;

      if (hasSale) {
        buyer.comVenda += 1;
        storeRow.comVenda += 1;
        buyer.lucro += lucro;
        buyer.margem += margem;
        storeRow.lucro += lucro;
        storeRow.margem += margem;
        redeLucro += lucro;
        redeMargem += margem;
      }

      let situacao = "sem-estoque";
      let irregular = false;
      let excecao = "";
      let provavel = false;
      let cobertura = null;

      if (!hasFinal) {
        if (hasSale) quality.semPosicaoVenda += 1;
      } else {
        buyer.comPosicao += 1;
        storeRow.comPosicao += 1;
        if (Math.abs(ef) <= EPS) {
          situacao = "zero";
          buyer.ruptura += 1;
          storeRow.ruptura += 1;
        } else if (ef < -EPS) {
          situacao = "negativo";
          buyer.negativo += 1;
        } else {
          situacao = "positivo";
        }

        if (hasSale && qv > EPS && ef > EPS) {
          cobertura = (ef * 4) / qv;
          if (cobertura < coverLimit) {
            provavel = true;
            buyer.provavel += 1;
            storeRow.provavel += 1;
          }
        }

        if (!hasSale && ef > EPS) {
          buyer.semVendaSaldo += 1;
          storeRow.semVendaSaldo += 1;
        }
        if (!hasSale && Math.abs(ef) <= EPS) {
          buyer.semVendaZero += 1;
          storeRow.semVendaZero += 1;
        }
      }

      if (hasBoth) {
        if (qi > EPS) buyer.posicionados += 1;
        const grew = ef > qi + EPS;
        irregular = grew;
        if (grew && en <= EPS) excecao = "sem-entrada";
        else if (grew && en > EPS && qv > en + EPS) excecao = "entrada-insuficiente";
        if (irregular) {
          buyer.irregular += 1;
          storeRow.irregular += 1;
        }
        if (excecao === "sem-entrada") {
          buyer.excecaoSem += 1;
          storeRow.excecaoSem += 1;
        }
        if (excecao === "entrada-insuficiente") buyer.excecaoInsuf += 1;
        if (hasSale && Math.abs(ef - (qi + en - qv)) <= EPS) quality.fecha += 1;
      }

      if (!hasSale && !hasFinal) situacao = "sem-linha";

      details.push({
        loja: store,
        lojaNome: LOJAS[store],
        produto: product,
        descricao: info.descricao,
        comprador: info.comprador,
        n1: info.n1,
        n2: info.n2,
        venda: vv,
        lucro,
        margem,
        quantidade: qv,
        inicial: qi,
        entradas: en,
        final: ef,
        vendeu: hasSale,
        situacao,
        irregular,
        excecao,
        provavel,
        cobertura,
        sellThrough: qi != null && qi + en > EPS ? qv / (qi + en) : null,
      });
    }
  }

  const central = { oferta: 0, cresceu: 0, caiu: 0, estavel: 0, lojaZeradaCdComSaldo: 0, ambosZerados: 0 };
  const cdFinal = new Map();
  const cdInicial = new Map();
  for (const [key, value] of final) {
    if (key.startsWith("70|")) cdFinal.set(key.slice(3), value);
  }
  for (const [key, value] of inicial) {
    if (key.startsWith("70|")) cdInicial.set(key.slice(3), value);
  }
  for (const product of offer) {
    if (!cdFinal.has(product) || !cdInicial.has(product)) continue;
    central.oferta += 1;
    const qi = cdInicial.get(product);
    const ef = cdFinal.get(product);
    if (ef > qi + EPS) central.cresceu += 1;
    else if (ef < qi - EPS) central.caiu += 1;
    else central.estavel += 1;
  }
  for (const row of details) {
    if (row.situacao !== "zero") continue;
    const cd = cdFinal.get(row.produto);
    if (cd == null) continue;
    if (cd > EPS) central.lojaZeradaCdComSaldo += 1;
    else if (Math.abs(cd) <= EPS) central.ambosZerados += 1;
  }

  const sistematica = { nomesDiferentes: 0, linhas: 0 };
  const datas = [];
  const grupos = new Map();
  const modos = new Map();
  if (input.automatico) {
    const rows = linesOf(input.automatico);
    for (let index = 1; index < rows.length; index += 1) {
      const parts = rows[index].split(";");
      if (parts.length < 29) continue;
      const product = parts[5];
      if (!offer.has(product)) continue;
      const info = dim.get(product);
      const buyerName = info ? info.comprador : "Sem comprador";
      const buyer = ensureBuyer(buyerName);
      const kind = classeLinha(parts[28]);
      const store = parts[0];
      const storeRow = RETAIL.includes(store) ? ensureStore(store) : null;
      sistematica.linhas += 1;
      if (kind === "automatico") {
        buyer.automatico += 1;
        if (storeRow) storeRow.automatico += 1;
      } else if (kind === "manual") {
        buyer.manual += 1;
        if (storeRow) storeRow.manual += 1;
        const primeiro = buyerName.split(" ")[0].toUpperCase();
        if (primeiro !== parts[28].trim().toUpperCase()) sistematica.nomesDiferentes += 1;
      } else if (kind === "embalagem") buyer.embalagem += 1;
      else if (kind === "materia-prima") buyer.materia += 1;
      else if (kind === "uso e consumo") buyer.uso += 1;

      if (kind !== "automatico" && kind !== "manual") continue;
      const key = `${parts[0]}|${product}`;
      if (!modos.has(key)) modos.set(key, { automatico: false, manual: false, qtdAutomatica: 0, qtdManual: 0 });
      const modo = modos.get(key);
      const recebida = num(parts[18]);
      if (kind === "automatico") {
        modo.qtdAutomatica += recebida;
        if (recebida > EPS) modo.automatico = true;
      } else {
        modo.qtdManual += recebida;
        if (recebida > EPS) modo.manual = true;
      }
      if (!grupos.has(key)) grupos.set(key, { aut: "", man: [], loja: parts[0], produto: product });
      const group = grupos.get(key);
      const when = stamp(parts[22]);
      if (!when) continue;
      if (kind === "automatico") {
        if (!group.aut || when < group.aut) group.aut = when;
      } else group.man.push(when);
    }
  }

  for (const group of grupos.values()) {
    if (!group.aut || group.man.length === 0) continue;
    const flags = new Set();
    for (const when of group.man) {
      if (dayOf(when) < dayOf(group.aut)) flags.add("antes");
      else if (dayOf(when) > dayOf(group.aut)) flags.add("depois");
      else flags.add(when < group.aut ? "mesmo-dia-antes" : "mesmo-dia-depois");
    }
    let relacao = "misto";
    if (flags.size === 1) relacao = [...flags][0];
    const info = dim.get(group.produto) || { comprador: "Sem comprador", descricao: group.produto };
    datas.push({
      loja: group.loja,
      lojaNome: LOJAS[group.loja] || group.loja,
      produto: group.produto,
      descricao: info.descricao,
      comprador: info.comprador,
      n1: info.n1 || "",
      n2: info.n2 || "",
      relacao,
      automatico: group.aut,
      manuais: group.man.length,
    });
  }

  for (const row of details) {
    const modo = modos.get(`${row.loja}|${row.produto}`);
    row.automatico = Boolean(modo?.automatico);
    row.manual = Boolean(modo?.manual);
    row.entradaAutomatica = modo?.qtdAutomatica || 0;
    row.entradaManual = modo?.qtdManual || 0;
    if (!row.automatico && !row.manual) continue;
    const buyer = ensureBuyer(row.comprador);
    const storeRow = ensureStore(row.loja);
    buyer.comAbastecimento += 1;
    storeRow.comAbastecimento += 1;
    if (row.automatico && row.manual) {
      buyer.ambos += 1;
      storeRow.ambos += 1;
    }
  }

  for (const buyer of compradores.values()) {
    buyer.venda = offerValueBuyer[buyer.comprador] || 0;
  }

  const lojaRows = RETAIL.map((id) => {
    const row = ensureStore(id);
    row.venda = offerValueStore[id] || 0;
    row.totalLoja = periodByStore[id] || 0;
    return {
      ...row,
      participacao: row.totalLoja ? row.venda / row.totalLoja : 0,
    };
  });

  return {
    ok: true,
    periodo: period.dates,
    rede: {
      venda: offerValue,
      lucro: redeLucro,
      margem: redeMargem,
      total: redeTotal,
      participacao: redeTotal ? offerValue / redeTotal : 0,
    },
    lojas: lojaRows,
    compradores: [...compradores.values()].sort((a, b) => b.venda - a.venda || a.comprador.localeCompare(b.comprador)),
    details,
    datas,
    central,
    lancamento,
    segmentos,
    quality,
    sistematica,
    coverLimit,
  };
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function lojasFromXlsx(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  let sheet = null;
  while (offset + 30 < bytes.length) {
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4b || bytes[offset + 2] !== 0x03 || bytes[offset + 3] !== 0x04) break;
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const slice = bytes.subarray(start, start + compressedSize);
    if (name === "xl/worksheets/sheet1.xml") {
      sheet = method === 0 ? slice : await inflateRaw(slice);
    }
    offset = start + compressedSize;
  }
  if (!sheet) return [];
  const xml = new TextDecoder().decode(sheet);
  const rows = [];
  for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cell of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const inline = cell[3].match(/<t[^>]*>([\s\S]*?)<\/t>/);
      const value = cell[3].match(/<v>([\s\S]*?)<\/v>/);
      cells[cell[1]] = inline ? inline[1] : value ? value[1] : "";
    }
    if (cells.A && cells.B && cells.A !== "Nome") rows.push({ nome: cells.A, valor: cells.B });
  }
  return rows;
}

export {
  analyze,
  parseLojas,
  lojasFromXlsx,
  RETAIL,
  LOJAS,
  classeLinha,
};
