---
name: supermarket-visual
description: Identidade visual Supermarket Rio de Janeiro (paleta verde e vermelho da logo) para páginas, relatórios, dashboards, apresentações, documentos e planilhas, sempre fechando a página com a logo Adilson Baptista - Inteligência de negócio no rodapé. Use sempre que o usuário pedir relatório, análise, comparativo, painel, página, apresentação ou material visual de venda, margem, mercadológico, grupo/subgrupo, lojas ou associados da rede, ou mencionar Supermarket, SMKT, Análise Venda Rede ou Adilson Baptista, mesmo que ele não peça a identidade visual explicitamente.
---

# Supermarket Visual

Padrão visual para tudo que for entregue ao usuário neste contexto de análise de varejo. Combina a paleta da logo Supermarket Rio de Janeiro com a assinatura Adilson Baptista no fim da página.

## Regras que não mudam

1. **Paleta Supermarket** (tabela abaixo). Não inventar outras cores de marca.
2. **A logo Adilson Baptista é o último bloco da página**, centralizada no rodapé, depois de todo o conteúdo. Arquivo: `assets/logo_adilson_baptista.jpeg`. Ela tem fundo branco, então fica sempre sobre uma placa branca (também no modo escuro).
3. **A logo Supermarket fica no cabeçalho** (`assets/logo_supermarket.png`, já recortada sem o anel do Instagram). Se o usuário não quiser, remover só do cabeçalho; o rodapé permanece.
4. Idioma pt-BR, números no formato brasileiro (1.234,56 e 27,84%), sinal explícito nas variações (+3,9% / −2,6%).

## Paleta

| Papel | Nome | Hex | Uso |
|---|---|---|---|
| Principal | Verde Supermarket | `#0A9C13` | faixa do cabeçalho, cabeçalho de tabela, barras principais, títulos de seção |
| Texto verde | Verde profundo | `#07780F` | variação positiva em texto pequeno (contraste AA no branco) |
| Apoio | Verde claro | `#52B465` | série secundária de gráficos |
| Secundária | Vermelho Supermarket | `#DB3129` | quedas, alertas, filete sob o cabeçalho, foco de teclado |
| Tinta | Azul-marinho ABB | `#0F2444` | texto principal (vem da logo Adilson Baptista) |
| Superfícies | Branco / Névoa / Linha | `#FFFFFF` / `#F4F8F5` / `#D9E3DC` | papel, fundo da página, bordas |
| Fundos de chip | Verde 10% / Vermelho 10% | `#E8F5EA` / `#FCE9E8` | chips de variação |

Extraída da logo por agrupamento de cores. O anel degradê (magenta e âmbar) da imagem original é moldura do Instagram, não da marca; fica fora da paleta.

Significado fixo: **verde = cresceu / acima / bom, vermelho = caiu / abaixo / atenção.** Nunca depender só da cor: usar sinal e seta (▲ ▼) junto.

## Fluxo para páginas (formato padrão)

A pasta desta skill fica normalmente em `.cursor/skills/supermarket-visual/` (projeto) ou `~/.cursor/skills/supermarket-visual/` (pessoal). Os caminhos abaixo são relativos a ela.

1. Copiar `assets/template.html` para um arquivo de trabalho e preencher: `{{TITULO}}`, `{{SUBTITULO}}` (período, base, escopo) e o conteúdo dentro de `<main>`. O template traz exemplos de painel de indicadores, tabela, gráfico de barras em SVG e cesta medidora; manter só o que o conteúdo pede. Não mexer nos marcadores `{{LOGO_SUPERMARKET}}`, `{{LOGO_ABB}}` e `{{DATA_GERACAO}}`.
2. Rodar com Python 3 (só biblioteca padrão, nada para instalar):
   `python .cursor/skills/supermarket-visual/scripts/embed_logos.py trabalho.html relatorios/nome_do_relatorio.html`
   O script embute as logos em base64, preenche a data e **falha** (código 1) se sobrar placeholder ou se a logo Adilson Baptista não estiver no fim da página.
3. **Salvar o resultado em HTML na pasta `relatorios/` na raiz do projeto** (criar se não existir), com nome em minúsculas e sem espaços, por exemplo `relatorios/barra_oeste_vs_rede.html`. O arquivo final é autossuficiente: abre direto no navegador com duplo clique, sem servidor. Dizer ao usuário o caminho do arquivo gerado. Apagar o arquivo de trabalho do passo 1 se ele ficou dentro do projeto.

Regras que o template já cumpre (manter ao editar): arquivo único e autossuficiente, sem imagens remotas, sem bibliotecas externas para gráficos simples, fontes só via Google Fonts com fallback, modo claro e escuro por variáveis, área segura em celular, tabelas largas rolando dentro do próprio container. Usar aspas e apóstrofo tipográficos no texto visível (“ ” ’).

## Princípios de design (aplicar sem enfeitar)

- Um elemento memorável por página: aqui é o cabeçalho verde com filete vermelho e o painel de indicadores. O resto fica quieto.
- Hierarquia: o que responde à pergunta do usuário vem primeiro (3 a 4 indicadores), tabelas e gráficos depois, observações no fim.
- Tabelas: coluna de texto à esquerda, números à direita, algarismos tabulares, variação colorida com sinal. Totais em `tfoot`.
- Gráficos simples em SVG inline com as cores da paleta; duas séries no máximo (verde e verde claro), vermelho só para valores negativos.
- Sem cartões idênticos repetidos, sem degradês decorativos, sem rótulos em caixa alta, sem entrada deslizante em cada seção. O único movimento é o descrito em "Movimento".
- Textos curtos: cada parágrafo diz o que olhar e por quê.

## Movimento (animação sutil com tema de supermercado)

O template já traz movimento, sempre **uma vez só**, curto (até ~1,2 s, exceto o carrinho do cabeçalho, 2,8 s) e ligado a um dado. Nada de movimento em repetição ou só para enfeitar. Manter estes elementos ao montar a página e remover os que o conteúdo não usar:

| Elemento | O que faz | Como usar |
|---|---|---|
| Contagem dos números | Os indicadores sobem de zero até o valor final, com desaceleração suave | `<span data-contar="14.4" data-casas="1" data-prefixo="R$ " data-sufixo=" mi">R$ 14,4 mi</span>`. O texto dentro do span já é o valor final (é o que aparece sem JavaScript e no modo sem animação) |
| Seta do chip | ▲ ou ▼ dá um único empurrão depois da contagem | classe `seta` dentro de `.chip.sobe` ou `.chip.desce` |
| Carrinho no cabeçalho | Um carrinho branco rola sobre o filete vermelho, de ponta a ponta, uma vez, com as rodas girando | `<svg class="trilho-carrinho">` já está no cabeçalho do template; é só decoração |
| Carrinho que empurra a barra | Cada barra do gráfico cresce e um carrinho vermelho a empurra até o valor, levando o rótulo junto | no gráfico, envolver o bloco com `data-anima`; cada barra tem um `<g class="viaja" style="--w:LARGURA px">` posicionado no fim da barra, com `<use href="#carrinho">` e o texto do valor. `--w` é a largura da barra em px; `--atraso` escalona as barras |
| Cesta medidora | Um carrinho cujo cesto enche até o percentual (participação no mix, atingimento de meta) | `<svg class="cesta" style="--p:21.1">`, com `--p` de 0 a 100, dentro de um `.indicador` com `data-anima` no painel |

Regras do movimento:
- O estado final é o estado estático: sem JavaScript, ou com a preferência do sistema "reduzir movimento", a página aparece pronta, sem animação e sem o carrinho do cabeçalho. Não quebrar isso: a animação só pode partir de um `from`.
- O bloco só anima quando entra na tela (`data-anima` + observador); o que já está visível ao abrir anima na abertura.
- A figura sempre carrega informação: o carrinho acompanha o valor da barra, o cesto indica o percentual. Não colocar figuras só como adorno no meio do conteúdo.
- Os valores contados devem ser exatamente os do texto final (o script restaura o texto original ao terminar).
- Na impressão tudo aparece no estado final e o carrinho do cabeçalho some.
- Se a página tiver muitos gráficos, usar o carrinho nas barras só no gráfico principal e deixar os demais estáticos (sem `data-anima`).

## Outros formatos

Quando pedirem Word, PowerPoint ou Excel em vez de página, usar as bibliotecas do projeto (por exemplo python-docx, python-pptx, openpyxl) e aplicar a mesma identidade, salvando o arquivo em `relatorios/`:

- **pptx:** faixa verde `#0A9C13` no topo dos slides com filete vermelho, texto `#0F2444`, logo Supermarket no slide de abertura, logo Adilson Baptista no rodapé do último slide e, se o modelo permitir, no rodapé de todos.
- **docx:** títulos em verde profundo, tabelas com cabeçalho verde e texto branco, logo Adilson Baptista no rodapé do documento ou ao fim do último parágrafo.
- **xlsx:** cabeçalho de tabela com preenchimento `#0A9C13` e fonte branca em negrito, variações negativas em `#DB3129`, logo Adilson Baptista inserida abaixo da última tabela da aba de resumo.

## Para análises de venda e margem

- Margem agregada é **ponderada pela venda** (soma de venda × margem ÷ soma da venda), nunca média simples de percentuais.
- Diferença de margem em **p.p.**, variação de venda em **%**.
- Sinalizar dado atípico (margem negativa, venda zero, associado que distorce a rede) em uma nota curta na seção afetada, com a cor vermelha do filete.

## Antes de entregar

- [ ] Só cores da paleta; contraste legível no modo claro e no escuro
- [ ] Logo Supermarket no cabeçalho
- [ ] Logo Adilson Baptista é o último bloco, sobre placa branca
- [ ] `embed_logos.py` rodou sem erro
- [ ] Movimento só em dados reais; sem animação a página aparece completa e correta
- [ ] Números em formato brasileiro, variações com sinal e seta
