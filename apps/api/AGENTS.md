API em NestJS do Fluvi, um app Android de meta de água e registro de peso. O app é **local-first**: ele funciona inteiro sem conta e sem internet, e esta API serve para autenticação com Google, conta e sincronização entre aparelhos.

Este diretório faz parte de um monorepo (Bun workspaces + Turborepo):

- `apps/mobile`: app Expo
- `apps/api`: esta API
- `packages/contracts`: schemas Zod compartilhados entre app e API

As regras completas estão em [`PATTERNS.md`](./PATTERNS.md). Leia a seção relevante antes de mexer em banco, sync ou auth.

## Comandos

Rode a partir de `apps/api`:

```bash
docker compose up -d db       # Postgres de desenvolvimento
bun run dev                   # API em modo watch
bun run lint                  # Biome
bun run typecheck             # TypeScript
bun run test                  # testes unitários
bun run test:integration      # testes contra Postgres real (sobe o db-test)
bunx drizzle-kit generate     # gera migration a partir de src/db/schema/
bunx drizzle-kit migrate      # aplica migrations no banco local
```

Se você mudou `packages/contracts`, builde o pacote antes do typecheck: `bunx turbo build --filter=@fluvi/contracts`.

## Regras que o lint não pega

### Camadas

- Controller: rota, validação com schema de `@fluvi/contracts`, `@CurrentUser()` e chamada ao service. Sem regra de negócio, sem banco.
- Service: regras de negócio. Sem objetos HTTP e sem Drizzle.
- Repository: o único lugar que usa `@InjectDb()` ou importa tabelas.
- Um módulo não importa o repository de outro; usa o service exportado.

### Segurança

- O `user_id` vem **sempre** do token (`@CurrentUser()`). Nunca aceite `userId` no corpo ou na query.
- O `JwtAuthGuard` é global. Só marque uma rota com `@Public()` se ela realmente precisa ser pública, e diga isso no resumo.
- Nada de `process.env` fora de `src/config/env.ts`.
- Logs nunca contêm corpo de requisição, ID token, refresh token, email ou valores de água e peso.
- Refresh token só é guardado como hash.

### Banco

- Toda tabela sincronizável usa `syncColumns` de `src/db/columns.ts`, tem índice `(user_id, server_version)` e entra em `src/modules/sync/sync-registry.ts`.
- IDs de registros de usuário vêm do aparelho. A API nunca gera esses IDs.
- Medidas em inteiros com a unidade no nome (`amountMl`, `weightGrams`).
- Toda mudança de schema gera migration nova com `drizzle-kit generate`. **Nunca edite uma migration existente** nem escreva uma à mão.
- Exclusão de registro de usuário é soft delete. A única exceção é `DELETE /v1/me`, que apaga a conta de verdade.

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
3. Antes de terminar, rode `bun run lint`, `bun run typecheck` e os testes relevantes (`bun run test:integration` se tocou em sync, auth ou banco). Corrija o que falhar.
4. **Não faça commit.** Deixe todas as mudanças no working tree para o Julio revisar e commitar. Também não faça push, não crie branch e não rode `drizzle-kit migrate` contra nenhum banco que não seja o local.
5. Termine com um resumo curto: o que mudou, arquivos tocados, migrations geradas, mudanças no contrato e qualquer decisão que precise de revisão.
