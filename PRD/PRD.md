# PRD — Oferta de fim de semana e abastecimento

Aplicação local para ler a pasta da semana, recalcular a oferta de quinta a domingo e mostrar participação na venda da loja, resultado, ruptura e abastecimento por comprador.

A tela que vale é `visualizar/` (HTML, CSS e JavaScript). `template-mestre-main` foi só a referência visual. A marca é `LogoABB.jpeg`. A página abre nesta máquina, em `http://127.0.0.1:8765/visualizar/`, com a pasta do projeto servida na porta 8765. O repositório no GitHub guarda os arquivos; o link do GitHub não executa a capa.

Regra revista em 23/10/2026. Quando a pasta da semana tem `EstoqueInicio.txt` e `EstoqueFim.txt`, o saldo, a entrada e a saída saem só desses dois arquivos. A conta de cada linha é `QTDINICIAL` + `QTDENTRADA` − `QTDSAIDA` = `ESTOQUE`. Pedido e venda não entram nessa soma. Semana que ainda não tem esses dois arquivos continua na posição de seis colunas, e a entrada e a saída ficam em branco. A comparação de venda das duas semanas usa os arquivos diários e não usa ruptura. A leitura dos pares continua uma vez por período (seção 4.1). A oferta é `OfertasdoPeríodo.txt` e o denominador da participação é a soma dos quatro arquivos diários. Os números de venda da seção 10 permanecem. Os números de estoque publicados na seção 10 são o recálculo de 20/10. A seção 10.1 é a comparação 08–11 contra 01–04, não a substituição da prova.

## 1. Objetivo

Avaliar, a cada fim de semana, a qualidade do abastecimento dos produtos que estiveram em oferta e o efeito disso na loja.

O usuário troca os arquivos da semana, confere o período e aperta **Atualizar**. O aplicativo devolve a semana já cortada pelas regras deste documento.

Perguntas que a tela precisa responder sem planilha auxiliar:

- Quanto a oferta representou na venda total de cada loja.
- Qual comprador posicionou estoque antes de quinta.
- Onde o domingo zerou e onde a cobertura não segura o ritmo da venda.
- Onde havia saldo e o cliente não comprou.
- Onde o estoque cresceu durante a oferta.
- Quais itens cresceram sem entrada que explique.
- Se a falta ficou na loja ou na central.
- Quanto do abastecimento de cada comprador foi automático, manual, embalagem, matéria-prima ou uso e consumo.
- Nos itens com as duas sistemáticas na mesma loja, se o pedido manual foi feito antes ou depois do automático.

## 2. Janela e lojas

A janela oficial é quinta a domingo. A semana de prova é 01 a 04/10/2026.

Entram as 13 lojas de `Lojas.xlsx` e a central 70. A central não tem venda.

| Código | Loja |
|---|---|
| 1 | 01 Américas |
| 5 | 05 Gardênia Azul |
| 7 | 07 Abelardo |
| 8 | 08 Magarça |
| 9 | 09 Riachuelo |
| 10 | 10 Barra |
| 11 | 11 Via Parque |
| 12 | 12 Campo Grande |
| 13 | 13 Tanque |
| 14 | 14 Cascadura |
| 15 | 15 Pedra |
| 16 | 16 Terreirão |
| 17 | 17 P. Lucas |
| 70 | Central de distribuição |

Ficam de fora as empresas 2, 3, 4, 6, 18, 50, 60 e 61.

O código da loja é o prefixo numérico do nome em `Lojas.xlsx` e o mesmo número de `IDEMPRESA` e `NROEMPRESA`.

## 3. Oferta

A oferta da semana é o conjunto de produtos de `OfertasdoPeríodo.txt`. Nesta semana de prova são 2.665 produtos. Desses, 2.214 também aparecem nos arquivos diários de venda e 451 não venderam em loja nenhuma.

Os quatro arquivos `dd-mm-aaaa.txt` são a venda total das lojas no dia, não a oferta. `Lojas.xlsx` não entra na participação.

O cadastro descreve produto, comprador e a hierarquia `N1` a `N4`. `N1` é o departamento e `N2` é a seção. Na análise de venda e de abastecimento, o universo é o dos produtos de oferta, nas 13 lojas, tenha a loja vendido ou não.

Uma loja que tinha o produto e não vendeu entra. Esse corte separa:

- saldo positivo e venda zero: havia quantidade no sistema; a leitura fica entre exposição, preço e reconhecimento da oferta;
- saldo zero e venda zero: não havia peça; o limite é abastecimento;
- sem linha de estoque: a tela não conclui.

Não há arquivo de preço de concorrência nem de gôndola. A tela aponta o grupo. Ela não distingue exposição de preço.

## 4. Pasta da semana

Uma pasta fixa. As vendas levam a data no nome. Os demais nomes são estáveis.

| Arquivo | Papel |
|---|---|
| `OfertasdoPeríodo.txt` | Itens em oferta. Venda da oferta em `VLRTOTALVDA`. O nome do arquivo traz `í` |
| `dd-mm-aaaa.txt` (quatro arquivos) | Venda total da loja naquele dia. A data está no nome. Não é a oferta |
| `Lojas.xlsx` | Venda total de outro recorte. Não é o denominador da participação |
| `EstoqueInicio.txt` | Saldo inicial, com partida, entrada e saída na mesma linha |
| `EstoqueFim.txt` | Saldo final, com partida, entrada e saída na mesma linha |
| `Estoque DDmmmAA.txt` | Posição, quando a pasta ainda não tem os dois arquivos acima. A quantidade é `ESTOQUE_DTBASE` |
| `EstoqueDDmmm.txt` | Posição de sete colunas, sem espaço e sem ano no nome (`Estoque15Out.txt`). A quantidade é `EST_TOT`. Entra no lugar do arquivo de seis colunas |
| `Entradas.txt` | Entradas do período, em unidade de venda. Não entra na conta do estoque |
| `Dimproduto.txt` | Comprador e hierarquia `N1` a `N4` |
| `Embalagem.txt` | Padrão de compra e de transferência |
| `Auditoria de Cadastro.txt` | Fornecedor e código de barras |
| `Automatico.txt` | Pedidos da semana, a sistemática e a quantidade recebida por modalidade |

Formato dos TXT: separador `;`, decimal com vírgula, codificação Windows-1252. No estoque, a data-base vem em `DT_BASE`, no formato `aaaa-mm-dd-hh.mm.ss.ffffff`, e o nome do arquivo traz o dia: `Estoque 01Out26.txt` é 01/10/2026. Data `dd/mm/aaaa` nas entradas. Data `dd-mm-aaaa` no `Automatico.txt` e no arquivo de ofertas. Não há rodapé. A última linha é um registro.

`EstoqueInicio.txt` e `EstoqueFim.txt` têm sete colunas, nesta ordem: `NROEMPRESA`, `SEQPRODUTO`, `ULTDTAMOVIMENTO`, `QTDINICIAL`, `QTDENTRADA`, `QTDSAIDA`, `ESTOQUE`. A data é `dd/mm/aaaa`. Cada linha fecha: partida + entrada − saída = saldo. `ULTDTAMOVIMENTO` é o dia dessa linha e pode ser anterior à quinta. A leitura não descarta essas linhas.

O arquivo de seis colunas, quando é ele que a pasta traz, continua nesta ordem: `EMPRESA`, `NOME_EMPRESA`, `SEQPRODUTO`, `DESCCOMPLETA`, `ESTOQUE_DTBASE`, `DT_BASE`. A quantidade é `ESTOQUE_DTBASE`. Nesse caso a entrada e a saída não são inventadas.

O arquivo de posição de sete colunas (a partir de 26/10/2026) tem esta ordem: `EMPRESA`, `SEQPRODUTO`, `DESCRICAO`, `CUSTO_UN_BRUTO`, `EST_TOT`, `CUSTO_TOT_BRUTO`, `DATA_BASE`. O decimal é ponto e o milhar é vírgula (`1,368.00` é 1.368). A data é `aaaa-mm-dd-hh.mm.ss.ffffff`. O arquivo do primeiro dia traz o saldo inicial do período, com a venda desse dia já dentro. O arquivo do último dia traz o saldo final. A linha que não existe em um dos dois arquivos não vira saldo zero: o par fica sem posição. Na semana de 15 a 18/10 o arquivo do dia 18 não traz a central (70), e a tela da central avisa isso em vez de mostrar zeros.

O arquivo de ofertas traz `NROSEGMENTO`. Os quatro arquivos de venda do dia não têm coluna de segmento. `NRODOCTOS` é a quantidade de documentos, não o segmento.

Chaves:

- Loja: `IDEMPRESA` = `NROEMPRESA` = `ID_EMPRESA` = prefixo de `Lojas.xlsx`.
- Produto: `IDPRODUTO` = `SEQPRODUTO` = `ID_PRODUTO`.
- Comprador da análise: `Dimproduto.COMPRADOR`. A coluna `COMPRADOR` de `Automatico.txt` não identifica a pessoa.

Ciclo das pastas (a partir de 26/10/2026). A semana nova fica em `Entrada Novo Período`. A semana anterior fica na raiz do projeto e serve à comparação de venda. A semana que sai da raiz vai para `Semanas anteriores\<período>`, com os arquivos intactos e com `Dimproduto.txt` e `Lojas.xlsx` junto, para a pasta poder ser aberta por **Escolher pasta**. Nesta data: `Entrada Novo Período` tem 15 a 18/10, a raiz tem 08 a 11/10 e `Semanas anteriores\01-04 Out 2026` guarda a semana de prova. Os arquivos de 08 a 11/10 que haviam sido sobrescritos na pasta nova (`OfertasdoPeríodo.txt`, `Entradas.txt`, `Automatico.txt`, `Embalagem.txt`) foram recuperados do último commit, com o mesmo tamanho em bytes que tinham antes.

Na primeira execução o usuário indica a pasta. Nas seguintes, troca os arquivos e aperta **Atualizar**. O botão só calcula se a validação passar.

Validação obrigatória:

- quatro arquivos de venda, de quinta a domingo, em sequência;
- cabeçalhos esperados;
- `EstoqueInicio.txt` e `EstoqueFim.txt` juntos, com o cabeçalho das sete colunas; ou, na falta dos dois, um arquivo `Estoque DDmmmAA.txt` da quinta e outro do domingo, com o cabeçalho das seis colunas, ou um `EstoqueDDmmm.txt` de cada dia, com o cabeçalho das sete colunas de posição;
- `DTRECEBIMENTO` de `Automatico.txt` e `DTAENTRADA` de `Entradas.txt` dentro dos quatro dias;
- a pasta lida tem exatamente quatro arquivos de venda, de quinta a domingo. Duas semanas juntas na mesma pasta falham a validação;
- linhas idênticas repetidas em `Entradas.txt` entram uma vez, e a tela mostra quantas foram descartadas;
- empresas fora da lista são ignoradas, com a contagem visível na qualidade dos arquivos.

Arquivo obrigatório ausente ou período fora de quinta a domingo interrompe a atualização.

### 4.1 Leitura única do período

Os arquivos de estoque trazem o estoque da empresa inteira, todos os itens. O que este projeto analisa é o produto em oferta. Os quatro arquivos diários trazem a venda da loja inteira. Desses, o uso que permanece depois da primeira apuração é o total da empresa.

A cada período novo, os pares de venda e de estoque dos produtos destacados em `OfertasdoPeríodo.txt` são identificados uma vez. Par é loja + produto da oferta, nas 13 lojas.

Depois dessa apuração, mudança no projeto não atualiza de novo esses dados. Tela, regra ou código, no mesmo período, não relê o estoque inteiro da empresa e não refaz o cruzamento de todos os pares. O estoque que segue na análise é o dos pares já identificados.

O total de venda da empresa fica destacado à parte, como o cartão da capa já faz. Ele serve para comparar com o total de venda da oferta e ver a participação da oferta na venda da empresa. Somente isso. Nas mudanças seguintes do mesmo período, não se reabre a venda linha a linha de item que não está na oferta.

A leitura completa volta quando entra outro período: outros quatro dias, outro arquivo de ofertas, outros estoques. Nesse período novo, de novo uma vez só. O estoque da semana é `EstoqueInicio.txt` e `EstoqueFim.txt`. Sem esses dois arquivos, a posição fica em `Estoque DDmmmAA.txt` e a entrada e a saída ficam em branco.

Em 23/10/2026 a conta do saldo passou a usar `QTDINICIAL`, `QTDENTRADA`, `QTDSAIDA` e `ESTOQUE` desses dois arquivos. A participação continua sendo a venda da oferta dividida pela venda da empresa. Os números de venda da seção 10 permanecem. Os números de estoque publicados na seção 10 permanecem os de 20/10.

## 5. Regras de cálculo

### 5.1 Resultado da oferta

Duas colunas, sempre separadas. Nos arquivos elas não são a mesma conta.

- **Lucro bruto:** soma de `VLRLUCRO` dos itens de oferta que venderam nos arquivos diários.
- **Margem pelo custo bruto:** soma de `VLRVENDA − CTOBRUTOVDA` desses mesmos itens.

As duas contas permanecem separadas. Não são o mesmo número. Exemplo na loja 1, dia 01, Gatorade: venda 68,85, custo 63,30, diferença 5,55, `VLRLUCRO` −9,60. O arquivo de ofertas não traz lucro nem margem.

Identidades conferidas na venda:

- `VLRUNITARIOMED` = `VLRVENDA / QUANTIDADE`
- `MEDQTDDOCTO` = `QUANTIDADE / NRODOCTOS`
- `MEDVLRDOCTO` = `VLRVENDA / NRODOCTOS`
- `MRKUP` é o markup equivalente a `MRKDOWN` e fica vazio quando o custo é zero

`NRODOCTOS` não se soma para comparar com o ticket de `Lojas.xlsx`: o mesmo cupom entra em vários produtos.

### 5.2 Participação

Participação da oferta na loja = `VLRTOTALVDA` dos produtos de oferta naquela loja, dividido pela venda dos quatro arquivos diários da mesma loja.

A participação da rede usa as mesmas duas somas. Nesta semana de prova: R$ 6.816.656,97 / R$ 11.747.881,59 = 58,02%.

### 5.3 Saldo

O saldo vem de um lugar só. Com `EstoqueInicio.txt` e `EstoqueFim.txt` na pasta, a quantidade é a coluna `ESTOQUE`. A entrada é `QTDENTRADA` e a saída é `QTDSAIDA` da mesma linha. A conta de cada linha é:

`QTDINICIAL` + `QTDENTRADA` − `QTDSAIDA` = `ESTOQUE`.

Essa conta vale no arquivo inicial e no arquivo fim, cada um no seu `ULTDTAMOVIMENTO`. A entrada e a saída do arquivo inicial já estão dentro do estoque inicial. Não se somam de novo por cima desse saldo. A entrada e a saída do arquivo fim já estão dentro do estoque fim.

O intervalo é a partida do estoque fim menos o estoque inicial. Quando ele é zero, a linha final continua o saldo inicial. Quando ele não é zero, os dois arquivos não trazem as linhas dos dias do meio. Esse intervalo não vira entrada e não vira saída.

A quantidade recebida do pedido fica nas colunas automática e manual. A quantidade vendida fica na coluna da venda. Nenhuma das duas entra na soma do estoque.

Pasta sem `EstoqueInicio.txt` e `EstoqueFim.txt` usa a coluna `ESTOQUE_DTBASE`. A do arquivo do primeiro dia é o estoque inicial do período. A do arquivo do último dia é o estoque final. A venda do dia do saldo inicial já está dentro desse saldo. A conta soma só os dias posteriores a essa data, até a data do estoque final: entrada `QTDITEM`, menos a saída das operações 802, 902 e 903, menos a quantidade vendida. O resultado se compara ao estoque final. Diferença que não está nos arquivos não vira saída.

A variação do estoque é o estoque final menos o inicial, dividido pelo inicial. Percentual positivo: o saldo terminou maior. Percentual negativo: o saldo terminou menor. Não há corte inventado para “entrou demais” ou “entrou de menos”. A ordenação dessa coluna mostra os extremos.

Os números de estoque publicados na seção 10 permanecem os reapurados em 20/10. Esta conta vale para a semana aberta na capa.

### 5.4 Conta aberta e sem entrada

Conta aberta é o par loja + produto em que partida + entrada − saída não chega no `ESTOQUE` da própria linha, no arquivo inicial ou no arquivo fim.

Sem entrada é o par em que o estoque fim ficou maior que o inicial e a `QTDENTRADA` do estoque fim, em dia da semana e posterior ao movimento inicial, está zerada. O pedido não conta como essa entrada.

A entrada insuficiente fica no caso em que as duas linhas se encadeiam, o saldo subiu, houve `QTDENTRADA` na linha final e essa entrada foi menor do que o aumento.

Sem os dois arquivos de movimento, conta aberta e sem entrada ficam sem leitura. Não se completa com `Entradas.txt`.

### 5.5 Ruptura

- **Ruptura:** saldo de domingo igual a zero.
- **Saldo inválido:** saldo de domingo negativo. Lista própria, fora da ruptura.
- **Ruptura provável:** só onde houve venda. Cobertura = saldo de domingo dividido pela venda média diária dos quatro dias. O limite inicial é menos de 1 dia, e o usuário pode alterar. Não existe cobertura alvo nem lead time nos arquivos. O número é a velocidade desta semana.

### 5.6 Central 70

A central entra sem venda. A saída escrita no estoque da central é a `QTDSAIDA` do último movimento. Não há arquivo separado de transferência de saída. Quando os arquivos de estoque não trazem a central nos dois dias, a tela avisa e não calcula transferência nem compra.

Causa da falta na rede:

- loja zerada e central com saldo: falha de transferência;
- loja e central zeradas: falha de compra.

### 5.7 Sistemática de abastecimento

Fonte: `Automatico.txt`, coluna `COMPRADOR`. Ela só classifica a linha.

| Valor na coluna | Classe | Uso no percentual |
|---|---|---|
| `ABAST.AUT` | Automático | Revenda |
| Nome de pessoa, inclusive `MODELO` | Manual | Revenda |
| `EMBALAGEM` | Embalagem | Fora da revenda |
| `MATERIAPRIMA` | Matéria-prima | Fora da revenda |
| `USOCONSUMO` | Uso e consumo | Fora da revenda |

O percentual automático e manual de cada comprador usa só as linhas de revenda. Embalagem, matéria-prima e uso e consumo aparecem ao lado, para separar o que foi mercadoria de venda do que foi insumo.

O comprador é `Dimproduto.COMPRADOR`, pela chave do produto. O primeiro nome gravado na linha do pedido não atribui a responsabilidade. Nesta semana de prova, 1.064 linhas manuais trazem um primeiro nome diferente do comprador do cadastro.

O percentual fiel é o de linhas do pedido. O mesmo produto pode ter linha automática e linha manual.

`ABAST.AUT` nesta semana ocorre só em transferência.

### 5.8 Pedido manual antes ou depois do automático

A comparação usa `DTAHORINCLUSAO` no par loja + produto. Os dois pedidos precisam ser da mesma loja.

Três resultados:

- manual em dia anterior ao primeiro automático;
- mesmo dia, com a hora mostrando se o manual foi antes ou depois;
- manual em dia posterior ao automático.

Produto nas duas sistemáticas em lojas diferentes não entra nessa comparação. Ele entra no percentual de linhas, cada linha na sua loja.

### 5.9 Quantidade recebida por modalidade

A coluna exibida de entrada automática e a de entrada manual somam `QTDRECEBIDA` de `Automatico.txt` (posição 18), por loja e produto. A modalidade usa a mesma coluna `COMPRADOR` da seção 5.7. Uma modalidade conta para o par quando a quantidade recebida passa de 0,05.

A conta do saldo, a conta aberta e a sem entrada usam `EstoqueInicio.txt` e `EstoqueFim.txt`. A quantidade recebida do pedido não entra nessa conta.

Um par pode ter `QTDRECEBIDA` maior que zero e `QTDENTRADA` zerada no estoque. O pedido não substitui a entrada escrita no estoque.

### 5.10 Nome da oferta e segmento

Cada oferta digitada é um `SEQPROMOCAO`. O texto `PROMOCAO` é livre. Nesta semana há 213 códigos e 155 nomes. 32 nomes reúnem códigos diferentes. 70 códigos foram lançados em mais de um `NROSEGMENTO`. A performance de uma ação não se apura pelo nome.

O mesmo produto entra em mais de um segmento. A soma dos itens por segmento passa da quantidade de produtos de oferta.

O número na capa continua sendo o `NROSEGMENTO`. O nome do canal fica ao lado, sem trocar o código: 1 Varejo, 2 iFood, 3 Delivery, 4 Superclube, 5 Cafeteria, 6 Restaurante, 7 99 Food e 100 Rock in Rio. Itens, valor e participação continuam os do arquivo.

A venda gravada na ação é `QTDTOTALVDA` e `VLRTOTALVDA` daquela linha. Uma ação pode estar com essas colunas vazias enquanto o mesmo par loja + produto vendeu em outro código, com outro preço. Exemplo: `LÂMINA FDS SUPERCLUBE 02-10 À 05-10-2026` (código 61755) tem venda vazia nas 926 linhas; os mesmos pares venderam na lâmina comum (código 61753).

### 5.11 Venda entre duas semanas

A memória do navegador continua só com os códigos e o período. A progressão de venda não sai dessa memória. Ela sai dos quatro arquivos diários de cada semana.

A venda do produto é `VLRVENDA` dos arquivos diários, somada nas 13 lojas. Não é `VLRTOTALVDA`, porque um código de oferta pode estar vazio enquanto o produto vendeu em outro. A variação percentual só entra quando a semana anterior teve venda. Sem venda na anterior, o produto fica no grupo que passou a vender, sem percentual.

Entre os produtos que repetiram na oferta, a capa separa quatro grupos: vendeu mais, vendeu menos, sem venda nas duas semanas e passou a vender. Entre os que estrearam, a capa lista os que não venderam nesta semana. O estreante não estava na oferta da semana anterior, então essa semana não entra como venda. Sem venda nas duas semanas é só de quem repetiu, e fica para a RP. Ruptura não entra nesta comparação.

A participação por loja continua sendo `VLRTOTALVDA` da oferta dividido pela venda da loja. A capa mostra as duas semanas lado a lado quando a anterior ainda está na raiz.

## 6. O que a tela mostra

A navegação começa na **Capa**. Cada tabela filtra por loja, comprador, departamento (`N1`), seção (`N2`) e produto, e exporta CSV. O clique no cabeçalho ordena. Tabela que passa da largura tem tela cheia.

**Capa.** Seis cartões: venda da oferta, venda total do período, participação, produtos de oferta, lucro bruto e margem pelo custo bruto. Os dois últimos têm texto explicando que as contas são separadas.

Abaixo, quatro colunas com a contagem da semana: Oferta, Venda, Estoque e Abastecimento. Cada linha mostra a quantidade e, em tipo menor, o percentual sobre o total daquela conta. Em Oferta, sem venda em loja nenhuma usa os produtos. Em Venda e Estoque, o percentual usa os pares loja e produto. Em Abastecimento, usa os pares que receberam automático, manual ou os dois. O ponto de interrogação de cada cartão explica o critério. O clique na linha abre os itens. Produtos de oferta e pares loja e produto não abrem lista.

No mesmo bloco, o lançamento das ofertas (códigos, nomes e exemplos de nome repetido) e a tabela por `NROSEGMENTO`: itens em oferta, valor vendido e participação sobre o total vendido em oferta.

A memória de até quatro semanas fica no navegador, na chave `fds-oferta-semanas`, só com os códigos dos produtos e o período. Trocar os arquivos da pasta não apaga essa memória no mesmo navegador e no mesmo endereço. Outro navegador, ou limpar os dados do site, apaga. Com uma semana só, a capa avisa que a comparação aparece na semana seguinte.

Quando a semana lida está em `Entrada Novo Período` e a anterior continua na raiz, a capa acrescenta a venda entre as duas semanas, pela seção 5.11: cartões dos grupos, as maiores altas e quedas dos repetidos, as maiores vendas dos estreantes e a participação de cada loja nas duas semanas. O número do cartão fica centralizado. O percentual, em tipo menor, é sobre os produtos que repetiram; no cartão dos estreantes, é sobre os que estrearam. O clique no cartão abre a lista. Essa leitura não usa estoque nem ruptura.

A tabela de percentuais tem uma linha por comprador, loja, produto, departamento ou seção. As colunas são automático, manual, dois abastecimentos, ruptura provável, ruptura, excesso de estoque, sem venda com saldo e sem entrada. O número em vermelho é o numerador. Automático e manual, nas linhas de comprador e de loja, dividem as linhas de revenda. Em produto, departamento e seção, dividem os pares que receberam alguma modalidade. Dois abastecimentos é a parcela dos produtos recebidos que chegaram no automático e no manual, pela `QTDRECEBIDA`.

**Lojas.** As 13 lojas com participação, ruptura, irregular e sem venda.

**Compradores.** Venda da oferta e a sistemática. O comprador é o do cadastro.

**Ruptura.** Saldo zero, saldo negativo e cobertura abaixo do limite.

**Sem venda.** Os três grupos: saldo positivo, saldo zero e sem linha de estoque.

**Abastecimento irregular.** Saldo de domingo maior que o de quinta, com a conta de apoio e o sell-through.

**Exceção.** Sem entrada, e entrada insuficiente para o aumento.

**Datas das duas sistemáticas.** Pares loja + produto com automático e manual, ordenados pela relação entre as datas de inclusão.

**Central.** Saldo da 70 e o cruzamento com a loja zerada.

**Qualidade dos arquivos.** Linhas lidas, período, lojas ignoradas, produtos sem estoque, saldo negativo, linhas repetidas de entrada e valores de sistemática não reconhecidos.

**Resumo executivo para os sócios.** Página à parte, em `relatorios/resumo_executivo_oferta_fds.html`, no padrão da skill `supermarket-visual`. Abre com duplo clique, sem servidor. Segue início, meio e fim: a semana de 08 a 11/10 como régua (com 01 a 04/10 numa tabela das três semanas), o que mudou em 15 a 18/10 (oferta, participação por loja, produtos que repetiram, estreantes, compradores, estoque lido pelos arquivos de posição) e o que decidir. Regenerada em 26/10/2026 para 15 a 18 contra 08 a 11. Inclui o percentual de abastecimento automático e manual por comprador e por departamento, nas duas semanas e com a variação em pontos percentuais. O percentual é o de linhas de pedido de revenda (seção 5.7): automático ÷ (automático + manual). Percentual automático maior indica menos intervenção manual. Todos os números saem do mesmo cálculo da capa. A página não traz meta nem corte que não esteja nos arquivos, e lista os limites da leitura. Ruptura não entra na comparação entre as semanas.

## 7. Marca e template

A tela em uso é `visualizar/index.html`, `visualizar/app.js`, `visualizar/engine.js` e `visualizar/styles.css`. A marca é `../LogoABB.jpeg`.

`template-mestre-main` permanece na pasta como referência visual. A capa não é o aplicativo Next.js.

## 8. Arquitetura

O aplicativo roda nesta máquina. Na pasta do projeto:

```powershell
python -m http.server 8765
```

O endereço é `http://127.0.0.1:8765/visualizar/`. Ele só responde com essa janela aberta. `file://` e o link do GitHub não executam a capa: a leitura pede a listagem da pasta pai, que o servidor local devolve e o GitHub não devolve. O botão **Atualizar** relê os arquivos dentro do programa já aberto. Para pegar uma alteração de código, a página precisa ser aberta de novo (Ctrl+F5). `engine.js` entra com um sufixo de versão no import, para o navegador não reutilizar o cálculo antigo.

A pasta nova da semana substitui, na raiz do projeto, os quatro dias, o arquivo de ofertas, os dois estoques `Estoque DDmmmAA.txt`, as entradas, o automático, o cadastro e o `Lojas.xlsx`. Outra pasta entra pelo botão **Escolher pasta**. A pasta lida precisa ter só os quatro dias daquela semana, com o estoque da quinta e o do domingo no nome.

Volume de referência: o arquivo de ofertas tem cerca de 120 mil linhas. O cruzamento principal é loja + produto da oferta. Estoque e venda fora desses pares entram uma vez por período, pela seção 4.1: da venda da empresa fica o total, e do estoque ficam os pares da oferta. Mudança posterior no mesmo período não relê o arquivo inteiro.

Não há login nesta versão. O repositório `https://github.com/adilsonposia-glitch/EstoquesFDSGBO` está público e contém os TXT e o `Lojas.xlsx`. O GitHub Pages não está ligado.

## 9. Fora desta versão

- OTIF e pedido atendido no prazo e na quantidade. Não há arquivo de pedido previsto contra o recebimento além do que `Automatico.txt` já traz como pedido incluído e recebido.
- Preço de concorrente e exposição de gôndola.
- Estoque mínimo, cobertura alvo e lead time. A cobertura exibida é calculada sobre a venda da própria semana.
- Valor de estoque e GMROI. Os arquivos de estoque trazem quantidade.
- Empresas 2, 3, 4, 6, 18, 50, 60 e 61.
- Ticket de `Lojas.xlsx` como base de participação.

## 10. Prova da primeira atualização

Os números abaixo valem só para 01 a 04/10/2026, com a oferta lida de `OfertasdoPeríodo.txt`. O código não os deixa fixos. A capa está certa quando os reproduz.

A prova gravada em 16/10 tratava os quatro arquivos diários como a oferta (9.927 produtos) e usava `Lojas.xlsx` no denominador (participação 30,67%). Essa prova não vale mais.

Venda da oferta: R$ 6.816.656,97. Venda total do período, soma dos quatro arquivos diários: R$ 11.747.881,59. Participação da rede: 58,02%. Lucro bruto: R$ 994.565,31. Margem pelo custo bruto: R$ 1.648.408,56. Produtos de oferta: 2.665. Esses números de venda não mudaram em 20/10/2026. Os números de estoque abaixo foram reapurados com `ESTOQUE_DTBASE` de `Estoque 01Out26.txt` e `Estoque 04Out26.txt`.

| Loja | Oferta | Venda do período | Participação |
|---|---:|---:|---:|
| 01 Américas | 497.752,82 | 1.014.566,32 | 49,06% |
| 05 Gardênia Azul | 435.765,80 | 705.224,38 | 61,79% |
| 07 Abelardo | 478.236,65 | 937.067,61 | 51,04% |
| 08 Magarça | 526.850,85 | 841.339,22 | 62,62% |
| 09 Riachuelo | 487.311,19 | 748.416,29 | 65,11% |
| 10 Barra | 557.415,10 | 1.354.061,35 | 41,17% |
| 11 Via Parque | 281.884,47 | 650.991,88 | 43,30% |
| 12 Campo Grande | 519.028,69 | 784.771,10 | 66,14% |
| 13 Tanque | 645.369,07 | 1.110.874,69 | 58,10% |
| 14 Cascadura | 551.170,05 | 851.631,83 | 64,72% |
| 15 Pedra | 1.089.059,55 | 1.569.953,26 | 69,37% |
| 16 Terreirão | 343.090,38 | 569.468,88 | 60,25% |
| 17 P. Lucas | 403.722,35 | 609.514,78 | 66,24% |

Pares loja + produto: 34.645 (2.665 × 13). Com venda: 20.655. Sem venda: 13.990. Sem venda em loja nenhuma: 451 produtos. Sem venda com saldo: 1.339. Excesso de estoque: 479. Ruptura (saldo zero): 3.132. Ruptura provável: 131. Sem entrada: 28.

Dois abastecimentos, pela quantidade recebida: 61 pares. Só automático: 1.062. Só manual: 3.715.

André Malheiros, no universo da oferta, em linhas de revenda: automático 111 e manual 676 (14,1% e 85,9%). Pares 2.262. Dois abastecimentos 14. Os 174 produtos dele não têm linha no estoque de 04/10/2026, então irregular, ruptura provável e ruptura ficam sem posição.

Lançamento: 213 códigos e 155 nomes. 32 nomes em mais de um código. 70 códigos em mais de um segmento. Exemplos: PROMOCAO em 15 códigos, FLV em 9, GUIA DIG PG04 em 4, OFERTA INTERNA em 4.

| Segmento | Itens em oferta | Valor vendido | Part. sobre a oferta |
|---|---:|---:|---:|
| 1 | 2.646 | 6.564.504,24 | 96,30% |
| 2 | 2.591 | 238.266,46 | 3,50% |
| 3 | 2.590 | 7.098,54 | 0,10% |
| 4 | 354 | 839,00 | 0,01% |
| 7 | 346 | 5.948,73 | 0,09% |
| Total da oferta | 2.665 | 6.816.656,97 | 100% |

A soma dos itens por segmento é 8.527, acima de 2.665, porque o mesmo produto entra em mais de um segmento. O total da linha de baixo é o universo da oferta, não a soma da coluna.

### 10.1 Comparação 08–11 contra 01–04

A capa de 22/10 lê `Entrada Novo Período` (08 a 11/10/2026) e compara com a raiz (01 a 04/10/2026). A oferta da segunda semana tem 1.130 produtos e `VLRTOTALVDA` de 5.141.303,80. A venda das lojas nessa semana é 10.853.693,96. Participação 47,37%. Na primeira semana eram 2.665 produtos, 6.816.656,97 e 58,02%.

800 produtos repetiram. 330 estrearam. 1.865 saíram da oferta. A venda diária dos 800 saiu de 5.241.333,19 para 4.873.378,11, diferença de −367.955,08. Desses, 287 venderam mais, 411 venderam menos, 92 não venderam nas duas semanas e 10 passaram a vender.

Os 330 estreantes venderam 459.242,83 nesta semana. 70 não venderam. Eles não estavam na oferta de 01 a 04, então a semana anterior não entra como venda. O percentual é 21,21% dos estreantes.

A lista comercial de quem repetiu e não vendeu nas duas semanas continua em 92 produtos, sem ruptura. O estreante sem venda é outra lista: 70 produtos.

As maiores altas, em valor, entre os repetidos: 47829 acém bovino porcionado, 56328 arroz Tio Bruno 5 kg, 88164 picanha bovina congelada maturatta, 79464 papel higiênico Comfy, 1910 leite condensado Moça 395 g. As maiores quedas: 12269 arroz Dona Elza 5 kg, 10789 acém bovino em pedaço, 41370 café União 500 g, 10918 filé de costela bovina maturatta, 3261 pão de forma Seven Boys 450 g. O acém porcionado subiu no mesmo comprador em que o acém em pedaço caiu.

A participação caiu nas 13 lojas. As maiores quedas em pontos: Pedra 69,4% para 52,0% (−17,4), Via Parque 43,3% para 27,9% (−15,4), Barra 41,2% para 26,4% (−14,7). A maior queda de valor da oferta foi a Pedra.

Esses números não substituem a seção 10. A prova de 01 a 04 permanece.

### 10.2 Comparação 15–18 contra 08–11

A capa de 26/10 lê `Entrada Novo Período` (15 a 18/10/2026) e compara com a raiz (08 a 11/10/2026). A semana de 08 a 11/10 reproduz os números da seção 10.1 depois da mudança de pastas (1.130 produtos, R$ 5.141.303,80, 47,37%, 10.135 pares com as duas linhas, ruptura 560, sem entrada 713). A semana de 01 a 04/10, arquivada, reproduz a seção 10 (2.665 produtos, R$ 6.816.656,97, 58,02%, ruptura 3.132, provável 131, sem entrada 28).

Semana de 15 a 18/10. Oferta de 2.545 produtos e `VLRTOTALVDA` de 5.734.977,39 (+11,55% sobre a semana anterior). Venda total das lojas 10.373.687,14 (−4,42%). Participação 55,28% (47,37% antes). A participação subiu nas 13 lojas. As maiores altas em pontos: Barra 26,4% para 40,6% (+14,2), Abelardo 39,2% para 52,1% (+12,9), depois Tanque 49,4% para 58,3% (+8,9) e Cascadura 53,1% para 62,0% (+8,9). A menor alta foi a do Terreirão, 55,0% para 56,1% (+1,1).

852 produtos repetiram, 1.693 estrearam e 278 saíram da oferta. A venda diária dos 852 repetidos foi de 4.822.586,56 para 4.579.801,38, diferença de −242.785,18 (−5,03%). Desses, 290 venderam mais, 444 venderam menos, 112 não venderam nas duas semanas e 5 passaram a vender. Os 1.693 estreantes venderam 1.252.832,80, e 355 não venderam. Nenhum dos números desta comparação usa ruptura.

Abastecimento: 28,31% das linhas de revenda da oferta foram automáticas (1.442 automáticas e 3.652 manuais), contra 19,08% em 08 a 11/10 (537 e 2.278).

Estoque, pela posição de `EST_TOT`. Dos 33.085 pares loja + produto da oferta, 10.239 têm as duas linhas (dia 15 e dia 18), 12.814 têm a linha do dia 18 e 13.966 a do dia 15. Entre os 10.239: o saldo terminou menor em 9.172, maior em 1.053 e igual em 14. A conta pela movimentação (saldo do dia 15 + entrada − saída − venda de 16, 17 e 18) fecha em 8.410 pares e fica aberta em 1.829: em 1.698 o saldo do arquivo ficou abaixo da conta e em 131 ficou acima. A diferença não é atribuída a causa nenhuma, porque não há arquivo de transferência de saída nem de quebra. Pares com venda e sem linha no dia 18: 5.837 de 18.616. Pares só no dia 15 com saldo positivo: 3.462 (na oferta, nas 13 lojas). A linha ausente não é tratada como saldo zero. A tela da central não calcula, porque o dia 18 não traz a empresa 70. Ruptura pelo saldo do dia 18: 112. Saldo negativo: 509. Ruptura provável: 310. Sem entrada: 57. Esses valores de estoque cobrem só os pares com linha e não são comparáveis com os de 08 a 11/10, que vêm do arquivo de movimento.

Arroz 12269, loja 12: 437 + 2 − 0 − 77 = 362, e o arquivo do dia 18 traz 359. A diferença de 3 fica aberta.

## 11. Ordem de construção

1. A capa de `visualizar/` já calcula a semana de prova e reproduz a seção 10.
2. A semana seguinte entra no lugar dos arquivos atuais, por **Escolher pasta**, ou pela pasta `Entrada Novo Período` quando ela tiver exatamente quatro dias. A presença do produto nas semanas anteriores usa a memória do navegador, no máximo quatro períodos. A venda entre as duas semanas, quando a anterior ainda está na raiz, segue a seção 5.11.
3. Nome de oferta e o código do segmento permanecem como foram digitados. A capa não rebatiza `NROSEGMENTO`. O nome do canal fica ao lado do número, pelo gabarito da seção 5.10.

## 12. Pronto quando

O usuário abre `http://127.0.0.1:8765/visualizar/`, espera a leitura terminar e responde, na capa, as perguntas da seção 1. A semana de 01 a 04/10/2026 reproduz a seção 10, aberta pela pasta `Semanas anteriores\01-04 Out 2026`.
