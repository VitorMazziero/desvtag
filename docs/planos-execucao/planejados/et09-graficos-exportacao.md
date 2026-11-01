# ET09 — Gráficos e exportação essenciais

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F10 (recorte da v0.1) |
| Marco | Prepara a v0.1.0 |
| Depende de | ET05; termina após cobrir os gráficos de ET06–ET08 |
| Módulos | C16, U09, U16, U17, U18, P01 (configuração gráfica salva) |
| Ativado em | — |
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

- [ ] **T01** — DTs da seção 4.
- [ ] **T02** — `services/charts/spec.ts`, `renderer.ts`, `export.ts`: especificação única aplicada a todos os gráficos de ET05–ET08.
- [ ] **T03** — U09 `ChartEditor.tsx` com a personalização essencial; configuração salva no documento.
- [ ] **T04** — Estilo e idioma de exportação independentes (U17/U18).
- [ ] **T05** — U16 `figure.ts` (SVG/PNG), `table.ts` (CSV/XLSX), `report.ts` (HTML), `provenance.ts`; `ExportDialog.tsx`.
- [ ] **T06** — Proteção contra fórmulas em CSV/XLSX e testes correspondentes.
- [ ] **T07** — Inspeção visual dos arquivos reais: Excel/LibreOffice, navegadores e editor vetorial; acentos, sobrescritos, unidades e legibilidade.
- [ ] **T08** — Documentação: fichas U09, U16; guia de exportação; matriz de cobertura.

## 6. Entregas

Gráficos personalizáveis e exportações da v0.1 para todas as análises disponíveis.

## 7. Critérios de conclusão

1. Todos os formatos da v0.1 abrem corretamente e correspondem à análise salva.
2. Arquivos exportados contêm método, configuração, revisão e versão.
3. A incerteza representada está sempre nomeada; letras manuais aparecem como anotações.
4. A exportação em inglês com interface em português (e vice-versa) foi verificada.
5. Arquivos inspecionados visualmente, com registro no plano.

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
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
