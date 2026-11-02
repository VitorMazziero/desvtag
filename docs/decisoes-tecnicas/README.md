# Decisões técnicas

**Estado:** vigente · **Atualizado em:** 2026-11-01

Registro das escolhas técnicas (DT) com contexto, alternativas e consequências. Decisões de produto ficam nas [decisões aprovadas](../produto/decisoes-aprovadas.md); pendências técnicas ainda abertas, nas [decisões pendentes](../produto/decisoes-pendentes.md).

## Índice

| ID | Título | Estado | Data |
|---|---|---|---|
| [DT-0001](dt-0001-estrutura-documentacao-nomenclatura.md) | Estrutura da documentação, nomenclatura e planos de execução | Aceita | 2026-11-01 |
| [DT-0002](dt-0002-versionamento-primeira-versao.md) | Versionamento e definição da primeira versão | Aceita | 2026-11-01 |
| [DT-0003](dt-0003-toolchain-ferramentas-web-wasm.md) | Toolchain, ferramentas web e build WebAssembly | Aceita | 2026-11-01 |
| [DT-0004](dt-0004-pacote-tauri-workspace-proprio.md) | Pacote Tauri em workspace próprio e transporte nativo | Aceita | 2026-11-01 |
| [DT-0005](dt-0005-contrato-serializacao-tipos.md) | Contrato, serialização e geração de tipos TypeScript | Aceita | 2026-11-01 |
| [DT-0006](dt-0006-idiomas-temas-fontes.md) | Idiomas, temas, fontes e preferências | Aceita | 2026-11-01 |
| [DT-0007](dt-0007-decisoes-et02-interface.md) | Decisões da ET02: grade de dados, navegação, estado, soma e verificação nativa | Aceita | 2026-11-01 |
| [DT-0008](dt-0008-formato-enzitag-versoes-recuperacao.md) | Formato `.enzitag`, política de versões, recuperação e importação | Aceita | 2026-11-01 |
| [DT-0009](dt-0009-fundamentos-numericos-modelos-lineares.md) | Fundamentos numéricos e modelos lineares (ET04) | Aceita | 2026-11-01 |
| [DT-0010](dt-0010-comparacao-de-tratamentos.md) | Comparação de tratamentos: amplitude studentizada, letras, diagnósticos, gráficos e exportação (ET05) | Aceita | 2026-11-01 |
| [DT-0011](dt-0011-planejamentos-dois-niveis.md) | Planejamentos de dois níveis: aleatorização, fracionários, Plackett–Burman, curvatura e desenhos saturados (ET06) | Aceita | 2026-11-01 |
| [DT-0012](dt-0012-superficie-de-resposta.md) | Superfície de resposta: α, Box–Behnken, matrizes personalizadas, extrapolação, equação e renderização 3D (ET07) | Aceita | 2026-11-01 |
| [DT-0013](dt-0013-otimizacao-por-desejabilidade.md) | Otimização por desejabilidade: busca, domínio, candidatos, confirmação e cancelamento (ET08) | Aceita | 2026-11-01 |
| [DT-0014](dt-0014-exportacao-e-relatorio.md) | Exportação: XLSX em Rust, CSV por formato, proteção contra fórmulas, relatório HTML e estilo das figuras (ET09) | Aceita | 2026-11-01 |
| [DT-0015](dt-0015-migracao-node-26-na-v0-2.md) | Migração do Node.js 22 para o 26 na v0.2 (v0.1.x permanece no 22) | Aceita (migração executada em 2026-11-01) | 2026-11-01 |
| [DT-0016](dt-0016-dic-aleatorizado-e-estilo-por-figura.md) | DIC aleatorizado e personalização gráfica por figura salva no projeto (fechamento da v0.1) | Aceita | 2026-11-01 |
| [DT-0017](dt-0017-atualizador-assinado-e-publicacao.md) | Atualizador assinado, instalador sem assinatura de código e fluxos de publicação (ET10) | Aceita | 2026-11-01 |
| [DT-0018](dt-0018-selecao-de-modelos-e-resultados-em-secoes.md) | Seleção e comparação de modelos e resultados em seções com barra lateral (ET11) | Aceita | 2026-11-01 |
| [DT-0019](dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md) | Procedimentos de comparação, ANOVA multifatorial com blocos, DBC e desempenho do valor-p de Tukey (v0.2) | Aceita | 2026-11-01 |
| [DT-0020](dt-0020-figuras-completas-e-exportacao-em-pdf.md) | Personalização gráfica completa e exportação em PDF (v0.2) | Aceita | 2026-11-01 |
| [DT-0021](dt-0021-temas-adicionais-fontes-e-logo.md) | Temas Industrial, Organic e Clay, fontes novas e logo do grupo (ET12) | Aceita | 2026-11-01 |
| [DT-0022](dt-0022-planilha-de-coleta-e-correspondencia-de-ensaios.md) | Planilha de coleta e correspondência de ensaios (ET13) | Aceita | 2026-11-02 |
| [DT-0023](dt-0023-espacamento-dos-controles-logo-unico-e-rolagem-entre-etapas.md) | Espaçamento dos controles, logotipo único e rolagem entre etapas (ET21) | Aceita | 2026-11-02 |
| [DT-0024](dt-0024-sementes-no-navegador-e-pdf-sem-novas-fontes.md) | Sementes no navegador e limitações do PDF mantidas (ET14) | Aceita | 2026-11-02 |

## Regras

- Criar a DT antes do código que depende dela, a partir do [modelo](../modelos/decisao-tecnica.md), com o próximo número livre.
- Uma DT que resolve uma pendência cita o identificador `PD-nn` e a pendência é marcada como resolvida no registro de pendências.
- DT aceita não é editada para mudar a decisão: cria-se outra DT que a substitui, e ambas apontam uma para a outra.
- Os planos de etapa listam, na seção 4, as DTs que precisam ser registradas durante a execução.
