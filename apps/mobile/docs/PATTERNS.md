# Padrões do Fluvi (React Native + Expo)

Este documento define a organização do código, as convenções de nomes e os padrões de cada camada do Fluvi. Toda contribuição, humana ou feita por IA, segue estas regras. Quando uma regra não cobrir um caso, discuta antes de criar um padrão novo e atualize este arquivo.

## Princípio central: local-first

O Fluvi funciona inteiro sem internet. **A interface sempre lê e grava no SQLite local**, nunca espera a API. A API (NestJS) é o destino da sincronização: recebe o que mudou no aparelho e devolve o que mudou em outros lugares (outro aparelho, a versão web).

Consequências práticas:

- Registrar água ou peso é instantâneo e nunca depende de rede.
- Nenhuma feature de dados (água, peso, metas) conhece a API. Só o motor de sync, em `src/sync/`, conversa com o servidor sobre esses dados.
- A API só é chamada direto pelas features que são online por natureza: autenticação e conta.

## Stack

- **Expo** (SDK 58) com **Expo Router**, development build (`expo-dev-client`). O app não depende do Expo Go.
- **TypeScript** em modo strict, alias `@/` apontando para `src/`.
- **NativeWind v4** (Tailwind CSS 3) para estilos.
- **expo-sqlite + Drizzle ORM** para os dados do usuário, com migrations versionadas pelo `drizzle-kit`.
- **Zustand** para preferências locais, persistido em **MMKV**.
- **expo-secure-store** só para tokens de autenticação.
- **axios** como cliente HTTP.
- **TanStack Query** só para as features online (auth, conta).
- **Zod** para validação.
- **react-native-google-mobile-ads** para anúncios.
- **Biome** para lint e formatação. **Bun** como gerenciador de pacotes. Dependências nativas são instaladas com `bunx expo install`.

## Estrutura de pastas

```
src/
├── app/                    # rotas do Expo Router (finas, sem lógica)
├── features/
│   └── <feature>/
│       ├── data/           # queries e comandos no SQLite (features de dados)
│       ├── api/            # chamadas HTTP e DTOs (só features online)
│       ├── hooks/          # hooks da feature
│       ├── components/     # componentes usados só nesta feature
│       ├── screens/        # telas completas, importadas pelas rotas
│       ├── schemas.ts      # schemas zod da feature
│       └── types.ts        # tipos de domínio da feature
├── db/
│   ├── client.ts           # instância do banco e do Drizzle
│   ├── schema.ts           # tabelas
│   ├── columns.ts          # colunas comuns (id, timestamps de sync)
│   └── migrations/         # geradas pelo drizzle-kit, nunca editadas à mão
├── sync/                   # motor de sincronização com a API
├── components/
│   └── ui/                 # primitivos de UI: Button, Text, Input, Card...
├── hooks/                  # hooks compartilhados entre features
├── lib/                    # api-client, query-client, secure-storage, kv-storage, ads
├── stores/                 # stores Zustand
├── theme/                  # tokens e tema claro/escuro
├── utils/                  # funções puras
└── constants/              # constantes globais
```

Features previstas: `hydration` (registro de água), `weight` (registro de peso), `goals` (metas), `history` (gráficos), `onboarding`, `settings`, `auth` e, depois do MVP, `reminders`.

### Regras da estrutura

1. **Rotas não têm lógica.** Um arquivo em `src/app/` só importa e renderiza a screen da feature.

   ```tsx
   // src/app/(tabs)/hoje.tsx
   import { TodayScreen } from '@/features/hydration/screens/today-screen';

   export default TodayScreen;
   ```

2. **Uma feature não importa o interior de outra.** Se duas features precisam do mesmo componente, hook ou função, ele sobe para `src/components/`, `src/hooks/` ou `src/utils/`. A exceção é a feature `history`, que pode importar as queries de `data/` das features que ela agrega.
3. **`utils`, `lib` e `hooks` não se misturam:**
   - `utils/` guarda funções puras, sem React, sem IO e sem estado. Exemplo: `to-local-date.ts`, `format-weight.ts`.
   - `lib/` guarda integrações configuradas e com efeito colateral. Exemplo: a instância do axios, o wrapper do MMKV, a configuração de anúncios.
   - `hooks/` guarda hooks React compartilhados. Exemplo: `use-app-state.ts`.
4. **Sem barrel files.** Importe direto do arquivo com o alias `@/`.
5. **Componente começa na feature.** Ele só sobe para `src/components/` quando uma segunda feature precisar dele.

## Convenções de nomes

| O quê | Convenção | Exemplo |
|---|---|---|
| Arquivos e pastas | kebab-case | `water-log-item.tsx` |
| Componentes | PascalCase, export nomeado | `export function WaterLogItem()` |
| Props de componente | `<Componente>Props` | `WaterLogItemProps` |
| Hooks | `use` + camelCase | `useTodayWaterLogs` em `use-today-water-logs.ts` |
| Funções e variáveis | camelCase | `dailyTotalMl`, `formatWeight` |
| Booleanos | prefixo `is`, `has`, `can`, `should` | `isGoalReached`, `hasCompletedOnboarding` |
| Props de evento | `on` + ação | `onAdd`, `onPressDelete` |
| Handlers internos | `handle` + ação | `handleAdd` |
| Tipos e interfaces | PascalCase, sem prefixo `I` | `WaterLog`, `WeightEntry` |
| Tipos que espelham a API | sufixo `Dto` | `SessionDto` |
| Tabelas no banco | snake_case, plural | `water_logs` |
| Tabelas no Drizzle | camelCase, plural | `waterLogs` |
| Colunas | snake_case no banco, camelCase no TS | `amount_ml` / `amountMl` |
| Queries reativas (leitura) | `select` + recurso | `selectWaterLogsByDate` |
| Comandos (escrita) | verbo + recurso | `addWaterLog`, `deleteWeightEntry` |
| Funções de API | verbo + recurso | `signIn`, `getProfile` |
| Schemas zod | camelCase + `Schema` | `weightEntrySchema` |
| Tipos inferidos do zod | PascalCase + `Input`/`Values` | `WeightEntryValues` |
| Stores Zustand | `use` + nome + `Store` | `useSettingsStore` em `settings-store.ts` |
| Query keys (TanStack) | factory por feature, sufixo `Keys` | `profileKeys.detail()` |
| Constantes de módulo | SCREAMING_SNAKE_CASE | `DEFAULT_DAILY_GOAL_ML` |
| Screens | PascalCase + `Screen` | `TodayScreen` |

### Unidades no nome

Todo número que representa uma medida carrega a unidade no nome: `amountMl`, `weightGrams`, `dailyGoalMl`. Nunca `amount` ou `weight` soltos.

### Idioma

- **Código em inglês:** identificadores, nomes de arquivo, tipos, tabelas, comentários técnicos.
- **Interface em português:** todo texto que o usuário vê.
- **Rotas em português.** Os segmentos de rota aparecem em deep links (`hoje.tsx`, `historico.tsx`, `peso.tsx`). É a única exceção à regra dos arquivos em inglês.
- **A API também fala inglês.** Como o backend é nosso, os campos da API seguem os mesmos nomes do app.

### Exports

- Use export nomeado em todo o código.
- Export default só nos arquivos de rota em `src/app/`, porque o Expo Router exige.

## Banco de dados (SQLite + Drizzle)

### Regras de modelagem

Estas regras existem para que o sync com a API funcione sem retrabalho. Toda tabela de dados do usuário segue todas elas.

1. **ID em UUID gerado no aparelho** (`expo-crypto`), nunca autoincremento. O registro nasce offline e precisa ter o mesmo ID no servidor. O UUID é **sempre minúsculo** (`randomUUID()` já gera assim; nunca transforme a caixa). A API rejeita UUID com maiúsculas (`MALFORMED_RECORD`), porque o Postgres o devolveria minúsculo no pull e o SQLite, que compara texto com diferença de caixa, criaria uma duplicata.
2. **Colunas de sync obrigatórias:** `createdAt`, `updatedAt`, `deletedAt` e `syncedAt`, vindas de `src/db/columns.ts`.
3. **Soft delete.** Apagar é preencher `deletedAt` e atualizar `updatedAt`. Uma linha removida de verdade nunca chegaria ao servidor. Toda query de leitura filtra `deletedAt IS NULL`.
4. **Medidas em inteiros.** Água em ml, peso em gramas. Nada de float no banco; a conversão para "72,4 kg" acontece só na formatação.
5. **Toda escrita atualiza `updatedAt`.** É ele que decide o que precisa subir e quem vence um conflito.
6. **Registros diários guardam `localDate`** (`'2026-11-06'`) além do timestamp. O "dia" do usuário é o dia no relógio dele no momento do registro, e agrupar por timestamp quebra com fuso e horário de verão. Os agrupamentos por dia sempre usam `localDate`.

```ts
// src/db/columns.ts
import { integer, text } from 'drizzle-orm/sqlite-core';

export const syncColumns = {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
};

// src/db/schema.ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { syncColumns } from './columns';

export const waterLogs = sqliteTable(
  'water_logs',
  {
    ...syncColumns,
    amountMl: integer('amount_ml').notNull(),
    loggedAt: integer('logged_at', { mode: 'timestamp_ms' }).notNull(),
    localDate: text('local_date').notNull(),
  },
  (table) => [index('water_logs_local_date_idx').on(table.localDate)],
);
```

### Meta diária fica no banco

A meta muda com o tempo, e os gráficos precisam saber qual era a meta de cada dia. Por isso ela é uma tabela com vigência (`goals`, com `dailyGoalMl` e `effectiveFrom` em `localDate`), sincronizada como qualquer outro dado.

- **Uma meta por dia.** Mudar a meta num dia que ainda não tem meta cria um registro novo com `effectiveFrom` igual a hoje. Mudar a meta num dia que já tem meta **atualiza o registro daquele dia** (`dailyGoalMl` e `updatedAt`), sem criar outro. Os dias anteriores nunca mudam.
- **Peso segue a mesma regra:** registrar peso num dia que já tem peso atualiza o registro do dia.
- A API garante isso com um índice único parcial (um registro ativo por dia). Se dois aparelhos offline criarem registros para o mesmo dia, o sync resolve: vale o `updatedAt` mais recente, e o outro volta do pull como excluído. As regras de cálculo (`goalForDate`, `weightChange` em `@fluvi/domain`) ainda toleram duplicatas como defesa.

### Configurações sincronizadas (`user_settings`)

As preferências que precisam existir em outro aparelho ficam na tabela `user_settings` do SQLite e são sincronizadas: nível de atividade (`activityLevel`), **copos rápidos** (`quickAmountsMl`, sempre 3 valores) e o registro de peso com seu consentimento (`weightTrackingEnabled`, `weightConsentAt`, `weightConsentPolicyVersion`, `weightConsentUpdatedAt`).

- É uma **linha única**: sem `id` e sem `deletedAt` (o servidor identifica pelo usuário da sessão). Tem `createdAt`, `updatedAt` e `syncedAt`, como as outras tabelas. É a exceção às regras 1 e 3 acima.
- **Consentimento é um grupo à parte.** Ligar ou desligar o registro de peso é a mesma ação que dar ou revogar o consentimento: toda escrita em `weightTrackingEnabled`, `weightConsentAt` ou `weightConsentPolicyVersion` atualiza os três juntos e preenche `weightConsentUpdatedAt`. O merge desse grupo usa `weightConsentUpdatedAt`, não o `updatedAt` da linha, para que um aparelho desatualizado nunca reative um consentimento revogado. O resto da linha segue last-write-wins pelo `updatedAt`.
- **Nível de atividade na fronteira.** Uma versão futura pode trazer um nível novo. Ao ler do SQLite e ao aplicar o pull, valide com `isActivityLevel` (`@fluvi/domain`). Se o nível for desconhecido, guarde o valor como veio e **mantenha a meta atual sem recalcular**: nunca chame `suggestGoalMl` com ele, porque ela lança `RangeError`.

### Cliente e migrations

```ts
// src/db/client.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('fluvi.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
```

- `enableChangeListener` é obrigatório: é ele que faz o `useLiveQuery` reagir às mudanças.
- Migrations são geradas com `drizzle-kit generate` e aplicadas no layout raiz com `useMigrations`. O app não renderiza as telas antes de as migrations terminarem.
- Nunca edite uma migration já publicada. Mudança de schema é sempre uma migration nova, porque o app vai estar instalado em aparelhos com versões antigas do banco.

### Camada `data/` das features

- Componentes e hooks **nunca** usam o `db` direto. Só os arquivos em `features/<feature>/data/` importam o `db`.
- `data/` exporta dois tipos de função: **queries** (`select...`), que devolvem o query builder sem executar, para leitura reativa, e **comandos** (verbo + recurso), que escrevem.
- Comandos não sabem que o sync existe. O motor de sync percebe as mudanças sozinho (veja "Sincronização").

```ts
// src/features/hydration/data/water-log.queries.ts
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { waterLogs } from '@/db/schema';

export function selectWaterLogsByDate(localDate: string) {
  return db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.localDate, localDate), isNull(waterLogs.deletedAt)))
    .orderBy(desc(waterLogs.loggedAt));
}

// src/features/hydration/data/water-log.commands.ts
import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { db } from '@/db/client';
import { waterLogs } from '@/db/schema';
import { toLocalDate } from '@/utils/to-local-date';

export async function addWaterLog(amountMl: number, loggedAt = new Date()) {
  const now = new Date();

  await db.insert(waterLogs).values({
    id: randomUUID(),
    amountMl,
    loggedAt,
    localDate: toLocalDate(loggedAt),
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteWaterLog(id: string) {
  const now = new Date();

  await db.update(waterLogs).set({ deletedAt: now, updatedAt: now }).where(eq(waterLogs.id, id));
}
```

### Leitura reativa

Hooks da feature envolvem as queries com `useLiveQuery`. A tela atualiza sozinha quando um registro entra, sem invalidação manual.

```ts
// src/features/hydration/hooks/use-today-water-logs.ts
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { toLocalDate } from '@/utils/to-local-date';
import { selectWaterLogsByDate } from '../data/water-log.queries';

export function useTodayWaterLogs() {
  const today = toLocalDate(new Date());

  return useLiveQuery(selectWaterLogsByDate(today), [today]);
}
```

### Tipos de domínio

Os tipos das features derivam do schema (`typeof waterLogs.$inferSelect`) em `types.ts`. Componentes não leem nem dependem das colunas de sync (`syncedAt`, `deletedAt`).

## Sincronização

O motor de sync vive em `src/sync/` e é o único código que envia ou recebe dados de água, peso e metas pela rede.

- **Push:** envia em lote, via `POST /v1/sync/push`, todo registro com `syncedAt` nulo ou menor que `updatedAt`. Ao confirmar, preenche `syncedAt` com o `updatedAt` que foi enviado. A resposta traz um resultado por registro (`applied`, `ignored` ou `rejected`) e **não traz cursor**.
- **Pull:** pede `GET /v1/sync/pull?since=<cursor>`, repetindo enquanto `hasMore`. O cursor (`nextCursor`) é devolvido pelo servidor e guardado no MMKV. Nunca use o relógio do aparelho como cursor. A resposta do pull é validada com os schemas lenientes de `@fluvi/contracts` (só estrutura e tipos): valores fora das faixas ou enums atuais chegam como vieram, e o app os tolera (veja `isActivityLevel` em "Configurações sincronizadas").
- **Ordem:** push primeiro, depois pull a partir do cursor que o app já tinha.
- **Primeiro login:** é a exceção à ordem. O app faz **pull antes do push**. Os registros de água, peso e metas criados sem conta sobem normalmente no push seguinte. As configurações locais (`user_settings`) criadas antes do login só sobem se a conta ainda não tiver configurações (o pull trouxe `userSettings: null`); se tiver, as do servidor substituem as locais.
- **Conflito:** last-write-wins pelo `updatedAt`. Um registro recebido só sobrescreve o local se for mais novo.
- **Idempotência:** os endpoints aceitam o mesmo lote mais de uma vez sem duplicar nada, porque os IDs são UUIDs do cliente.
- **Gatilhos:** app volta ao primeiro plano, conexão volta, e um debounce de alguns segundos depois de qualquer mudança no banco (via listener de mudanças do expo-sqlite).
- **Uma execução por vez.** Se um sync for disparado com outro em andamento, ele é agendado para depois, nunca roda em paralelo.
- Sync só roda com sessão ativa. Falha de sync nunca bloqueia nem mostra erro intrusivo; o dado continua salvo localmente e sobe na próxima tentativa.

## Camada de API (features online)

### Cliente HTTP

Existe uma única instância do axios, em `src/lib/api-client.ts`, usada pelo motor de sync e pelas features online. Ela:

- monta a URL base a partir de `EXPO_PUBLIC_API_URL`;
- injeta o token de acesso lido da store de sessão com `getState()`, fora do React;
- renova o token com o refresh token quando recebe 401 e, se a renovação falhar, encerra a sessão;
- normaliza todo erro num `ApiError` tipado.

### Funções de API

- Ficam em `features/<feature>/api/` (para auth e conta) ou em `src/sync/` (para o sync).
- Componentes e hooks **nunca** chamam o axios direto.
- O DTO reflete o que a API devolve. Como a API usa os mesmos nomes do app, o mapper só existe quando o formato realmente difere do tipo de domínio (datas em string ISO, por exemplo).

### TanStack Query

- Usado só nas features online. Dados de água, peso e metas nunca passam por ele.
- Cada feature tem uma factory de query keys. Componentes não chamam `useQuery` direto.
- O `QueryClient` fica em `src/lib/query-client.ts`, com o `focusManager` ligado ao `AppState` e o `onlineManager` ligado ao estado da rede.

## Estado do cliente (Zustand)

- **Sessão** (`session-store.ts`): tokens persistidos no SecureStore, pelo wrapper de `src/lib/secure-storage.ts`.
- **Preferências locais** (`settings-store.ts`): onboarding concluído, tema, configuração de lembretes. Persistidas no MMKV pelo wrapper de `src/lib/kv-storage.ts`. Os copos rápidos não ficam aqui: fazem parte do `user_settings` sincronizado (veja "Configurações sincronizadas").
- Histórico e meta nunca ficam em store. Se o dado precisa existir na versão web ou em outro aparelho, ele mora no banco e é sincronizado.
- Estado local de tela fica em `useState` no próprio componente.
- Nos componentes, selecione só o que precisa: `useSettingsStore((state) => state.theme)`.

## Formulários e validação

- Os formulários do Fluvi são pequenos (um valor numérico, poucos campos). Use `useState` com um schema Zod da feature para validar.
- Se aparecer um formulário com muitos campos (cadastro, perfil), adote React Hook Form com `zodResolver` naquela feature.
- Mensagens de erro de validação em português, definidas no schema.
- O usuário digita com vírgula ("72,4"); a conversão para inteiro (gramas, ml) acontece num util antes de chegar ao comando.

## Componentes e estilos

### Componentes

- Um componente por arquivo. Subcomponentes pequenos e privados podem ficar no mesmo arquivo, sem export.
- Props tipadas com `type`, declaradas logo acima do componente.
- Componentes de UI recebem dados prontos por props. Leitura de dados acontece em hooks, chamados pela screen ou por um componente de feature.
- Elementos tocáveis usam `Pressable` com área de toque mínima de 44px. Botões só com ícone têm `accessibilityLabel`.
- Ações de registro (adicionar copo, salvar peso) dão retorno imediato: animação ou háptico (`expo-haptics`), nunca um spinner.

### Primitivos de UI

- Ficam em `src/components/ui/`, no espírito do shadcn: pequenos, composáveis e com variantes.
- Variantes são declaradas com `tailwind-variants` (ou `cva`), nunca com condicionais de className espalhadas.
- Telas usam os primitivos (`Button`, `Text`, `Input`) em vez de recriar estilos.

### NativeWind e tema

- Configuração do Tailwind 3: `tailwind.config.js`, `global.css` com as diretivas `@tailwind`, preset do NativeWind no Babel e `withNativeWind` no Metro.
- **Cores sempre por token semântico** (`bg-primary`, `text-foreground`, `border-border`), nunca hex direto em className.
- Os tokens são variáveis CSS declaradas no config, no formato `primary: 'rgb(var(--primary) / <alpha-value>)'`, com valores para tema claro e escuro definidos em `src/theme/`.
- As cores da identidade do Fluvi só entram pelos tokens.

## Anúncios

- Toda exibição de anúncio passa por `src/lib/ads.ts` e pelo componente `AdSlot`. Nenhuma tela importa a biblioteca de anúncios direto.
- Anúncios são poucos, pequenos e pontuais. Eles nunca aparecem no fluxo de registro (adicionar água, salvar peso) nem interrompem uma ação do usuário.
- Posições e frequência são decididas em `lib/ads.ts`, num lugar só.

## Utils

- Uma função por propósito, pura e testável.
- Nome de arquivo descreve a ação: `to-local-date.ts`, `format-weight.ts`, `parse-decimal-input.ts`.
- Se a função precisa de React, ela é um hook. Se precisa de IO ou de uma instância configurada, ela vai para `lib/`.

```ts
// src/utils/to-local-date.ts
export function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
```

## Imports

- Sempre com o alias `@/` para importar de outra pasta de `src/`.
- Imports relativos (`../`) só dentro da mesma feature.
- Imports de tipos com `import type`.

## Validação automática

Estas regras são verificadas pelo Biome no `bun run lint`:

- `useFilenamingConvention`: arquivos em kebab-case.
- `useNamingConvention`: convenções de nomes de identificadores.
- `noDefaultExport`: proibido fora de `src/app/`.

As regras que o lint não consegue verificar (fronteira entre features, `db` usado só em `data/`, API de dados usada só em `sync/`, modelagem de tabelas) são responsabilidade do code review e estão resumidas no `CLAUDE.md` da raiz.

## Decisões em aberto

- **Biblioteca de gráficos.**

## Checklist antes de abrir um PR

- [ ] Rotas em `src/app/` só renderizam uma screen.
- [ ] Nenhum componente usa o `db`, o axios ou `useQuery` direto.
- [ ] Tabelas novas têm UUID, colunas de sync, soft delete e `localDate` quando o registro é diário.
- [ ] Medidas em inteiros, com a unidade no nome.
- [ ] Mudança de schema veio com migration nova gerada pelo `drizzle-kit`.
- [ ] Nenhuma feature de dados importa algo de `src/sync/` ou chama a API.
- [ ] Nenhuma feature importa o interior de outra (exceto `history` lendo queries).
- [ ] Cores por token semântico, sem hex em className.
- [ ] Elementos tocáveis com no mínimo 44px e `accessibilityLabel` quando só têm ícone.
- [ ] Anúncios só via `AdSlot`, fora do fluxo de registro.
- [ ] `bun run lint` e `bun run typecheck` passando.