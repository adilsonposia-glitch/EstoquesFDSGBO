# PRD — Oferta de fim de semana e abastecimento

Aplicação local para ler a pasta da semana, recalcular a oferta de quinta a domingo e mostrar participação na venda da loja, resultado, ruptura e abastecimento por comprador.

A interface usa o template `template-mestre-main`. A marca é `LogoABB.jpeg`. Os arquivos comerciais permanecem na máquina.

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

A oferta da semana é o conjunto de produtos que aparecem nas vendas de quinta a domingo. Nesta semana de prova são 9.927 produtos.

O cadastro inteiro descreve produto, comprador, marca e hierarquia. Na análise de venda e de abastecimento da oferta, o universo é esse conjunto, nas 13 lojas, tenha a loja vendido ou não.

Uma loja que tinha o produto e não vendeu entra. Esse corte separa:

- saldo positivo e venda zero: havia quantidade no sistema; a leitura fica entre exposição, preço e reconhecimento da oferta;
- saldo zero e venda zero: não havia peça; o limite é abastecimento;
- sem linha de estoque: a tela não conclui.

Não há arquivo de preço de concorrência nem de gôndola. A tela aponta o grupo. Ela não distingue exposição de preço.

## 4. Pasta da semana

Uma pasta fixa. As vendas levam a data no nome. Os demais nomes são estáveis.

| Arquivo | Papel |
|---|---|
| `dd-mm-aaaa.txt` (quatro arquivos) | Venda da oferta. A data está no nome do arquivo |
| `Lojas.xlsx` | Venda total de cada loja no mesmo período, para a participação |
| `EstoqueInicio.txt` | Posição de quinta. `QTDINICIAL` é o saldo antes dos movimentos do dia |
| `EstoqueFim.txt` | Posição de domingo. `ESTOQUE` é o saldo ao fim da janela |
| `Entradas.txt` | Entradas do período, em unidade de venda |
| `Dimproduto.txt` | Comprador, marca e hierarquia `N1` a `N4` |
| `Embalagem.txt` | Padrão de compra e de transferência |
| `Auditoria de Cadastro.txt` | Fornecedor e código de barras |
| `Automatico.txt` | Pedidos da semana e a sistemática de abastecimento |

Formato dos TXT: separador `;`, decimal com vírgula, codificação Windows-1252, data `dd/mm/aaaa` nos estoques e nas entradas, e `dd-mm-aaaa` no `Automatico.txt`. Não há rodapé. A última linha é um registro.

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
- `Lojas.xlsx` com as 13 lojas, tratado como a venda total daquela semana;
- linhas idênticas repetidas em `Entradas.txt` entram uma vez, e a tela mostra quantas foram descartadas;
- empresas fora da lista são ignoradas, com a contagem visível na qualidade dos arquivos.

Arquivo obrigatório ausente ou período fora de quinta a domingo interrompe a atualização.

## 5. Regras de cálculo

### 5.1 Resultado da oferta

Duas colunas, sempre separadas. Nos arquivos elas não são a mesma conta.

- **Lucro bruto:** soma de `VLRLUCRO`.
- **Margem pelo custo bruto:** soma de `VLRVENDA − CTOBRUTOVDA`. Essa diferença corresponde a `MRKDOWN`.

Identidades conferidas na venda:

- `VLRUNITARIOMED` = `VLRVENDA / QUANTIDADE`
- `MEDQTDDOCTO` = `QUANTIDADE / NRODOCTOS`
- `MEDVLRDOCTO` = `VLRVENDA / NRODOCTOS`
- `MRKUP` é o markup equivalente a `MRKDOWN` e fica vazio quando o custo é zero

`NRODOCTOS` não se soma para comparar com o ticket de `Lojas.xlsx`: o mesmo cupom entra em vários produtos.

### 5.2 Participação

Participação da oferta na loja = venda dos quatro arquivos daquela loja dividida pelo valor de `Lojas.xlsx`.

A participação da rede usa a soma das 13 lojas.

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

## 6. O que a tela mostra

A navegação do template deixa o showcase e passa a ter estas visões. Cada tabela filtra por loja, comprador, hierarquia e produto, e exporta CSV.

**Rede.** Venda da oferta, participação, lucro bruto e margem pelo custo bruto.

**Lojas.** As 13 lojas com participação, ruptura, irregular e sem venda.

**Compradores.** Venda, as duas colunas de resultado, percentual posicionado na quinta, ruptura no domingo, ruptura provável, irregular, exceção e venda zero com saldo. Na mesma visão, a sistemática: percentual automático e manual sobre a revenda, e as quantidades de embalagem, matéria-prima e uso e consumo.

**Ruptura.** Saldo zero, saldo negativo e cobertura abaixo do limite.

**Sem venda.** Os três grupos: saldo positivo, saldo zero e sem linha de estoque.

**Abastecimento irregular.** Saldo de domingo maior que o de quinta, com a conta de apoio e o sell-through.

**Exceção.** Sem entrada, e entrada insuficiente para o aumento.

**Datas das duas sistemáticas.** Pares loja + produto com automático e manual, ordenados pela relação entre as datas de inclusão.

**Central.** Saldo da 70 e o cruzamento com a loja zerada.

**Qualidade dos arquivos.** Linhas lidas, período, lojas ignoradas, produtos sem estoque, saldo negativo, linhas repetidas de entrada e valores de sistemática não reconhecidos.

## 7. Marca e template

O aplicativo é construído sobre `template-mestre-main` (Next.js, React, TypeScript, Tailwind).

A marca está em `LogoABB.jpeg`, na raiz do projeto: JPEG de 748×229 pixels, faixa horizontal com o monograma AB, o nome Adilson Baptista e a linha "Inteligência de negócio", em azul-marinho sobre fundo branco.

Na implementação, a imagem vai para `template-mestre-main/public` e substitui o ícone genérico e o texto "Nova UI" em `components/layout/app-shell.tsx`, nos dois pontos de marca (barra aberta e barra recolhida). Na barra aberta entra a faixa, com altura próxima de 40 pixels. Na barra recolhida entra só o monograma, porque a faixa não cabe no quadrado de 36 pixels. O fundo branco do JPEG permanece visível na barra escura. O título em `app/layout.tsx` deixa de ser "Nova UI — Design System".

## 8. Arquitetura

O aplicativo roda na máquina do usuário. A pasta da semana é lida no **Atualizar**. O cálculo pesado não trava a tela. O último resultado fica guardado e só é refeito quando um arquivo muda.

Volume de referência desta semana: auditoria com cerca de 121 mil linhas, estoque com cerca de 161 mil linhas por arquivo, vendas com cerca de 164 mil linhas no total. O cruzamento principal é loja + produto.

Não há servidor remoto de dados. Não há login nesta versão.

## 9. Fora desta versão

- OTIF e pedido atendido no prazo e na quantidade. Não há arquivo de pedido previsto contra o recebimento além do que `Automatico.txt` já traz como pedido incluído e recebido.
- Preço de concorrente e exposição de gôndola.
- Estoque mínimo, cobertura alvo e lead time. A cobertura exibida é calculada sobre a venda da própria semana.
- Valor de estoque e GMROI. Os arquivos de estoque trazem quantidade.
- Empresas 2, 3, 4, 6, 18, 50, 60 e 61.
- Ticket de `Lojas.xlsx` como base de participação.

## 10. Prova da primeira atualização

Os números abaixo valem só para 01 a 04/10/2026. O código não os deixa fixos. A primeira atualização está certa quando os reproduz.

Venda da oferta: R$ 11.747.881,59. Venda total das 13 lojas: R$ 38.302.213,30. Participação da rede: 30,67%.

| Loja | Participação |
|---|---:|
| 01 Américas | 28,88% |
| 05 Gardênia Azul | 30,52% |
| 07 Abelardo | 29,31% |
| 08 Magarça | 31,22% |
| 09 Riachuelo | 29,24% |
| 10 Barra | 28,34% |
| 11 Via Parque | 28,07% |
| 12 Campo Grande | 31,08% |
| 13 Tanque | 31,33% |
| 14 Cascadura | 33,13% |
| 15 Pedra | 35,33% |
| 16 Terreirão | 28,07% |
| 17 P. Lucas | 33,56% |

Pares loja + produto da oferta: 129.051 (9.927 produtos × 13 lojas). Com venda: 64.261.

| Situação | Pares |
|---|---:|
| Vendeu e fechou com saldo positivo | 58.551 |
| Vendeu e fechou zerado | 935 |
| Vendeu e fechou negativo | 1.386 |
| Vendeu e não tem linha de estoque | 3.389 |
| Não vendeu e fechou com saldo positivo | 19.090 |
| Não vendeu e fechou zerado | 4.260 |
| Não vendeu e fechou negativo | 325 |
| Não vendeu e não tem linha de estoque | 41.115 |

A conta de saldo fecha em 55.771 dos pares que venderam e têm posição de estoque.

Abastecimento irregular (domingo maior que quinta): 5.519 pares, sendo 4.649 com venda e 870 sem venda. Em 5.180 a entrada do período foi maior que a venda.

Exceção: 332 pares sem entrada (141 com venda e 191 sem venda) e 7 com entrada menor do que o aumento.

`Automatico.txt`: 16.069 linhas, todas com produto no cadastro. Revenda: 4.017 automáticas e 11.797 manuais (25,4% automático). Embalagem: 115, todas de Andre Malheiros. Uso e consumo: 32, todas de Andre Malheiros. Matéria-prima: 108, todas de Berta Barbosa. Revenda do Andre: 13,7% automático em 1.410 linhas. Revenda da Berta: 0% automático em 1.900 linhas.

| Comprador | Automático | Manual | Embalagem | Matéria-prima | Uso e consumo |
|---|---:|---:|---:|---:|---:|
| Armando Fernandes | 941 | 2.454 | 0 | 0 | 0 |
| Rafael Almeida | 1.258 | 1.356 | 0 | 0 | 0 |
| Pedro Alves | 292 | 2.103 | 0 | 0 | 0 |
| Renato Diogo | 744 | 1.490 | 0 | 0 | 0 |
| Berta Barbosa | 0 | 1.900 | 0 | 108 | 0 |
| Evair Silva | 583 | 1.274 | 0 | 0 | 0 |
| Andre Malheiros | 193 | 1.217 | 115 | 0 | 32 |
| Eduardo Motta | 0 | 3 | 0 | 0 | 0 |
| Modelo | 6 | 0 | 0 | 0 | 0 |

Duas sistemáticas: 534 produtos. Em 467, as lojas são diferentes. Na mesma loja, 102 pares: 79 com o manual em dia anterior ao automático e 23 no mesmo dia, com o manual mais tarde. Nenhum par com o manual em dia posterior.

## 11. Ordem de construção

1. Fixar a pasta da semana e a validação do período, ainda sem indicador.
2. Cruzar produto e loja e publicar a qualidade dos arquivos, até repetir 9.927 produtos de oferta, 13 lojas e a central.
3. Calcular participação, as duas colunas de resultado, saldo, irregular, exceção, ruptura e a sistemática, e bater a seção 10.
4. Trocar a navegação do template pelas visões da seção 6 e colocar a marca.
5. Ligar **Atualizar** ao ciclo ler, validar, calcular e guardar.
6. Repetir com a semana seguinte e conferir se período, participação e exceção acompanham os arquivos novos.

## 12. Pronto quando

O usuário troca a pasta, aperta **Atualizar** uma vez e responde, na própria tela, as perguntas da seção 1. A semana de 01 a 04/10/2026 reproduz a seção 10.
