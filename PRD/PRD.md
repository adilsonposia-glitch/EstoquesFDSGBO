# PRD — Oferta de fim de semana e abastecimento

Aplicação local para ler a pasta da semana, recalcular a oferta de quinta a domingo e mostrar participação na venda da loja, resultado, ruptura e abastecimento por comprador.

A tela que vale é `visualizar/` (HTML, CSS e JavaScript). `template-mestre-main` foi só a referência visual. A marca é `LogoABB.jpeg`. A página abre nesta máquina, em `http://127.0.0.1:8765/visualizar/`, com a pasta do projeto servida na porta 8765. O repositório no GitHub guarda os arquivos; o link do GitHub não executa a capa.

Regra revista em 17/10/2026. A oferta deixou de ser a venda dos quatro arquivos diários. O denominador da participação deixou de ser `Lojas.xlsx`. Os números da seção 10 são os desta revisão.

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
| `EstoqueInicio.txt` | Posição de quinta. `QTDINICIAL` é o saldo antes dos movimentos do dia |
| `EstoqueFim.txt` | Posição de domingo. `ESTOQUE` é o saldo ao fim da janela |
| `Entradas.txt` | Entradas do período, em unidade de venda. Continua na conta de saldo |
| `Dimproduto.txt` | Comprador e hierarquia `N1` a `N4` |
| `Embalagem.txt` | Padrão de compra e de transferência |
| `Auditoria de Cadastro.txt` | Fornecedor e código de barras |
| `Automatico.txt` | Pedidos da semana, a sistemática e a quantidade recebida por modalidade |

Formato dos TXT: separador `;`, decimal com vírgula, codificação Windows-1252. Data `dd/mm/aaaa` nos estoques e nas entradas. Data `dd-mm-aaaa` no `Automatico.txt` e no arquivo de ofertas. Não há rodapé. A última linha é um registro.

O arquivo de ofertas traz `NROSEGMENTO`. Os quatro arquivos de venda do dia não têm coluna de segmento. `NRODOCTOS` é a quantidade de documentos, não o segmento.

Chaves:

- Loja: `IDEMPRESA` = `NROEMPRESA` = `ID_EMPRESA` = prefixo de `Lojas.xlsx`.
- Produto: `IDPRODUTO` = `SEQPRODUTO` = `ID_PRODUTO`.
- Comprador da análise: `Dimproduto.COMPRADOR`. A coluna `COMPRADOR` de `Automatico.txt` não identifica a pessoa.

Na primeira execução o usuário indica a pasta. Nas seguintes, troca os arquivos e aperta **Atualizar**. O botão só calcula se a validação passar.

Validação obrigatória:

- quatro arquivos de venda, de quinta a domingo, em sequência;
- cabeçalhos esperados;
- `EstoqueInicio` com `ULTDTAMOVIMENTO` único na quinta;
- `EstoqueFim` com a maior data no domingo;
- `DTRECEBIMENTO` de `Automatico.txt` e `DTAENTRADA` de `Entradas.txt` dentro dos quatro dias;
- a pasta lida tem exatamente quatro arquivos de venda, de quinta a domingo. Duas semanas juntas na mesma pasta falham a validação;
- linhas idênticas repetidas em `Entradas.txt` entram uma vez, e a tela mostra quantas foram descartadas;
- empresas fora da lista são ignoradas, com a contagem visível na qualidade dos arquivos.

Arquivo obrigatório ausente ou período fora de quinta a domingo interrompe a atualização.

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

Conta de apoio, em quantidade:

`QTDINICIAL` de quinta + `QTDITEM` das entradas de quinta a domingo − quantidade vendida nos quatro dias.

O resultado se compara a `ESTOQUE` de `EstoqueFim`.

Sell-through da oferta = quantidade vendida dividida por (saldo de quinta + entradas).

`QTDSAIDA` do estoque é maior que a venda em parte dos itens. A saída de estoque inclui movimento que a venda não mostra. A conta oficial de abastecimento usa a quantidade vendida, não `QTDSAIDA`.

Nas operações 802, 902 e 903 de `Entradas.txt`, `QTDITEM` vem zerado. Essa quantidade não entra na conta.

### 5.4 Abastecimento irregular

Irregular é todo par loja + produto da oferta em que o saldo de domingo é maior que o saldo de quinta, com ou sem venda.

A exceção fica em relatório separado, em dois grupos:

- o saldo subiu e não houve entrada;
- o saldo subiu e a entrada existiu, mas foi menor do que o aumento.

### 5.5 Ruptura

- **Ruptura:** saldo de domingo igual a zero.
- **Saldo inválido:** saldo de domingo negativo. Lista própria, fora da ruptura.
- **Ruptura provável:** só onde houve venda. Cobertura = saldo de domingo dividido pela venda média diária dos quatro dias. O limite inicial é menos de 1 dia, e o usuário pode alterar. Não existe cobertura alvo nem lead time nos arquivos. O número é a velocidade desta semana.

### 5.6 Central 70

A central entra sem venda. A queda de saldo além das entradas é a saída para as lojas, que não tem arquivo próprio.

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

A conta de saldo, o irregular e a exceção continuam em `Entradas.txt`, coluna `QTDITEM`. Trocar a coluna exibida não altera essa conta.

`Entradas.txt` pode estar zerado num par que tem `QTDRECEBIDA` maior que zero. Exemplo na loja 5, queijo prato peça kg (11029): automático 21,31 e manual 101,49, com `QTDITEM` zerado.

### 5.10 Nome da oferta e segmento

Cada oferta digitada é um `SEQPROMOCAO`. O texto `PROMOCAO` é livre. Nesta semana há 213 códigos e 155 nomes. 32 nomes reúnem códigos diferentes. 70 códigos foram lançados em mais de um `NROSEGMENTO`. A performance de uma ação não se apura pelo nome.

O mesmo produto entra em mais de um segmento. A soma dos itens por segmento passa da quantidade de produtos de oferta.

A venda gravada na ação é `QTDTOTALVDA` e `VLRTOTALVDA` daquela linha. Uma ação pode estar com essas colunas vazias enquanto o mesmo par loja + produto vendeu em outro código, com outro preço. Exemplo: `LÂMINA FDS SUPERCLUBE 02-10 À 05-10-2026` (código 61755) tem venda vazia nas 926 linhas; os mesmos pares venderam na lâmina comum (código 61753).

## 6. O que a tela mostra

A navegação começa na **Capa**. Cada tabela filtra por loja, comprador, departamento (`N1`), seção (`N2`) e produto, e exporta CSV. O clique no cabeçalho ordena. Tabela que passa da largura tem tela cheia.

**Capa.** Seis cartões: venda da oferta, venda total do período, participação, produtos de oferta, lucro bruto e margem pelo custo bruto. Os dois últimos têm texto explicando que as contas são separadas.

Abaixo, quatro colunas com a contagem da semana: Oferta, Venda, Estoque e Abastecimento. O clique na linha abre os itens. Produtos de oferta e pares loja e produto não abrem lista.

No mesmo bloco, o lançamento das ofertas (códigos, nomes e exemplos de nome repetido) e a tabela por `NROSEGMENTO`: itens em oferta, valor vendido e participação sobre o total vendido em oferta.

A memória de até quatro semanas fica no navegador, na chave `fds-oferta-semanas`, só com os códigos dos produtos e o período. Trocar os arquivos da pasta não apaga essa memória no mesmo navegador e no mesmo endereço. Outro navegador, ou limpar os dados do site, apaga. Com uma semana só, a capa avisa que a comparação aparece na semana seguinte.

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

## 7. Marca e template

A tela em uso é `visualizar/index.html`, `visualizar/app.js`, `visualizar/engine.js` e `visualizar/styles.css`. A marca é `../LogoABB.jpeg`.

`template-mestre-main` permanece na pasta como referência visual. A capa não é o aplicativo Next.js.

## 8. Arquitetura

O aplicativo roda nesta máquina. Na pasta do projeto:

```powershell
python -m http.server 8765
```

O endereço é `http://127.0.0.1:8765/visualizar/`. Ele só responde com essa janela aberta. `file://` e o link do GitHub não executam a capa: a leitura pede a listagem da pasta pai, que o servidor local devolve e o GitHub não devolve. O botão **Atualizar** relê os arquivos dentro do programa já aberto. Para pegar uma alteração de código, a página precisa ser aberta de novo (Ctrl+F5). `engine.js` entra com um sufixo de versão no import, para o navegador não reutilizar o cálculo antigo.

A pasta nova da semana substitui, na raiz do projeto, os quatro dias, o arquivo de ofertas, os estoques, as entradas, o automático, o cadastro e o `Lojas.xlsx`. Outra pasta entra pelo botão **Escolher pasta**. A pasta lida precisa ter só os quatro dias daquela semana.

Volume de referência: o arquivo de ofertas tem cerca de 120 mil linhas. O cruzamento principal é loja + produto da oferta.

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

Venda da oferta: R$ 6.816.656,97. Venda total do período, soma dos quatro arquivos diários: R$ 11.747.881,59. Participação da rede: 58,02%. Lucro bruto: R$ 994.565,31. Margem pelo custo bruto: R$ 1.648.408,56. Produtos de oferta: 2.665.

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

Pares loja + produto: 34.645 (2.665 × 13). Com venda: 20.655. Sem venda: 13.990. Sem venda em loja nenhuma: 451 produtos. Sem venda com saldo: 3.506. Excesso de estoque: 2.066. Ruptura (saldo zero): 1.169. Ruptura provável: 513. Sem entrada: 81.

Dois abastecimentos, pela quantidade recebida: 61 pares. Só automático: 1.062. Só manual: 3.715.

André Malheiros, no universo da oferta, em linhas de revenda: automático 111 e manual 676 (14,1% e 85,9%). Pares 2.262. Irregular 223. Ruptura provável 77. Ruptura 35. Dois abastecimentos 14.

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

## 11. Ordem de construção

1. A capa de `visualizar/` já calcula a semana de prova e reproduz a seção 10.
2. A semana seguinte entra no lugar dos arquivos atuais, ou por **Escolher pasta**, com exatamente quatro dias. A comparação com as semanas anteriores usa a memória do navegador, no máximo quatro períodos.
3. Nome de oferta e segmento permanecem como foram digitados. A capa mostra a falta de padrão. Ela não rebatiza `NROSEGMENTO`.

## 12. Pronto quando

O usuário abre `http://127.0.0.1:8765/visualizar/`, espera a leitura terminar e responde, na capa, as perguntas da seção 1. A semana de 01 a 04/10/2026 reproduz a seção 10.
