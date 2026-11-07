# Padrões da API do Fluvi (NestJS)

Este documento define a organização do código, as convenções de nomes e os padrões de cada camada da API do Fluvi. Toda contribuição, humana ou feita por IA, segue estas regras. Quando uma regra não cobrir um caso, discuta antes de criar um padrão novo e atualize este arquivo.

## Papel da API

O app do Fluvi é **local-first**: a interface lê e grava sempre no SQLite do aparelho. A API não é a fonte da tela. Ela é o ponto de encontro entre os aparelhos e, no futuro, a versão web. Ela faz três coisas:

1. **Autenticação** com Google, via Better Auth (sessões no banco).
2. **Conta**: dados do usuário e exclusão da conta (exigência da Play Store).
3. **Sincronização**: recebe as mudanças de um aparelho (push) e devolve as mudanças feitas em outros lugares (pull).

A conta é **opcional**. O app funciona inteiro sem login, e a conta só existe para sincronizar. Por isso a API nunca é necessária para registrar água ou peso, e nenhum endpoint pode assumir que o aparelho está sempre online.

## Monorepo

```
fluvi/
├── apps/
│   ├── mobile/             # app Expo (tem o próprio PATTERNS.md)
│   └── api/                # esta API
├── packages/
│   ├── contracts/          # schemas Zod e tipos compartilhados entre app e API
│   └── domain/             # regras de negócio, validações e limites (funções puras)
├── turbo.json
└── package.json            # workspaces do Bun
```

- **Bun** gerencia os pacotes e os workspaces; **Turborepo** orquestra build, lint, typecheck e testes.
- A API roda em **Node.js LTS**. O Bun é só gerenciador de pacotes e executor de scripts.
- O app e a API nunca importam um do outro. O formato dos dados trafegados mora em `packages/contracts`; regras, validações e limites moram em `packages/domain`.

### `packages/contracts`

É o contrato entre app e API. Uma mudança aqui quebra o typecheck dos dois lados ao mesmo tempo, e é exatamente para isso que ele existe.

```
packages/contracts/src/
├── sync/
│   ├── records.ts          # schema de cada entidade sincronizável
│   ├── push.ts             # payload e resposta do push
│   └── pull.ts             # query e resposta do pull
├── auth/
│   ├── google-sign-in.ts
│   └── tokens.ts
├── users/
│   └── me.ts
├── errors.ts               # códigos de erro da API
└── index.ts                # entrada pública do pacote
```

- O pacote contém só **schemas Zod, tipos inferidos e constantes**. Nada de lógica, nada de dependência de Nest, Drizzle ou React Native. A única dependência interna é `@fluvi/domain`, de onde vêm os validadores `isValidSync*` e constantes como `ACTIVITY_LEVELS`.
- É compilado com `tsup` (ESM e CJS). O Turborepo builda o pacote antes de quem depende dele (`dependsOn: ["^build"]`).
- O `index.ts` reexporta o conteúdo público. É a única exceção à regra de não ter barrel files, porque é o ponto de entrada do pacote.
- Todo campo que trafega carrega o mesmo nome no app, no contrato e na API (`amountMl`, `weightGrams`, `localDate`).

### Formato dos dados na rede

- **Timestamps** viajam como número inteiro em milissegundos desde a época (`updatedAt: 1762450000000`), igual ao `timestamp_ms` do SQLite do app. Nada de string ISO no contrato de sync.
- **Datas locais** viajam como string `YYYY-MM-DD` (`localDate: '2026-11-06'`).
- **Medidas** em inteiros, com a unidade no nome: ml para água, gramas para peso.

### Evolução do contrato

O app fica instalado em aparelhos que não atualizam. A API precisa continuar aceitando versões antigas dele.

- Mudanças **aditivas** são permitidas sem versão nova: campo novo opcional no push (com default no servidor) ou campo novo na resposta do pull. Os schemas do app usam `z.object` padrão, que descarta campos desconhecidos.
- Mudanças **que quebram** (renomear, remover, mudar tipo, tornar obrigatório) exigem um prefixo novo (`/v2`) mantido ao lado do `/v1` até as versões antigas do app saírem de uso.
- Todas as rotas ficam sob o prefixo global `/v1`.

## Stack

- **NestJS** com TypeScript em modo strict.
- **PostgreSQL 17** com **Drizzle ORM** (`drizzle-orm/postgres-js`, driver `postgres`) e migrations pelo `drizzle-kit`.
- **Zod** para validação, integrado ao Nest com `nestjs-zod`. Os schemas vêm de `@fluvi/contracts`.
- **Better Auth** (`better-auth` + `@better-auth/expo`) para login com Google e sessões, integrado ao Nest com `@thallesp/nestjs-better-auth`.
- **@nestjs/throttler** para rate limit.
- **nestjs-pino** para logs estruturados.
- **Vitest** para testes, com Postgres real nos testes e2e e de integração.
- **Biome** para lint e formatação.
- **Docker Compose** na VPS, atrás do Nginx.

## Estrutura de pastas

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── create-app.ts           # cria a app Nest (usado pelo main.ts e pelos testes e2e)
│   ├── config/
│   │   └── env.ts              # schema Zod das variáveis de ambiente
│   ├── auth/
│   │   └── auth.ts             # instância do Better Auth
│   ├── db/
│   │   ├── client.ts           # cliente postgres-js e instância do Drizzle
│   │   ├── db.module.ts        # provider do Drizzle
│   │   ├── inject-db.ts        # decorator @InjectDb()
│   │   ├── columns.ts          # colunas comuns de sync
│   │   ├── schema/             # um arquivo por tabela; auth.ts é gerado pelo CLI do Better Auth
│   │   └── migrations/         # geradas pelo drizzle-kit, nunca editadas à mão
│   ├── common/
│   │   ├── filters/            # filtro global de erros
│   │   └── errors/             # AppError e helpers
│   └── modules/
│       ├── users/              # GET /v1/me
│       ├── sync/
│       └── health/
├── test/
│   ├── e2e/                    # testes HTTP contra Postgres real
│   └── integration/            # testes contra Postgres real
├── drizzle.config.ts
├── docker-compose.yml          # Postgres de desenvolvimento e de teste
└── Dockerfile
```

### Camadas de um módulo

```
modules/<modulo>/
├── <modulo>.module.ts
├── <modulo>.controller.ts      # HTTP: rota, validação, usuário atual
├── <modulo>.service.ts         # regras de negócio
└── <modulo>.repository.ts      # único arquivo que usa o Drizzle
```

1. **Controller** recebe a requisição, valida com o schema do contrato, pega o usuário com `@Session()` e chama o service. Não tem regra de negócio nem acesso ao banco.
2. **Service** aplica as regras. Não conhece HTTP (nada de `Request`, `Response` ou status code) e não usa o Drizzle.
3. **Repository** é o único que importa o `db` e as tabelas. Recebe e devolve tipos de domínio.

Para uma API deste tamanho não existem classes de use case. Se um service crescer demais, ele é quebrado em services menores dentro do mesmo módulo.

### Regras da estrutura

- **Um módulo não importa o repository de outro.** Se precisar de dado de outro módulo, importa o service dele, exportado pelo módulo.
- **Sem barrel files** dentro de `apps/api`. Importe direto do arquivo.
- Imports entre pastas de `src/` usam o alias `@/`. Imports relativos só dentro do mesmo módulo.
- **Exceção:** `src/db/columns.ts` e os arquivos de `src/db/schema/` usam imports relativos (`../columns.js`, `./auth.js`), porque o `drizzle-kit` carrega o schema sem resolver o alias `@/` do tsconfig.

## Convenções de nomes

| O quê | Convenção | Exemplo |
|---|---|---|
| Arquivos e pastas | kebab-case com sufixo do Nest | `sync.controller.ts`, `water-logs.ts` |
| Classes | PascalCase com sufixo | `SyncService`, `HealthController` |
| Funções e variáveis | camelCase | `applyPush`, `nextCursor` |
| Booleanos | prefixo `is`, `has`, `can`, `should` | `hasMore`, `isRevoked` |
| Tipos e interfaces | PascalCase, sem prefixo `I` | `WaterLogRecord` |
| Schemas Zod (contracts) | camelCase + `Schema` | `syncPushBodySchema` |
| Tipos inferidos do Zod | PascalCase do schema, sem `Schema` | `SyncPushBody` |
| Tabelas no banco | snake_case, plural | `water_logs` |
| Tabelas no Drizzle | camelCase, plural | `waterLogs` |
| Colunas | snake_case no banco, camelCase no TS | `amount_ml` / `amountMl` |
| Índices | `<tabela>_<colunas>_idx` | `water_logs_user_id_server_version_idx` |
| Rotas | inglês, kebab-case, substantivos | `/v1/sync/push`, `/v1/me` |
| Códigos de erro | SCREAMING_SNAKE_CASE | `INVALID_GOOGLE_TOKEN` |
| Constantes de módulo | SCREAMING_SNAKE_CASE | `MAX_PUSH_RECORDS` |
| Variáveis de ambiente | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

Todo número que representa uma medida carrega a unidade no nome: `amountMl`, `weightGrams`, `dailyGoalMl`.

### Idioma

- Código, rotas, campos, códigos de erro e logs em **inglês**.
- Mensagens de erro voltadas ao usuário não saem da API. A API devolve o código, e o app traduz para português.

## Banco de dados

### Tabelas

| Tabela | O que guarda |
|---|---|
| `users` | usuário do Better Auth: id (UUID), nome, email, imagem, timestamps |
| `sessions` | sessões do Better Auth (uma por aparelho), com `token`, `expires_at` e `user_id` |
| `accounts` | vínculo com o Google (`provider_id`, `account_id` = `sub` do Google) |
| `verifications` | tokens temporários do Better Auth |
| `water_logs` | registros de água |
| `weight_entries` | registros de peso |
| `goals` | metas diárias com vigência (`daily_goal_ml`, `effective_from`) |
| `user_settings` | preferências sincronizadas do usuário (nível de atividade, copos rápidos, consentimento do peso); uma linha por usuário |

`users`, `sessions`, `accounts` e `verifications` são do Better Auth: o schema delas (`src/db/schema/auth.ts`) é gerado pelo CLI (`bunx auth@<versão> generate`). O arquivo tem **um único ajuste manual** em relação ao que o CLI gera: todo `timestamp` usa `{ withTimezone: true }` (`timestamptz`), igual ao resto do schema. Ao regenerar, reaplique esse ajuste e gere uma migration nova. Fora isso, não edite o arquivo à mão. `water_logs`, `weight_entries`, `goals` e `user_settings` são **tabelas sincronizáveis** e seguem as regras abaixo (com a exceção de `user_settings`, descrita em "Registro único por usuário").

### Exclusão em cascata

**Toda FK de uma tabela de domínio para `users` usa `ON DELETE CASCADE`.** É o único mecanismo que apaga os dados do usuário na exclusão de conta: não existe service que apague tabela por tabela. Assim a exclusão é atômica (um `DELETE` em `users`) e uma tabela nova não fica esquecida.

A exclusão de conta tem um teste e2e (`test/e2e/auth.e2e-spec.ts`) que percorre todas as tabelas com FK para `users` e confirma que não sobrou nenhuma linha do usuário. Toda tabela nova com FK para `users` entra nesse teste automaticamente; se ela precisar de dados de exemplo para o teste ter valor, crie-os no teste.

### Regras das tabelas sincronizáveis

1. **ID em UUID vindo do aparelho.** A API nunca gera o ID de um registro de usuário; ele nasce offline no app. O app sempre gera UUID **minúsculo**. Um UUID com letras maiúsculas é rejeitado no push (`MALFORMED_RECORD`): o Postgres o devolveria minúsculo no pull, e o SQLite do app, que compara texto com diferença de caixa, criaria uma duplicata.
2. **`user_id` obrigatório**, com `ON DELETE CASCADE` para `users`. O `user_id` vem sempre da sessão, nunca do payload.
3. **Colunas de sync:** `created_at`, `updated_at`, `deleted_at` (todas `timestamptz`) e `server_version` (`bigint`). Vêm de `src/db/columns.ts`.
4. **Soft delete.** Registro apagado continua no banco com `deleted_at` preenchido, para o pull avisar os outros aparelhos. Tombstones não são expurgados.
5. **Medidas em inteiros** (`integer`), nunca `numeric` ou float.
6. **`local_date` do tipo `date`**, mapeada como string (`mode: 'string'`).
7. **Índice em `(user_id, server_version)`** em toda tabela sincronizável. É a consulta do pull.
8. O banco não tem `synced_at`. Essa coluna é só do app.

```ts
// src/db/schema/sync-version-seq.ts
// Fica em schema/ porque o drizzle-kit só lê os exports dessa pasta.
export const syncVersionSeq = pgSequence('sync_version_seq');

// src/db/columns.ts
import { sql } from 'drizzle-orm';
import { bigint, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './schema/auth.js';

export const syncVersionColumns = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  serverVersion: bigint('server_version', { mode: 'number' })
    .notNull()
    .default(sql`nextval('sync_version_seq')`),
};

export const syncColumns = {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...syncVersionColumns,
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
};
```

```ts
// src/db/schema/water-logs.ts
import { date, index, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { syncColumns } from '../columns';

export const waterLogs = pgTable(
  'water_logs',
  {
    ...syncColumns,
    amountMl: integer('amount_ml').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true, mode: 'date' }).notNull(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
  },
  (table) => [index('water_logs_user_id_server_version_idx').on(table.userId, table.serverVersion)],
);
```

### O `server_version`

O `server_version` é o cursor do sync. Ele vem de uma única sequence global e recebe um valor novo a cada insert **e** a cada update que vence o conflito. O pull devolve tudo com `server_version` maior que o cursor do aparelho.

Ele existe porque o relógio do celular não é confiável para decidir "o que mudou desde a última vez". O `updated_at` decide conflito; o `server_version` decide o que o aparelho ainda não viu. Os dois nunca trocam de papel.

### Um registro ativo por dia (metas e peso)

- **Uma meta por dia:** índice único parcial `goals_user_id_effective_from_idx` em `(user_id, effective_from) WHERE deleted_at IS NULL`.
- **Um peso por dia:** índice único parcial `weight_entries_user_id_local_date_idx` em `(user_id, local_date) WHERE deleted_at IS NULL`.
- Tombstones não entram no índice: um registro ativo e quantos excluídos houver podem dividir o mesmo dia.
- Dois aparelhos offline ainda podem criar registros diferentes para o mesmo dia. O push resolve antes de gravar, com last-write-wins pelo `updated_at`:
  - se o registro que chega vence, o ativo do servidor é marcado como excluído (`deleted_at` preenchido, `server_version` novo) e o que chega é gravado (`applied`);
  - se o registro que chega perde, ele é **gravado como tombstone** (`deleted_at` preenchido) e a resposta é `ignored`. Gravar a perdedora, em vez de descartá-la, faz o pull devolver o tombstone ao aparelho que a criou, que então a exclui localmente. Sem isso, ela ficaria ativa só naquele aparelho para sempre.
  - Sem essa resolução, o insert do lote falha com violação de unicidade (ver "Pendências para a tarefa do push/pull").
- A meta de um dia é a de maior `effective_from` menor ou igual ao dia. O `@fluvi/domain` (`goalForDate`, `weightChange`) continua tolerando duplicatas, com desempate pelo maior `updated_at`, como defesa.

### Registro único por usuário (`user_settings`)

- A chave primária é o próprio `user_id` (FK com `ON DELETE CASCADE`). Não existe `id` gerado no aparelho.
- Usa `syncVersionColumns` (`created_at`, `updated_at`, `server_version`), não `syncColumns`. **Não tem índice `(user_id, server_version)`**: com uma linha por usuário, a PK já atende o pull.
- Não tem `deleted_at`: a linha só some quando a conta é excluída.
- `activity_level` é `text` tipado com `ACTIVITY_LEVELS` de `@fluvi/domain`, sem enum nem CHECK no banco. `quick_amounts_ml` é `integer[]`.
- **Consentimento do peso é um grupo à parte.** `weight_tracking_enabled`, `weight_consent_at` e `weight_consent_policy_version` são mesclados juntos pelo próprio `weight_consent_updated_at`, independente do last-write-wins da linha (`updated_at`). Ligar ou desligar o registro de peso é a mesma ação que dar ou revogar o consentimento, então os três campos nunca divergem. Vence o grupo com `weight_consent_updated_at` mais novo, e `null` (nunca definido) perde de qualquer valor. Assim, um aparelho desatualizado que edita outra preferência nunca reativa um consentimento revogado. O resto da linha (`activity_level`, `quick_amounts_ml`) segue o last-write-wins por `updated_at`.
- **Nenhum limite numérico em CHECK** em nenhuma tabela: os números moram só no domain. O banco só tem travas estruturais (FK, NOT NULL, índices únicos).

### Migrations

- Geradas com `drizzle-kit generate` a partir de `src/db/schema/`. Nunca escritas nem editadas à mão depois de aplicadas em qualquer ambiente.
- A sequence `sync_version_seq` é declarada no schema com `pgSequence`, então entra na migration como qualquer tabela.
- Aplicadas com `drizzle-kit migrate` num passo próprio do deploy, antes de a API subir. A API não roda migrations na inicialização.

### Acesso ao banco

- O Drizzle é fornecido por um provider no `DbModule` e injetado com `@InjectDb()`.
- Só arquivos `*.repository.ts` usam `@InjectDb()` ou importam tabelas.
- Transações são abertas no repository (`db.transaction`). Quando uma operação de negócio precisa de transação, o repository expõe um método que faz tudo dentro dela.

## Sincronização

O módulo `sync` é a parte mais sensível da API: um erro aqui corrompe ou perde dados em silêncio. Toda mudança nele vem com teste de integração.

### Registry

Cada entidade sincronizável é declarada uma vez em `sync-registry.ts`, com a tabela, o schema do contrato e as colunas que o cliente pode alterar. Push e pull percorrem o registry. Para sincronizar uma entidade nova, crie a tabela, o schema em `@fluvi/contracts` e a entrada no registry; o motor não muda.

```ts
// src/modules/sync/sync-registry.ts
import { goalRecordSchema, waterLogRecordSchema, weightEntryRecordSchema } from '@fluvi/contracts';
import { goals } from '@/db/schema/goals';
import { waterLogs } from '@/db/schema/water-logs';
import { weightEntries } from '@/db/schema/weight-entries';

export const syncRegistry = {
  waterLogs: { table: waterLogs, schema: waterLogRecordSchema, mutableColumns: ['amountMl', 'loggedAt', 'localDate'] },
  weightEntries: { table: weightEntries, schema: weightEntryRecordSchema, mutableColumns: ['weightGrams', 'measuredAt', 'localDate'] },
  goals: { table: goals, schema: goalRecordSchema, mutableColumns: ['dailyGoalMl', 'effectiveFrom'] },
} as const;
```

`userSettings` (`userSettingsRecordSchema`) também é sincronizado, mas é um registro único por usuário, sem `id` e sem `deletedAt`: no contrato ele trafega como objeto opcional, não como array. A forma como ele entra no registry fica para a tarefa do push/pull.

### Push: `POST /v1/sync/push`

O corpo (`syncPushBodySchema`) traz um array por entidade (`waterLogs`, `weightEntries`, `goals`, com default `[]`) e um `userSettings` opcional, com no máximo `MAX_PUSH_RECORDS` (500) registros somando todos (`userSettings` conta como 1). Cada registro tem `id`, os campos da entidade, `createdAt`, `updatedAt` e `deletedAt`. Ele nunca traz `userId` nem `serverVersion`.

O schema do corpo valida só o envelope: formato, total de registros e `id` em UUID em cada item. Se ele falhar, o lote inteiro volta `VALIDATION_FAILED`. Cada registro é validado depois, um a um, com o schema da entidade (`waterLogRecordSchema`, ...). Um registro inválido não derruba o lote: volta como `rejected`.

O lote inteiro é gravado numa transação só:

1. `SELECT pg_advisory_xact_lock(hashtext(<userId>))` para serializar as escritas do mesmo usuário. Sem isso, duas transações paralelas podem fazer commit fora da ordem da sequence, e um pull no meio pularia registros.
2. Para cada entidade, um upsert com last-write-wins:

```ts
await tx
  .insert(waterLogs)
  .values(rows)
  .onConflictDoUpdate({
    target: waterLogs.id,
    set: {
      amountMl: sql`excluded.amount_ml`,
      loggedAt: sql`excluded.logged_at`,
      localDate: sql`excluded.local_date`,
      updatedAt: sql`excluded.updated_at`,
      deletedAt: sql`excluded.deleted_at`,
      serverVersion: sql`nextval('sync_version_seq')`,
    },
    setWhere: and(
      eq(waterLogs.userId, sql`excluded.user_id`),
      lt(waterLogs.updatedAt, sql`excluded.updated_at`),
    ),
  });
```

Regras que o upsert garante e que nunca podem ser removidas:

- **`user_id` igual:** um UUID de outro usuário nunca é sobrescrito. O registro é ignorado sem erro.
- **`updated_at` estritamente maior:** o registro mais novo vence, e reenviar o mesmo lote não muda nada (idempotência).
- **`server_version` novo** em todo insert e em todo update que vence.
- `created_at` e `user_id` nunca mudam depois do insert.

Antes do upsert, o service aplica duas proteções:

- **Relógio adiantado:** `updatedAt` (e `weightConsentUpdatedAt`, em `userSettings`) maior que o horário do servidor mais 5 minutos é limitado ao horário do servidor. Rejeitar travaria o sync daquele aparelho para sempre.
- **Validação de domínio** por registro, pelo schema do contrato, que reutiliza os validadores de `@fluvi/domain`: `isValidSyncWaterMl` (`amountMl`), `isValidSyncWeightGrams` (`weightGrams`), `isValidSyncGoalMl` (`dailyGoalMl`), `isValidSyncQuickAmountsMl` (`quickAmountsMl`), `ACTIVITY_LEVELS` (`activityLevel`) e `isLocalDate` (`localDate`, `effectiveFrom`). Os limites ficam só no domain; não repita os números no contrato nem na API.
- **Motivo da rejeição:** cada refine dos schemas de registro carrega seu motivo em `issue.params.reason` (`INVALID_LOCAL_DATE` para datas, `VALUE_OUT_OF_RANGE` para os validadores do domain, `MALFORMED_RECORD` para UUID com maiúsculas). Qualquer outro issue (campo ausente, tipo errado, formato) é `MALFORMED_RECORD`. O service usa o motivo do primeiro issue; não existe tabela de campos para motivos.

A resposta é `200` com um resultado por registro enviado, agrupado por entidade como o corpo (`syncPushResponseSchema`). Cada resultado tem `id` (exceto `userSettings`), `status` e, quando rejeitado, `reason`:

- `applied`: gravado (insert, ou update que venceu o last-write-wins).
- `ignored`: válido, mas não venceu. Perdeu o last-write-wins, perdeu como duplicata do dia (e foi gravado como tombstone) ou tem o `id` de outro usuário (sem revelar isso). A versão do servidor volta ao aparelho no próximo pull.
- `rejected`: inválido, com `reason` de `SYNC_REJECTION_REASON` (`MALFORMED_RECORD`, `VALUE_OUT_OF_RANGE`, `INVALID_LOCAL_DATE`).

O schema da resposta lê `status` e `reason` como string, com os tipos abertos `SyncPushStatus | (string & {})` e `SyncRejectionReason | (string & {})`, para que um app já instalado não quebre nem suponha exaustividade quando surgir um código novo.

**A resposta do push não tem cursor.** O único cursor do sync é o do pull (`since`/`nextCursor`).

### Pull: `GET /v1/sync/pull?since=<cursor>&limit=<n>`

- `since` é o último cursor recebido (0 no primeiro sync). `limit` tem padrão e máximo de `MAX_PULL_LIMIT` (500) por entidade (`syncPullQuerySchema`).
- Parâmetro **ausente** assume o padrão (`since` = 0). Parâmetro **presente e vazio ou inválido** (`since=`, `since=abc`, `since=-1`) é `400 VALIDATION_FAILED`. Assim, um bug no app que perca o cursor não vira um resync completo silencioso.
- A resposta (`syncPullResponseSchema`) traz um array por entidade, `userSettings` (ou `null`), `nextCursor` e `hasMore`.
- **Os schemas da resposta do pull são lenientes** (`pulledWaterLogSchema`, ...): validam estrutura e tipos, mas não faixas, enums fechados nem formatos. Limites e enums podem ser ampliados numa versão futura, e um app já instalado precisa continuar sincronizando. Os schemas estritos (`waterLogRecordSchema`, ...) valem só para o que entra no push.
- **O app tolera valores desconhecidos** vindos do pull. Exemplo: um `activityLevel` novo não pode quebrar o cálculo da meta. O app valida com `isActivityLevel` (`@fluvi/domain`) na fronteira (leitura do SQLite e aplicação do pull) e, se o nível for desconhecido, mantém a meta atual sem recalcular. `suggestGoalMl` continua lançando `RangeError` para nível desconhecido, então nunca é chamado sem essa checagem. Medidas fora das faixas atuais também são aceitas como vieram.
- Para cada entidade: `WHERE user_id = $1 AND server_version > $since ORDER BY server_version LIMIT $limit`.
- Registros apagados vêm junto, com `deletedAt` preenchido.
- **Paginação entre entidades:** se alguma entidade atingiu o `limit`, o `nextCursor` é o menor "último `server_version`" entre as que atingiram, os registros acima dele são descartados da resposta e `hasMore` é `true`. Caso contrário, `nextCursor` é o maior `server_version` devolvido (ou o próprio `since`, se nada veio) e `hasMore` é `false`. Sem essa regra, uma página pularia registros de outra entidade.
- O pull devolve também os registros que o próprio aparelho acabou de enviar. Isso é esperado; o app aplica last-write-wins e ignora o que já tem.

### Comportamento esperado do app

A API depende destas regras do lado do app, documentadas aqui porque são parte do contrato:

- Ordem de cada execução: **push primeiro, depois pull a partir do cursor que o app já tinha** antes do push, repetindo o pull enquanto `hasMore`. O push nunca avança o cursor: se avançasse, o app pularia as mudanças de outros aparelhos com `server_version` menor que as suas.
- Depois de um push confirmado, o `syncedAt` de cada registro recebe o **`updatedAt` que foi enviado**, não o horário atual. Assim, um registro editado durante o request continua pendente.
- **Primeiro login:** é a exceção à ordem push-depois-pull. O app faz **pull antes do push**:
  - Os registros de água, peso e meta feitos sem conta não têm dono no aparelho. Eles sobem normalmente no push seguinte, e a API os associa ao usuário do token. Se a conta já tiver dados de outro aparelho, os dois se juntam (com a resolução da duplicata do dia).
  - As configurações locais criadas antes do login só sobem se a conta **ainda não tiver `user_settings`** (o pull trouxe `userSettings: null`). Se tiver, as do servidor substituem as locais. Sem isso, os defaults de uma instalação nova, sempre com `updatedAt` mais recente, sobrescreveriam as configurações reais da conta.
- **Logout:** o app apaga o banco local e o cursor, e volta ao modo sem conta. Sem isso, o próximo login de outra conta enviaria os dados da conta anterior.

## Autenticação

O MVP só tem login com Google, feito pelo **Better Auth** (`src/auth/auth.ts`).

### Configuração do Better Auth

- `basePath: '/v1/auth'`. As rotas do Better Auth não passam pelo prefixo global do Nest; o `basePath` já inclui o `/v1`.
- Adapter Drizzle com `provider: 'pg'` e `usePlural: true` (tabelas no plural; `user` é palavra reservada no Postgres).
- `advanced.database.generateId: 'uuid'`: ids em UUID, iguais ao resto do schema.
- Só o provider `google`. Email e senha ficam desligados.
- Plugin `expo()` e o `APP_SCHEME` em `trustedOrigins` (mais `exp://` só em development).
- `session.expiresIn` de 60 dias e `session.updateAge` de 1 dia: o app pode ficar dias fechado, e cada uso depois de 1 dia renova a validade.
- `account.encryptOAuthTokens: true`: access e refresh tokens do Google são cifrados com o `BETTER_AUTH_SECRET`. O `id_token` do Google e o token de sessão continuam em texto no banco (limitação do Better Auth).
- `user.deleteUser.enabled: true`.

### Login: `POST /v1/auth/sign-in/social`

1. O app faz o login nativo com Google no aparelho e envia `{ provider: 'google', idToken: { token } }`.
2. O Better Auth verifica o ID token (assinatura, expiração e `aud` igual a `GOOGLE_CLIENT_ID`, o Web client ID).
3. O usuário é criado ou encontrado pela conta Google (`accounts.account_id` = `sub`).
4. Uma sessão nova é criada e o token volta para o app, que o guarda com o `@better-auth/expo`.

### Guard global

- O `AuthModule.forRoot({ auth })` de `@thallesp/nestjs-better-auth` registra um guard global. Toda rota exige sessão por padrão.
- Rotas públicas são marcadas explicitamente com `@AllowAnonymous()`. Hoje só `/v1/health`.
- A sessão chega ao controller por `@Session() session: UserSession`. O `user_id` é sempre `session.user.id`.
- O Nest sobe com `bodyParser: false` (exigido pelo Better Auth). O parser de JSON das outras rotas é configurado em `AuthModule.forRoot({ bodyParser })`.

## Conta

- `GET /v1/me` devolve `id`, `name`, `email` e `image` do usuário da sessão (`meResponseSchema` de `@fluvi/contracts`).
- A exclusão da conta é o endpoint do Better Auth `POST /v1/auth/delete-user`. É hard delete: a Play Store exige que os dados sejam removidos.
  - Sem senha, o Better Auth exige uma sessão **fresca** (`session.freshAge`, 1 dia). O app refaz o login com Google antes de excluir.
  - O Better Auth apaga sessões, contas e o usuário. O `ON DELETE CASCADE` de toda FK para `users` leva junto todos os dados de domínio (ver "Exclusão em cascata"). Os outros aparelhos perdem o acesso.
- A Play Store também exige um caminho de exclusão fora do app, por um link web. Esse fluxo usa o mesmo endpoint.

## Erros

- Toda falha esperada é lançada como `AppError` com um código de `@fluvi/contracts/errors` e o status HTTP correspondente.
- O filtro global converte tudo para um formato único:

```json
{ "error": { "code": "INVALID_GOOGLE_TOKEN", "message": "Google ID token could not be verified" } }
```

- A `message` é para quem depura, em inglês. O app decide o texto mostrado pelo `code`.
- Erros de validação do Zod saem como `VALIDATION_FAILED`, com os caminhos dos campos inválidos.
- Erro inesperado sai como `INTERNAL_ERROR`, sem stack trace nem detalhe interno na resposta.

## Configuração

- Variáveis de ambiente são validadas por um schema Zod em `src/config/env.ts` na subida. Se faltar uma, a API não sobe.
- Nenhum código lê `process.env` fora de `env.ts`. Exceções de tooling: `drizzle.config.ts` lê só `DATABASE_URL`, para o `drizzle-kit` não exigir os segredos; `vitest.config.e2e.ts` lê só o `.env.test` e recusa rodar se o `DATABASE_URL` não for o `fluvi_test` na porta 5433.
- O `.env` só é lido em development (`NODE_ENV=development`, definido pelos scripts `dev` e `db:*`). Os testes e2e leem o `.env.test` pelo Vitest, e o deploy passa tudo pelo ambiente.
- Variáveis: `NODE_ENV`, `PORT`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_SCHEME`. O `.env.example` documenta cada uma.

## Segurança e privacidade

- **Rate limit** global com `@nestjs/throttler` e limite mais apertado nas rotas de `/auth`.
- **Logs não carregam dados do usuário.** Nada de corpo de requisição, cookie, header `Authorization`, ID token, token de sessão, email ou valores de peso e água. Peso é dado de saúde. Logue ids, rotas, status e duração.
- O tamanho máximo do corpo da requisição é limitado no Nest e no Nginx.
- CORS liberado só para os `trustedOrigins` do Better Auth (o `AuthModule` de `@thallesp/nestjs-better-auth` habilita, com `credentials`). A versão web entra adicionando a origem dela lá.

## Testes

- **Integração do sync é obrigatória.** Os testes rodam contra um Postgres real (o serviço `db-test` do `docker-compose.yml`) e cobrem, no mínimo:
  - last-write-wins nos dois sentidos (mais novo vence, mais antigo é ignorado);
  - reenvio do mesmo lote sem duplicar nem mudar `server_version`;
  - tentativa de sobrescrever registro de outro usuário;
  - tombstones chegando no pull;
  - paginação do pull com várias entidades e `hasMore`;
  - limitação de `updatedAt` adiantado.
- **Tabelas de sync** têm testes e2e (`test/e2e/sync-tables.e2e-spec.ts`) dos índices únicos parciais: dois registros ativos no mesmo dia falham, e um ativo ao lado de excluídos passa. O teste de exclusão de conta insere uma linha em cada tabela de domínio (`test/e2e/sync-rows.ts`).
- **Auth** tem testes e2e (`test/e2e/`) contra Postgres real. Usuário e sessão de teste vêm do plugin `testUtils` do Better Auth, numa instância só de teste (`test/e2e/test-auth.ts`) que nunca entra na config da app. O login real com Google é testado manualmente com o app.
- Services com regra de negócio isolada têm testes unitários. Controllers e repositories simples não precisam de teste unitário.

## Deploy

- Imagem Docker multi-stage, rodando com usuário não root.
- Na VPS, Docker Compose com a API e o Postgres, atrás do Nginx com HTTPS.
- Ordem do deploy: build da imagem, `drizzle-kit migrate`, troca do container da API.
- `GET /v1/health` checa a conexão com o banco e é usado pelo healthcheck do Compose.

## Pendências para a tarefa do push/pull

Decisões já tomadas que a implementação do `sync` precisa respeitar:

- **`server_version` em update:** o insert recebe `nextval('sync_version_seq')` pelo default da coluna, mas o default não vale em `UPDATE`. Todo update feito pelo push (o `set` do upsert, e também a marcação como excluída da duplicata perdedora do dia) precisa atribuir `server_version = nextval('sync_version_seq')` explicitamente. Sem isso, o pull dos outros aparelhos nunca vê a mudança.
- **Duplicata do dia:** com os índices únicos parciais de `goals` e `weight_entries`, o push precisa resolver o conflito com o registro ativo do mesmo dia antes do insert (vence o `updated_at` mais recente; se o ativo do servidor perde, é marcado como excluído; se o que chega perde, é gravado como tombstone e volta `ignored`). Senão o lote inteiro falha. A checagem vale também para updates que deixam um registro ativo ou mudam o dia dele (reativação pelo last-write-wins, troca de `local_date`/`effective_from`) e precisa considerar os outros registros do mesmo lote: o índice é checado linha a linha, então, no mesmo `INSERT`, um registro novo antes da exclusão do antigo do mesmo dia falha. Grave as exclusões primeiro.
- **`id` repetido no lote:** o envelope não impede o mesmo `id` duas vezes na mesma entidade, e um `INSERT ... ON CONFLICT DO UPDATE` que toca a mesma linha duas vezes falha (`21000`) e derruba o lote. O push precisa deduplicar (fica o maior `updatedAt`) ou rejeitar antes do upsert.
- **`user_settings`:** definir como o registro único entra no registry e no upsert (conflito por `user_id`). São dois merges no mesmo upsert: o resto da linha por `updated_at`, e o grupo do consentimento (`weight_tracking_enabled`, `weight_consent_at`, `weight_consent_policy_version`) por `weight_consent_updated_at`. O `server_version` é novo se qualquer um dos dois vencer.
- **Motivos de rejeição:** ler `issue.params.reason` do primeiro issue; sem motivo, `MALFORMED_RECORD`.

## Pendências de deploy

Ficam para a tarefa de deploy:

- **IP do cliente atrás do Nginx:** configurar `advanced.ipAddress` (`ipAddressHeaders` ou `trustedProxies`) no Better Auth. Sem isso, o rate limit dele junta todos os clientes num único balde por rota.
- **Limite de body nas rotas de auth:** o limite de 1mb do `AuthModule.forRoot({ bodyParser })` não vale para `/v1/auth/*`, que o Better Auth lê cru. Limitar no Nginx (`client_max_body_size`).
- **Log das rotas `/v1/auth/*`:** o handler do Better Auth é montado antes dos middlewares do Nest, então o `pino-http` não loga essas rotas. Decidir como logar sem vazar tokens (query string e header `Location` incluídos).

## Validação automática

Verificado pelo Biome no `bun run lint`:

- `useFilenamingConvention`: arquivos em kebab-case.
- `useNamingConvention`: convenções de nomes.
- `noDefaultExport`: proibido em todo o código da API.

As regras que o lint não verifica (camadas, Drizzle só em repository, `user_id` vindo da sessão, regras do upsert, logs sem dados do usuário) são responsabilidade do code review e estão resumidas no `CLAUDE.md`.

## Decisões em aberto

- **Página web de exclusão de conta:** onde ela fica hospedada e se usa login com Google ou um formulário de solicitação.
- **Domínio da API** e separação entre ambiente de homologação e produção.
- **Login por email e senha:** fora do MVP. Se entrar depois, precisa de fluxo de recuperação de senha e envio de email.

## Checklist antes de abrir um PR

- [ ] Controller sem regra de negócio e sem acesso ao banco.
- [ ] Drizzle usado só em `*.repository.ts`.
- [ ] Nenhuma rota nova sem autenticação, a não ser que esteja marcada com `@AllowAnonymous()` de propósito.
- [ ] `user_id` sempre vindo da sessão, nunca do corpo ou da query.
- [ ] Tabelas sincronizáveis novas com UUID do cliente, colunas de sync, índice `(user_id, server_version)` e entrada no registry.
- [ ] Mudança de contrato feita em `@fluvi/contracts` e compatível com versões antigas do app (ou em `/v2`).
- [ ] Mudança de schema veio com migration nova gerada pelo `drizzle-kit`.
- [ ] Mudança no sync veio com teste de integração.
- [ ] Logs sem corpo de requisição, tokens ou dados de saúde.
- [ ] `bun run lint`, `bun run typecheck` e `bun run test` passando.
