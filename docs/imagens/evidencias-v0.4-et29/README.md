# Evidências da ET29 — depois da auditoria

Capturas do app compilado e executado em Chromium real pelo Playwright, na origem local 4173. Todas usam dados sintéticos dos exemplos/testes. Avaliação por tarefa em `et29-review.spec.ts`, integridade gráfica e larguras em `et29-audit.spec.ts`. O [relatório de execução](../../../validation/reports/et29/README.md) distingue testes, inspeção e limites. A [auditoria original](../auditoria-ux-v0.4-2026-11-02/README.md) preserva as capturas anteriores.

## Por tarefa

| Tarefa | Captura |
|---|---|
| T14 | [Potência: resultado anterior e α inválido](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T14-potencia.png`) |
| T15 | [Pareto com fonte 1,2](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-pareto-chart.png`), [Q–Q](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-qq-chart.png`); [PDF Pareto](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-pareto-chart.pdf`), [PDF Q–Q](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-qq-chart.pdf`) |
| T16/T19 | [Navegação e grade protegida](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T16-T19-grade.png`) |
| T17 | [Início](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T17-inicio.png`), [Arquivo](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T17-arquivo.png`), [Exemplo aberto](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T17-exemplo.png`) |
| T18 | [Extremos reais da superfície](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T18-extremos.png`) |
| T20 | [Revisão antes do cálculo](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T20-resumo.png`) |
| T21 | [Exportação](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T21-exportacao.png`), [Versão e compilação](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/T21-sobre.png`) |
| T22 | [375 px](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-375.png`), [800 px](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-800.png`), [1200 px](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-1200.png`), [1920 px](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/et29-1920.png`) |

## Comentários apresentados pelo usuário no navegador

As capturas `comentarios-<tema>-variaveis.png` e `comentarios-<tema>-grade.png` usam **1064×892**, a mesma janela das marcações recebidas. Há uma dupla por tema. Os testes medem introdução→blocos ≥20 px, recolher→etapas ≥12 px, centros das ações do experimento alinhados em até 2 px, grade ocupando >90% da largura útil e ações da linha limitadas a 44×44 px.

- [Clay: variáveis](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-clay-variaveis.png`) e [grade](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-clay-grade.png`).
- [Soft Light](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-soft-light-grade.png`), [Modern Dark](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-modern-dark-grade.png`), [Professional](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-professional-grade.png`), [Industrial](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-industrial-grade.png`), [Organic](../../planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et29/comentarios-organic-grade.png`).

As capturas `tema-<tema>.png` documentam a seção de gráficos em cada um dos seis temas. `manifesto.json` registra tamanho e SHA-256 dos arquivos, permitindo conferir a evidência arquivada. PNG exportado e screenshot são capturas diferentes; quando têm o mesmo nome, o PNG arquivado é o arquivo gerado pelo botão da figura.

Complemento de fechamento: `tema-*-800.png` e `tema-*-1920.png` (seis temas); `firefox-et29-qq-chart.*` e `firefox-et29-pareto-chart.*` confirmam a composição/exportação no Firefox. Manifesto atualizado em `SHA256SUMS.txt`.
