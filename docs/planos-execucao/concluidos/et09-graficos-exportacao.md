# ET09 — Gráficos e exportação essenciais

| Campo | Valor |
|---|---|
| Estado | **Ativo** (entrega essencial pronta; lacunas de personalização registradas) |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F10 (recorte da v0.1) |
| Marco | Prepara a v0.1.0 |
| Depende de | ET05; termina após cobrir os gráficos de ET06–ET08 |
| Módulos | C16, U09, U16, U17, U18, P01 (configuração gráfica salva) |
| Ativado em | 2026-11-01 |
| Concluído em | — |

## 1. Objetivo

Unificar a especificação dos gráficos para tela e exportação, oferecer a personalização essencial e entregar os formatos de exportação da v0.1 para todas as análises disponíveis, com proveniência e estilo de exportação independente da interface.

## 2. Escopo

**Inclui**

- `ChartSpec` única para tela e exportação, salva no projeto; edição gráfica não modifica a estatística.
- Personalização essencial: título, rótulos de eixos, unidades, casas decimais, tipo de incerteza (sempre nomeado), posição das letras, paleta (incluindo opção segura para daltonismo), tamanho de fonte e símbolos.
- Letras calculadas permanecem vinculadas às comparações; alterações manuais aparecem como anotações identificadas.
- Estilo de exportação separado do tema, fundo branco por padrão; idioma da exportação independente da interface.
- Figuras **SVG e PNG** (com resolução escolhida); tabelas **CSV e XLSX**; relatório **HTML** autocontido com método, configuração, revisão, versão, tabelas, figuras e interpretação.
- Proteção contra fórmulas acidentais em células textuais exportadas.
- Identificação de partes rasterizadas em gráficos 3D exportados.

**Não inclui**

- PDF de figuras e relatórios e personalização completa (v0.2, F10); DOCX (F14).

## 3. Entradas e referências

- [Roteiro — F10](../roteiro-produto.md#f10--personalização-e-exportação-completas).
- [Decisões aprovadas](../../produto/decisoes-aprovadas.md) §11.
- Contrato `ChartSpec` no [mapa de módulos](../../arquitetura/mapa-modulos.md#contratos-entre-módulos).
- Pendência: PD-06 (renderização e exportação).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Escrita de XLSX | Biblioteca ou implementação | Escritor em Rust compilado para WASM; biblioteca JS | Licença, tamanho, tipos numéricos corretos |
| Relatório HTML | Estrutura e estilos | Arquivo único com SVG embutido e CSS próprio de impressão | Abre offline, imprime bem, sem dependências externas |
| CSV exportado | Separador e decimal por idioma de exportação | `;` com vírgula decimal (PT) e `,` com ponto (EN), configuráveis | Abertura correta no Excel e no LibreOffice |

## 5. Tarefas

- [x] **T01** — DTs da seção 4: [DT-0014](../../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md) (XLSX em Rust, CSV por formato, proteção contra fórmulas, relatório por renderização oculta, estilo e preferências).
- [ ] **T02** — `ChartSpec` única, salva no projeto. *Parcial:* todas as figuras (ET05–ET08) já usam um único gerador SVG para tela e exportação (`services/charts`), com a mesma série e cores diferentes (variáveis do tema × literais); **não** há `ChartSpec` serializada no documento nem `renderer.ts`/`export.ts` separados (ver desvios).
- [ ] **T03** — `ChartEditor` com título, rótulos de eixos, símbolos e posição das letras salvos no documento. **Não feito** (ver desvios). Feito apenas o recorte de preferências: paleta (inclui daltonismo), tamanho do texto e algarismos significativos.
- [x] **T04** — Estilo e idioma de exportação independentes do tema e da interface (`ExportSettings`, `applyChartStyle`, instância i18n clonada no relatório). Preferência do dispositivo, não do projeto.
- [x] **T05** — Figuras SVG/PNG (já existentes, estendidas às figuras 2D/3D de planejamento, superfície e otimização), tabelas CSV/XLSX em todas as análises, relatório HTML e proveniência. Sem `ExportDialog`: botões junto de cada tabela/figura e painel de preferências (ver desvios).
- [x] **T06** — Proteção contra fórmulas em CSV e XLSX, com testes (unitários, Rust, openpyxl e ida e volta).
- [x] **T07** — Inspeção dos arquivos reais (ver registro): relatório HTML em PT e EN (captura), XLSX aberto no LibreOffice, CSV e SVG/PNG lidos byte a byte. Excel e editor vetorial **não** estavam disponíveis.
- [x] **T08** — Documentação: fichas U07/U09/U16, [guia de exportação](../../guias/exportacao.md), matriz de cobertura, mapa de módulos, DT-0014.

## 6. Entregas

Gráficos personalizáveis e exportações da v0.1 para todas as análises disponíveis.

## 7. Critérios de conclusão

1. [x] Todos os formatos da v0.1 abrem corretamente e correspondem à análise salva. *Evidência:* E2E de exportação (XLSX com `PK` e planilhas; CSV em dois formatos; relatório; SVG/PNG), XLSX lido por openpyxl e aberto no LibreOffice (conversão e captura), ida e volta no importador do motor (`export.parity.test.ts`), verificação nativa (`exportXlsx` via IPC do Tauri em Linux e em `windows-latest`, execução 41341992701). **Limite:** abertura manual no Microsoft Excel não registrada.
2. [x] Arquivos exportados contêm método, configuração, revisão e versão. *Evidência:* E2E (`# methodId`, `# revisionId`, planilha *Proveniência*, tabela de proveniência do relatório, `<metadata>` do SVG, `tEXt` do PNG).
3. [ ] A incerteza representada está sempre nomeada; letras manuais aparecem como anotações. *Evidência parcial:* a incerteza é sempre nomeada (ET05–ET07; teste E2E do SVG). **Pendente:** não existem letras manuais nem anotações (não há edição por figura).
4. [x] A exportação em inglês com interface em português (e vice-versa) foi verificada. *Evidência:* E2E `export-flow.spec.ts` nas duas direções, Chromium e Firefox.
5. [x] Arquivos inspecionados visualmente, com registro no plano. *Evidência:* seção 11.

## 8. Verificação

Testes de geração de arquivos; testes de proteção contra fórmulas; inspeção visual registrada; E2E de exportação nas duas plataformas.

## 9. Documentação a criar ou atualizar

Fichas, DTs, `docs/guias/exportacao.md` (novo) e [matriz de cobertura](../../produto/matriz-cobertura.md).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Diferença entre gráfico na tela e exportado | Mesma `ChartSpec` e testes comparando dados das séries |
| Fontes ausentes em SVG aberto em outro computador | Fontes de exportação definidas e testadas; texto convertido apenas quando necessário |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-01 | **XLSX (Rust):** `optima-project::xlsx_writer` e operação `ExportXlsx` (números, textos embutidos, `quotePrefix`, cabeçalho em negrito, largura de colunas, nomes de planilha validados); contratos e WASM regenerados; validado com openpyxl e por ida e volta no importador. |
| 2026-11-01 | **Interface:** `TableExportButtons` (CSV + XLSX) em todas as tabelas; `ExportSettingsPanel` (idioma, formato do CSV, paleta, fonte, algarismos); `ReportButton` (relatório HTML por renderização oculta com i18n clonado); `OptimizationReport` somente leitura. |
| 2026-11-01 | **Defeito encontrado e corrigido na inspeção do relatório:** a evidência da ANOVA da superfície aparecia como `{{mean}}` (chave sem o prefixo `surface.`) também na tela desde a ET07; corrigido e coberto por asserção (`Regression ANOVA: F =`, ausência de `{{`). |
| 2026-11-01 | **Testes:** 227 unitários (web), 49 do `optima-project`, E2E de exportação (XLSX, CSV Excel, relatório PT→EN e EN→PT, paleta, axe nos 3 temas com paleta acessível) e suíte completa em Chromium e Firefox; verificação nativa Linux com `exportXlsx` (aprovada). |
| 2026-11-01 | **Inspeção visual:** relatório HTML do exemplo 04 em PT e EN (capturas de página inteira: proveniência, tabelas, equações, contorno, superfície 3D, observado × previsto, candidatos e compromissos legíveis; seção "Exportar" vazia removida); XLSX de candidatos e coeficientes abertos no LibreOffice (cabeçalho em negrito, números como números, planilha *Proveniência*; colunas estreitas corrigidas com larguras automáticas). |
| 2026-11-01 | **Windows:** execução [41341992701](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41341992701) (commit `bfab182`) aprovada em todos os jobs, inclusive `Tauri (build no Windows)` com a verificação nativa de `exportXlsx` (`windows-latest` = Windows Server 2025; não é Windows 11). |

**Retomada.** Ramo `claude/epic-keller-3ad7jc`; T01, T04–T08 concluídas; T02/T03 e o critério 3 pendentes (lacuna registrada, aguarda decisão do usuário); CI (incl. Windows) aprovada no commit `bfab182`. Próxima etapa: ET10 (integração, verificação e publicação — sem publicar; PD-15 depende do usuário).

## 12. Desvios e descobertas

- **Sem `ChartSpec` salva no projeto, sem `ChartEditor` (T02/T03 e parte do critério 3).** O recorte entregue é o de preferências do dispositivo (paleta, fonte, algarismos, idioma, formato do CSV). Motivo: a edição por figura exige uma especificação serializada no `.enzitag` (campo novo, opcional) e uma interface de edição com validação, o que excede o que foi concluído nesta etapa sem comprometer a verificação das demais. **Consequência para a v0.1:** a linha "Personalização gráfica essencial" da matriz de cobertura permanece **parcial**; a decisão de aceitar a lacuna na v0.1.0 ou implementá-la antes da publicação é do usuário (registrada no relatório final da ET10).
- **Sem `ExportDialog`:** os botões ficam junto de cada tabela e figura (mais direto e já coberto por testes); o painel reúne apenas as preferências e o relatório.
- **Sem escolha de resolução do PNG e sem rotulagem de partes rasterizadas em 3D:** o PNG usa escala fixa 2×; a superfície 3D é SVG vetorial (não há partes rasterizadas).
- **Preferências não vão ao `.enzitag`** (esquema permanece 1; [DT-0014](../../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md), item 5).
- **Relatório sem o editor de otimização:** a otimização entra como estado, fatos, convergência, candidatos e compromissos.
- **Excel não testado manualmente;** LibreOffice (conversão e captura) e openpyxl foram usados.
- **Verificação em Windows:** apenas `windows-latest` (Windows Server 2025); Windows 11 permanece pendente como nas demais etapas.
