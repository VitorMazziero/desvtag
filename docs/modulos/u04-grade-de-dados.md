# U04 — Grade de dados

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/features/data` |
| Arquivo de entrada | `index.ts` (`DataGrid`) |
| Etapa | ET02 (importação de arquivos na ET03) |

## Responsabilidade

Tabela editável das observações, com colagem do Excel e erros por célula. A conversão de texto em número fica em `editing.ts`; a validade científica é verificada pelo motor (C02).

## Regras de leitura de números (`parseNumberCell`)

Vazio = dado **ausente** (nunca zero). Aceita um único separador decimal (ponto ou vírgula) e notação científica. **Rejeita** separadores de milhar (ambíguos), texto, `NaN` e infinito — `JSON.stringify` transformaria `NaN`/`Infinity` em `null` (ausente) sem aviso. Números fora do alcance de 64 bits geram erro `notFinite`.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `DataGrid.tsx` | Tabela com `<caption>`, cabeçalhos, rótulo acessível por célula, `aria-invalid` e mensagem associada; Enter/↓/↑ movem entre linhas; colagem de várias células |
| `columnRoles.ts` | Papéis das colunas: unidade experimental (opcional, em "Opções avançadas"), fator, resposta |
| `editing.ts` | `parseNumberCell`, `parseClipboard`, `applyPaste` (acrescenta linhas; informa colunas excedentes em vez de descartá-las em silêncio) |

## Limites

Grade simples sem virtualização: adequada às dezenas ou centenas de linhas do uso inicial. Limites operacionais serão medidos na ET10 ([DT-0007](../decisoes-tecnicas/dt-0007-decisoes-et02-interface.md)).

## Testes

`editing.test.ts` (leitura de números, colagem, reducer) e E2E (digitar, colar com vírgula decimal, célula vazia, erro e correção).
