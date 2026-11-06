# Fluvi: Água e Peso

App mobile para acompanhar o consumo de água e o peso no dia a dia, com metas, histórico e gráficos.

O Fluvi nasce com uma proposta simples: registrar um copo de água tem que levar um toque, funcionar sem internet e ser agradável de usar. Em vez de competir em quantidade de funções, ele aposta numa experiência leve, num visual cuidado e em pouquíssima interrupção.

## Funcionalidades

- Meta diária de água, calculada no onboarding e ajustável a qualquer momento.
- Registro rápido do consumo com atalhos de tamanho de copo.
- Registro de peso e acompanhamento da evolução.
- Gráficos de consumo e de peso ao longo do tempo.
- Funciona totalmente offline, com sincronização quando houver conexão.

### Próximos passos

- Lembretes configuráveis (quantidade por dia ou intervalo), sem bloquear o registro.
- Versão web integrada ao app.
- Widgets para Android.
- Versão para iOS.

O lançamento inicial é só para Android, pela Play Store. O MVP sai sem os lembretes.

## Como o app funciona

O Fluvi é **local-first**: todos os dados ficam num banco SQLite no aparelho, e a interface lê e grava direto nele. Uma API em NestJS recebe os dados por sincronização em segundo plano, o que permite usar o app sem internet e, no futuro, acessar os mesmos dados na versão web.

Os detalhes de arquitetura, organização de pastas e convenções estão no [`PATTERNS.md`](./PATTERNS.md).

## Stack

- [Expo](https://expo.dev) (SDK 58) com Expo Router e development build
- TypeScript (strict)
- NativeWind v4 (Tailwind CSS 3)
- expo-sqlite + Drizzle ORM
- Zustand + MMKV
- axios + TanStack Query (features online)
- Zod
- Biome e Bun

## Pré-requisitos

- [Bun](https://bun.sh)
- Android Studio com Android SDK e um emulador configurado, ou um aparelho Android com depuração USB ativada
- JDK 17

O projeto usa **development build** (`expo-dev-client`) e **não roda no Expo Go**, porque depende de módulos nativos (MMKV, anúncios, SQLite com listener de mudanças).

## Rodando o projeto

1. Instale as dependências:

   ```bash
   bun install
   ```

2. Crie o arquivo de ambiente a partir do exemplo e ajuste a URL da API:

   ```bash
   cp .env.example .env
   ```

   | Variável | Descrição |
   |---|---|
   | `EXPO_PUBLIC_API_URL` | URL base da API do Fluvi |

3. Gere e instale o development build no emulador ou no aparelho conectado:

   ```bash
   bunx expo run:android
   ```

   Esse passo compila o app nativo e só precisa ser repetido quando uma dependência nativa for adicionada ou a configuração nativa (`app.json`, plugins) mudar.

4. Nas próximas vezes, basta subir o servidor de desenvolvimento e abrir o app já instalado:

   ```bash
   bunx expo start --dev-client
   ```

### Dependências nativas

Instale sempre pelo Expo, para garantir a versão compatível com o SDK:

```bash
bunx expo install <pacote>
```

Depois de adicionar uma dependência nativa, gere o development build de novo com `bunx expo run:android`.

## Banco de dados

O schema fica em `src/db/schema.ts`. Depois de qualquer mudança nele, gere uma migration nova:

```bash
bunx drizzle-kit generate
```

As migrations são aplicadas automaticamente quando o app abre. Nunca edite uma migration já existente, porque o app pode estar instalado em aparelhos com versões antigas do banco.

## Qualidade

```bash
bun run lint        # Biome: formatação e convenções de nomes
bun run typecheck   # TypeScript
```

Os dois precisam passar antes de abrir um PR. O checklist completo está no [`PATTERNS.md`](./PATTERNS.md).

## Build para a Play Store

Os builds de distribuição são feitos com o [EAS Build](https://docs.expo.dev/build/introduction/), que gera o `.aab` exigido pela Play Store:

```bash
bunx eas-cli build --platform android --profile production
```

## Documentação do projeto

- [`PATTERNS.md`](./PATTERNS.md): arquitetura, estrutura de pastas e convenções de código.
- [`CLAUDE.md`](./CLAUDE.md): instruções para o Claude Code trabalhar no projeto.