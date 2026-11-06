# CLAUDE.md — Fluvi

O Fluvi é um app Android de meta de água e registro de peso, com uma API própria para sincronizar os dados entre aparelhos e, no futuro, uma versão web. O app é **local-first**: funciona inteiro sem conta e sem internet. A conta é opcional e só existe para o sync.

Este arquivo vale para o repositório inteiro. Cada app tem o próprio `AGGENTS.md` e `PATTERNS.md`, que você deve seguir ao trabalhar dentro dele.

## Estrutura

```
fluvi/
├── apps/
│   ├── mobile/          # @fluvi/mobile — Expo, SQLite + Drizzle
│   └── api/             # @fluvi/api — NestJS, PostgreSQL + Drizzle
└── packages/
    └── contracts/       # @fluvi/contracts — schemas Zod compartilhados
```

- **Bun** gerencia pacotes e workspaces; **Turborepo** orquestra as tarefas.
- `apps/mobile` e `apps/api` **nunca importam um do outro**. Tudo que os dois precisam concordar mora em `packages/contracts`.

## Comandos

Rode a partir da raiz:

```bash
bun install                                   # instala tudo
bunx turbo build --filter=@fluvi/contracts    # builda os contratos
bunx turbo lint typecheck                     # lint e typecheck de todos os pacotes
bunx turbo test                               # testes de todos os pacotes
bunx turbo dev --filter=@fluvi/api            # sobe só a API
```

Comandos específicos de cada app (development build do Expo, migrations, testes de integração) estão no `CLAUDE.md` de cada um.

## `packages/contracts`

É o contrato entre app e API. Uma mudança aqui quebra o typecheck dos dois lados, de propósito.

- Contém só **schemas Zod, tipos inferidos e constantes** (incluindo os códigos de erro da API). Nada de lógica e nenhuma dependência de Nest, Drizzle, Expo ou React Native.
- É compilado com `tsup`. Depois de mudar o pacote, builde ele antes de rodar o typecheck dos apps.
- O `src/index.ts` é a entrada pública do pacote e a única exceção à regra de não usar barrel files.
- **Compatibilidade:** versões antigas do app continuam instaladas nos aparelhos. Mudanças precisam ser aditivas (campo novo opcional no push, campo novo na resposta). Se uma tarefa exigir renomear, remover, mudar o tipo de um campo ou torná-lo obrigatório, **pare e pergunte antes**: isso exige uma rota `/v2` na API.
- Toda mudança de contrato deve ser refletida nos dois apps na mesma tarefa, ou explicada no resumo final se ficou para depois.

## Convenções que valem para tudo

- **Código em inglês:** identificadores, arquivos, tabelas, rotas, campos da API, códigos de erro. **Texto que o usuário vê em português**, sempre no app. A API devolve códigos, nunca mensagens para o usuário.
- O mesmo campo tem **o mesmo nome** no app, no contrato e na API (`amountMl`, `weightGrams`, `localDate`).
- **Medidas em inteiros, com a unidade no nome:** água em ml, peso em gramas. Nunca `amount` ou `weight` soltos, nunca float no banco.
- **Timestamps** viajam como milissegundos desde a época. **Datas locais** viajam como `YYYY-MM-DD`.
- Registros de usuário têm **UUID gerado no aparelho**, colunas de sync e **soft delete**. Os detalhes estão no `PATTERNS.md` de cada app.
- Arquivos em kebab-case, export nomeado, imports com alias `@/` dentro de cada app.
- **Biome** para lint e formatação em todos os pacotes.

## Como trabalhar

1. Abra o Claude Code na raiz. Ao mexer em `apps/mobile` ou `apps/api`, siga o `CLAUDE.md` e o `PATTERNS.md` daquele app.
2. Para tarefas que atravessam pacotes (contrato + API + app) ou mexem em banco, sync ou auth, apresente um plano curto antes de escrever código.
3. Se um caso não estiver coberto pelos documentos, pergunte em vez de criar um padrão novo.
4. Antes de terminar, rode lint, typecheck e os testes dos pacotes que você tocou. Corrija o que falhar.
5. **Não faça commit.** Deixe todas as mudanças no working tree para o Julio revisar e commitar. Também não faça push nem crie branch.
6. Termine com um resumo curto: o que mudou, em quais pacotes, mudanças de contrato, migrations geradas e decisões que precisam de revisão.