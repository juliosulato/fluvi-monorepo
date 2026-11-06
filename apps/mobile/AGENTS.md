Fluvi: Água e Peso. App React Native + Expo para registrar consumo de água e peso, com metas e gráficos. Local-first: a interface lê e grava no SQLite, e uma API NestJS recebe os dados por sincronização. Lançamento inicial só para Android.

## Antes de qualquer tarefa

- Leia o `PATTERNS.md`. Ele é a fonte da verdade para estrutura de pastas, nomes e padrões de cada camada. Este arquivo só resume o que mais importa e o que o lint não pega.
- Antes de criar algo, procure se já existe. Leia o código vizinho da feature e siga o jeito que ele já faz.
- Se a tarefa exigir um padrão que o `PATTERNS.md` não cobre, pare e pergunte. Não invente um padrão novo por conta própria.

## Comandos

- `bun run lint`: Biome (formatação, nomes de arquivos e identificadores, export default).
- `bun run typecheck`: TypeScript strict.
- `bunx drizzle-kit generate`: gera migration depois de mudar `src/db/schema.ts`.
- Dependências nativas: `bunx expo install <pacote>`.

Rode lint e typecheck antes de dar uma tarefa por concluída. Se algum falhar, corrija; não desative regra nem use `any`, `@ts-ignore` ou `biome-ignore` para fazer passar.

## Qualidade do código

- Escreva o código mais simples que resolve o problema pedido. Clareza vence esperteza.
- Faça só o que foi pedido. Não refatore, renomeie nem "melhore" código fora do escopo da tarefa; se notar algo que vale mudar, mencione no final.
- Nomes descritivos dispensam explicação. Se um nome precisa de comentário para ser entendido, troque o nome.
- Funções pequenas com uma responsabilidade. Prefira retorno antecipado a `if` aninhado.
- Tipos explícitos nas fronteiras (props, funções de `data/`, `api/`, utils); deixe a inferência trabalhar no resto.
- Nada de `any`. Para dado de origem desconhecida, use `unknown` e valide com Zod.
- Não deixe código morto, `console.log`, imports sem uso nem TODO sem pedido explícito.
- Trate os casos reais: lista vazia, primeiro uso sem dados, valor inválido digitado. Não trate casos impossíveis.

## Comentários

- Por padrão, não comente. O código deve se explicar pelos nomes e pela estrutura.
- Comente só o **porquê** que o código não consegue mostrar: uma restrição de plataforma, um bug de biblioteca contornado, uma regra de negócio que parece estranha.
- Nunca comente o **o quê** (`// adiciona o registro`, `// retorna o total`), nem narre a mudança que você fez (`// alterado para usar localDate`).
- Sem JSDoc em componentes e funções internas. Sem blocos de comentário separando seções do arquivo.

## Abstrações

- Não crie abstração para um uso só. Espere o segundo ou terceiro caso real antes de extrair um helper, um hook genérico ou um componente compartilhado.
- Duplicação pequena é melhor que abstração errada.
- Não crie camadas além das que o `PATTERNS.md` define: nada de services, repositories genéricos, factories, classes base ou wrappers em volta de bibliotecas que já estão configuradas em `lib/`.
- Não adicione parâmetros, opções ou flags "para o futuro". Construa para o requisito de hoje.
- Não adicione dependência nova sem perguntar antes. Se a plataforma ou uma lib que já está no projeto resolve, use.

## Regras que o lint não pega

- Rotas em `src/app/` só importam e renderizam uma screen.
- Uma feature não importa o interior de outra. A única exceção é `history`, que lê as queries de `data/` de `hydration`, `weight` e `goals`.
- Só arquivos em `features/<feature>/data/` usam o `db`. Componentes e hooks usam as queries (`select...`) e os comandos de `data/`.
- Features de dados (água, peso, metas) nunca chamam a API nem importam de `src/sync/`. Só o motor de sync conversa com o servidor sobre esses dados.
- Axios só em `features/<feature>/api/` e `src/sync/`. TanStack Query só nas features online (auth, conta).
- Histórico e meta moram no banco, nunca em store Zustand.
- Toda tabela de dados do usuário tem UUID gerado no cliente, colunas de `syncColumns`, soft delete e, se o registro é diário, `localDate`.
- Toda escrita atualiza `updatedAt`. Toda leitura filtra `deletedAt IS NULL`.
- Medidas são inteiros com a unidade no nome: `amountMl`, `weightGrams`.
- Agrupamento por dia usa `localDate`, nunca o timestamp.
- Mudança de schema sempre vem com migration nova. Nunca edite uma migration existente.
- Cores só por token semântico; hex só via `style` para cor vinda de dados.
- Anúncios só via `AdSlot` e nunca no fluxo de registro.
- Código e nomes de arquivo em inglês; texto da interface e rotas em português.

## Fluxo de trabalho

- **Não faça commit.** Ao terminar, deixe as mudanças no working tree e pare, para o Julio revisar e commitar. Também não faça push, rebase, nem crie branches sem pedido.
- Para tarefas com mais de um arquivo ou alguma decisão de design, apresente um plano curto antes de implementar.
- Ao concluir, resuma em poucas linhas o que mudou, o que ficou de fora e qualquer ponto que mereça atenção na revisão.