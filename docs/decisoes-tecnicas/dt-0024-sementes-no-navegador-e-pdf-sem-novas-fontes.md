# DT-0024 — Sementes no navegador e limitações do PDF mantidas (ET14)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-02 |
| Origem | [ET14](../planos-execucao/ativos/et14-itens-adiados-v01-v02.md), tarefas T04 e T05; descoberta 9 da [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md); limitações aceitas da [DT-0020](dt-0020-figuras-completas-e-exportacao-em-pdf.md) |
| Pendências relacionadas | — |
| Substitui / substituída por | Complementa a DT-0016 (aleatorização com semente) e a DT-0020 (PDF) |

## 1. Sementes de aleatorização

**Problema.** A semente é um `u64` no motor, mas os contratos a levam como número JSON, e o JavaScript só representa inteiros exatos até 2⁵³ − 1. A semente 9223372036854775813 (caso 5 do DBC) chegaria alterada ao motor. Os campos de semente aceitavam valores digitados sem limite.

**Decisão.** A **interface** produz e aceita sementes apenas de 0 a 2⁵³ − 1 (`lib/seed.ts`: `clampSeed`, `MAX_SEED`, `randomSeed`, que também substitui as três cópias locais); o campo numérico tem `max`. O **motor continua aceitando qualquer `u64`** (arquivos e testes em Rust). Sementes maiores que 2⁵³ − 1 em projetos vindos de fora não podem ser reproduzidas pela interface: o número JSON perde dígitos no JavaScript antes de chegar ao motor, e isso fica documentado.

**Alternativa descartada:** semente como texto nos contratos. Mudaria `DesignSpec`, `CrdSpec` e `RcbdSpec` e os arquivos `.enzitag` já gravados; o ganho (sementes acima de 9 × 10¹⁵) não compensa, pois a semente aleatória da interface tem 32 bits.

**Evidência.** `lib/seed.test.ts`; o caso do DBC com semente 9223372036854775813 segue verificado apenas no Rust (relatório da v0.2).

## 2. Família de fonte e hachura no PDF

**Decisão: manter as duas limitações aceitas pelo usuário** (texto das figuras em Roboto normal; região de extrapolação com sombreado translúcido em vez de hachura). Embutir Source Serif 4 e IBM Plex Mono no PDF exigiria passar os bytes das fontes ao conversor de SVG (que não abre fontes por nome fora do Node, [DT-0020](dt-0020-figuras-completas-e-exportacao-em-pdf.md)) e adicionaria cerca de 100 a 300 KB por família ao pacote de carga sob demanda; a hachura exigiria desenhar o padrão como linhas recortadas. O benefício é estético; a reavaliação fica condicionada a um pedido concreto do usuário.
