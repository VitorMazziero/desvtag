# U05 — Importação de dados

**Estado:** implementado (CSV, TSV, TXT, XLSX, matriz externa por mapeamento) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/features/import`, `app/web/src/services/import` |
| Arquivo de entrada | `features/import/index.ts` |
| Etapa | ET03 |
| Depende de | U12 (XLSX pelo motor), U04 (regras de leitura de números), U11 (`applyImport`) |

## Responsabilidade

Ler um arquivo para uma **grade de texto**, mostrar a prévia, deixar o usuário escolher o papel de cada coluna e substituir os dados do experimento atual (o conteúdo anterior é preservado como revisão `edit`, e o importado, como revisão `import`). Não calcula estatística e não interpreta números.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `services/import/csv.ts` | `decodeText` (UTF-8, retorno a Windows-1252 com aviso), `detectDelimiter`, `parseCsv` (RFC 4180) |
| `features/import/mapping.ts` | `looksLikeHeader`, `guessMapping` (sugestão), `buildExperimentData` (papéis → dados; identificadores válidos e únicos) |
| `features/import/ImportWizard.tsx` | Prévia, opções (separador, codificação, planilha, cabeçalho), mapeamento e confirmação |
| `features/import/ImportButton.tsx` | Escolha do arquivo e abertura do assistente |
| motor (`import.xlsx`) | Valores armazenados do XLSX; fórmulas nunca executadas |

## Política explícita

- Vazio = **ausente** (nunca zero). Texto decimal com vírgula é preservado como digitado e interpretado depois, com as regras da grade (um separador decimal, sem milhar).
- XLSX: fórmula sem valor armazenado → vazio e aviso; datas → número de série e aviso; erros do Excel → vazio e aviso.
- Linhas totalmente vazias nas colunas importadas são ignoradas e contadas.
- Identificador de observação mapeado precisa ser válido e único; caso contrário a importação é **bloqueada** com as linhas indicadas.
- Linhas com a mesma unidade experimental são medidas repetidas da mesma unidade, não réplicas independentes (texto de ajuda no assistente).

## Testes

`csv.test.ts` (aspas, escapes, quebras de linha, delimitadores, codificações), `mapping.test.ts` (papéis, ids, matriz externa), `project.parity.test.ts` e `import_xlsx_validation.rs` (XLSX contra caso `openpyxl`), E2E `project.spec.ts` (CSV UTF-8 e Windows-1252, XLSX com troca de planilha, ids repetidos) e varredura axe do assistente.
