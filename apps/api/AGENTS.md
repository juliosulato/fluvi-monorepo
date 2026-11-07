API em NestJS do Fluvi, um app Android de meta de água e registro de peso. O app é **local-first**: ele funciona inteiro sem conta e sem internet, e esta API serve para autenticação com Google (Better Auth), conta e sincronização entre aparelhos.

Este diretório faz parte de um monorepo (Bun workspaces + Turborepo):

- `apps/mobile`: app Expo
- `apps/api`: esta API
- `packages/contracts`: schemas Zod compartilhados entre app e API

As regras completas estão em [`docs/PATTERNS.md`](./docs/PATTERNS.md). Leia a seção relevante antes de mexer em banco, sync ou auth.

## Comandos

Rode a partir de `apps/api`:

```bash
docker compose up -d db       # Postgres de desenvolvimento
bun run dev                   # API em modo watch
bun run lint                  # Biome
bun run typecheck             # TypeScript
bun run test                  # testes unitários
bun run test:e2e              # testes HTTP contra o db-test (copie .env.test.example para .env.test)
bun run db:generate           # gera migration a partir de src/db/schema/
bun run db:migrate            # aplica migrations no banco local
```

Se você mudou `packages/contracts`, builde o pacote antes do typecheck: `bunx turbo build --filter=@fluvi/contracts`.

## Regras que o lint não pega

### Camadas

- Controller: rota, validação com schema de `@fluvi/contracts`, `@Session()` e chamada ao service. Sem regra de negócio, sem banco.
- Service: regras de negócio. Sem objetos HTTP e sem Drizzle.
- Repository: o único lugar que usa `@InjectDb()` ou importa tabelas.
- Um módulo não importa o repository de outro; usa o service exportado.

### Segurança

- O `user_id` vem **sempre** da sessão (`@Session()`, `session.user.id`). Nunca aceite `userId` no corpo ou na query.
- O guard do Better Auth (`@thallesp/nestjs-better-auth`) é global. Só marque uma rota com `@AllowAnonymous()` se ela realmente precisa ser pública, e diga isso no resumo.
- Nada de `process.env` fora de `src/config/env.ts`. Exceções de tooling: `drizzle.config.ts` (lê só `DATABASE_URL`) e `vitest.config.e2e.ts` (lê só o `.env.test`).
- Logs nunca contêm corpo de requisição, cookie, header `Authorization`, ID token, token de sessão, email ou valores de água e peso.

### Banco

- Toda tabela sincronizável usa `syncColumns` de `src/db/columns.ts`, tem índice `(user_id, server_version)` e entra em `src/modules/sync/sync-registry.ts`.
  - **Exceção:** `user_settings` usa `syncVersionColumns` (sem `id` do aparelho, sem `deleted_at` e sem índice `(user_id, server_version)`), porque é uma linha por usuário e a PK é o próprio `user_id`. Detalhes em "Registro único por usuário" no PATTERNS.
- `src/db/columns.ts` e `src/db/schema/` usam imports relativos, não `@/`, porque o `drizzle-kit` não resolve o alias do tsconfig ao carregar o schema.
- IDs de registros de usuário vêm do aparelho. A API nunca gera esses IDs.
- Medidas em inteiros com a unidade no nome (`amountMl`, `weightGrams`).
- Toda mudança de schema gera migration nova com `drizzle-kit generate`. **Nunca edite uma migration existente** nem escreva uma à mão.
- Exclusão de registro de usuário é soft delete. A única exceção é a exclusão de conta (`POST /v1/auth/delete-user`), que apaga tudo de verdade. Toda FK de tabela de domínio para `users` usa `ON DELETE CASCADE`, e o teste e2e da exclusão confirma que não sobra linha do usuário.
- O schema das tabelas do Better Auth (`src/db/schema/auth.ts`) é gerado pelo CLI dele, com um único ajuste manual (`withTimezone: true` em todo timestamp). Fora isso, não edite à mão.

### Sync (não altere sem pedir)

O upsert do push em `sync.repository.ts` tem três condições que não podem ser removidas nem afrouxadas:

1. `setWhere` exige `user_id` igual ao existente;
2. `setWhere` exige `updated_at` estritamente maior;
3. todo insert e todo update vencedor recebem `nextval('sync_version_seq')`.

O push roda numa transação com `pg_advisory_xact_lock` por usuário. O cursor do pull é o `server_version`, nunca um timestamp. Se uma tarefa parecer exigir mudar qualquer um desses pontos, **pare e explique o motivo antes de alterar**.

Toda mudança em `src/modules/sync/` vem acompanhada de teste em `test/integration/`.

### Contrato

- Payloads e respostas são definidos em `packages/contracts`, não dentro da API.
- O app instalado não atualiza junto com a API. Mudança de contrato precisa ser aditiva (campo novo opcional no push, campo novo na resposta). Se for quebrar compatibilidade, pare e pergunte antes: isso exige `/v2`.

## Como trabalhar

1. Para tarefas que mexem em mais de um módulo, no schema do banco ou no contrato, apresente um plano curto antes de escrever código.
2. Siga os nomes e a estrutura do `PATTERNS.md`. Se um caso não estiver coberto, pergunte em vez de criar um padrão novo.
3. Antes de terminar, rode `bun run lint`, `bun run typecheck` e os testes relevantes (`bun run test:e2e` se tocou em auth ou banco). Corrija o que falhar.
4. **Não faça commit.** Deixe todas as mudanças no working tree para o Julio revisar e commitar. Também não faça push, não crie branch e não rode `drizzle-kit migrate` contra nenhum banco que não seja o local.
5. Termine com um resumo curto: o que mudou, arquivos tocados, migrations geradas, mudanças no contrato e qualquer decisão que precise de revisão.
