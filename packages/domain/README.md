# @fluvi/domain

Regras de negócio do Fluvi como funções puras, em TypeScript sem dependências. O app usa este pacote offline para calcular meta, totais e gráficos; a API usa para validar o que chega no sync.

Nenhuma função lê o relógio, faz I/O ou guarda estado: "hoje" sempre entra como parâmetro.

## Unidades e datas

- Água em ml e peso em gramas, sempre inteiros (70,5 kg = `70500`).
- Datas de calendário são `LocalDate`, uma string `YYYY-MM-DD`. Somar dias e gerar intervalos usa UTC por baixo, então fuso e horário de verão não interferem.
- `localDateFromDate(date)` converte um instante para a data no fuso do aparelho. É o único ponto que usa hora local.
- Registros com `deletedAt` preenchido (exclusão lógica) são ignorados em todos os cálculos, inclusive no histórico de metas. `deletedAt` nulo ou ausente significa registro ativo.
- Os campos têm os mesmos nomes do app, do contrato e da API: `amountMl`, `weightGrams`, `dailyGoalMl`, `localDate`, `effectiveFrom`, `updatedAt`, `deletedAt`.

## Meta

- **Sugestão:** peso em kg × 35 + bônus de atividade (nenhuma: 0, moderada: 500, alta: 1000). O resultado é arredondado para o múltiplo de 50 mais próximo (o meio arredonda para cima) e limitado entre 1000 e 6000 ml. Exemplo: 70 kg com atividade moderada = 2950 ml.
- O bônus de atividade alta é provisório e fica em `HIGH_ACTIVITY_BONUS_ML`.
- **Meta válida no app:** inteiro entre 1000 e 6000, múltiplo de 50.
- **Meta válida no sync:** inteiro entre 500 e 10000. A faixa é mais larga para que registros de outros clientes ou versões não sejam rejeitados.
- A sugestão é oferecida quando é diferente da meta atual.
- **Histórico:** cada mudança de meta vale a partir de uma data. A meta de um dia é a da mudança mais recente até aquele dia. Antes da primeira meta, o dia não tem meta.
- **Uma meta por dia:** mudar a meta num dia que já tem meta atualiza o registro daquele dia, sem criar outro. Duas metas com a mesma data só aparecem quando dois aparelhos offline criam meta para o mesmo dia. O sync resolve: vale a de `updatedAt` mais recente, e a outra é marcada como excluída.
- Por segurança, o pacote continua tolerando duplicatas com a mesma regra: vale o `updatedAt` mais recente e, se empatar, a meta maior. A ordem da lista nunca importa.

## Água

- Um registro feito no app vale de 1 a 3000 ml, inteiro. No sync, o limite é 5000 ml.
- O total do dia é a soma dos registros não excluídos daquele dia.

## Peso

- Um peso digitado no app vale de 20 a 400 kg, com no máximo uma casa decimal. No sync, vale qualquer número inteiro de gramas na mesma faixa.
- O texto digitado aceita `70`, `70,5` ou `70.5`. Mais de uma casa decimal, texto que não é número ou valor fora da faixa é rejeitado.
- **Um peso por dia:** registrar peso num dia que já tem peso atualiza o registro daquele dia, sem criar outro. Duplicatas só aparecem quando dois aparelhos offline registram peso no mesmo dia. O sync resolve: vale o de `updatedAt` mais recente, e o outro é marcado como excluído. Por segurança, o pacote continua tolerando duplicatas com a mesma regra.
- A variação é a diferença entre o peso do dia mais recente e o do dia anterior com registro.

## Dia, sequência e período

- Um dia bateu a meta quando o total do dia é maior ou igual à meta daquele dia. Um dia sem meta não conta como batido nem como falha.
- **Sequência:** dias seguidos batendo a meta, contando para trás a partir de hoje. Hoje só conta se já bateu; se ainda não bateu, a contagem começa de ontem e a sequência não é quebrada.
- **Período (7 ou 30 dias):** para cada dia, o total, a meta e se bateu (vazio quando não havia meta); quantos dias bateram; e a média.
- A média considera só os dias do período com pelo menos um registro, para que os dias antes de o usuário começar não puxem a média para baixo. É arredondada para ml inteiro e fica vazia se nenhum dia teve registro.

## Scripts

```bash
bun run build      # tsup, ESM + CJS com tipos
bun run lint       # Biome
bun run typecheck  # TypeScript
bun run test       # Vitest
```
