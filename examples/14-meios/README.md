# Exemplo 14 — Meio de cultivo de *A. oryzae* (dados fictícios do usuário)

**Dados fictícios**, criados pelo usuário ao usar a v0.3.0 publicada e autorizados para o repositório (2026-11-02). Um **DCCR** (composto central rotacional) com dois fatores — **Glicose** (5 a 20 g/L) e **Peptona** (5 a 15 g/L) — e três pontos centrais (11 ensaios, aleatorizados), resposta **Biomassa** (g/L), seguido de **otimização por desejabilidade** (maximizar a biomassa) e de um **experimento de confirmação** ligado (2 ensaios).

| Arquivo | O que é |
|---|---|
| [`Meio_01.enzitag`](Meio_01.enzitag) | Projeto com os dois experimentos, as análises de superfície guardadas (o modelo final tem Glicose, Peptona, Glicose² e Peptona²) e a otimização |
| [`meio-de-cultivo-a-oryzae-relatorio.pdf`](meio-de-cultivo-a-oryzae-relatorio.pdf) e [`.docx`](meio-de-cultivo-a-oryzae-relatorio.docx) | Relatórios exportados pela **v0.3.0** que **mostram o defeito** registrado no [plano da v0.4 §2.1](../../docs/planos-execucao/plano-v0.4.md#21-defeitos-encontrados-na-v030-publicada-2026-11-02): só a proveniência e a otimização aparecem; o resumo, o modelo e as figuras da superfície faltam. Ficam como evidência e como caso de teste da correção |

## Uso

Abra `Meio_01.enzitag`: os resultados da superfície e da otimização voltam sem recálculo. Corrigido na v0.4 (ET29-T01; teste `report-sections.spec.ts` com este projeto): exportar o relatório (HTML, PDF ou Word) **com a barra de seções ativa** deve trazer o resumo, o modelo, a ANOVA, as figuras e a otimização.

Não há resultado de referência independente para este exemplo: ele serve para reproduzir o percurso real e o defeito do relatório, não para validar números.
