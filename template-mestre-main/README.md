# Nova UI — Template Mestre

Sistema de design profissional em Next.js com componentes reutilizáveis, paletas de cores, dark mode, gráficos e painel de personalização em tempo real.

## Funcionalidades

- **Showcase de componentes** — botões, inputs, tabelas, dialogs, calendário, tabs e mais
- **Paletas de cores** — 6 temas (Esmeralda, Azul, Violeta, Laranja, Rosa, Slate)
- **Gráficos** — visualizações com Recharts
- **CRUD de exemplo** — layout pronto para listagem e formulários
- **Preset de aparência** — tema, raio, sombra, densidade, zoom, sidebar e conjunto de ícones
- **Dark mode** — suporte a light, dark e system
- **Persistência preparada** — camada pronta para salvar presets no banco via `DATABASE_URL`

## Stack

| Tecnologia | Versão |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5.7 |
| Tailwind CSS | 4 |
| shadcn/ui | base-nova |
| Recharts | 3 |
| Motion | 12 |

## Pré-requisitos

- Node.js 20+
- npm, pnpm ou yarn

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd template-mestre

# Instale as dependências (escolha um gerenciador)
npm install
# ou
pnpm install
```

## Desenvolvimento

```bash
npm run dev
# ou
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Executa o ESLint |

## Estrutura do projeto

```
template-mestre/
├── app/                  # App Router (layout, página, server actions)
├── components/
│   ├── layout/           # Shell da aplicação
│   ├── pages/            # Views do showcase (componentes, cores, gráficos, CRUD)
│   ├── providers/        # Contextos de tema, paleta, densidade, etc.
│   └── ui/               # Componentes reutilizáveis (shadcn)
├── hooks/                # Hooks customizados
├── lib/                  # Utilitários, presets, paletas, navegação
└── public/               # Assets estáticos
```

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Opcional — habilita persistência de presets no banco de dados
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
```

Sem `DATABASE_URL`, os presets são mantidos apenas no `localStorage` do navegador.

### Esquema sugerido (Supabase / PostgreSQL)

```sql
create table user_presets (
  user_id    text primary key,
  preset     jsonb not null,
  updated_at timestamptz not null default now()
);
```

A persistência é gerenciada em `lib/preset-store.ts` e exposta via Server Actions em `app/actions/preset.ts`.

## Personalização

O preset de aparência (`AppPreset`) controla:

- **theme** — `light` | `dark` | `system`
- **palette** — paleta de cores ativa
- **radius** — arredondamento dos componentes
- **shadow** — estilo de sombra
- **density** — espaçamento compacto ou confortável
- **zoom** — escala da interface
- **sidebar** — visibilidade e estilo da barra lateral
- **iconSet** — conjunto de ícones (Lucide, Hugeicons)

Defina novos valores em `lib/preset.ts` e nos arquivos de configuração em `lib/`.

## Deploy

O projeto é compatível com [Vercel](https://vercel.com). Configure `DATABASE_URL` nas variáveis de ambiente do projeto antes do deploy.

```bash
npm run build
```

## Licença

Projeto privado.
