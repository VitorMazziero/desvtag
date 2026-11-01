# import_xlsx / 001-acentos-virgula-ausentes-formula

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

O leitor de XLSX devolve, como texto, apenas os **valores armazenados**, preservando acentos e vírgula decimal digitada como texto, tratando vazio como ausente e **sem executar fórmulas**?

## Dados

`input.xlsx` (gerado por `validation/tools/make_import_cases.py` com openpyxl): duas planilhas (`Dados`, `Notas`); texto `10,5` com vírgula decimal; número `11.5`; inteiro; células vazias; mesma unidade experimental (`U1`) em duas linhas (medidas repetidas da mesma unidade); caracteres `ç ã é ü ñ 日本`; uma data; um erro `#DIV/0!`; uma fórmula `=SUM(B2:B6)` sem valor armazenado. Dados sintéticos.

## Referência independente

O arquivo foi escrito por openpyxl; o resultado esperado em `expected.json` foi escrito por regra explícita no gerador, sem ler o resultado do leitor testado.

## Resultados esperados e tolerâncias

Igualdade exata das grades de texto e das contagens de avisos. Sem tolerância numérica (não há cálculo).

## Diferenças admitidas

Nenhuma.

## Execução

`app/crates/optima-project/tests/import_xlsx_validation.rs` (nativo) e o mesmo arquivo pelo WebAssembly em `app/web/src/services/engine/import.parity.test.ts`.
