# DT-0007 — Decisões da ET02: grade de dados, navegação, estado, soma e verificação nativa

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET02-T04, ET02-T05, ET02-T14 |
| Pendências relacionadas | PD-04 (algoritmos e tolerâncias), PD-06 (grade de dados) |
| Substitui / substituída por | — |

## Decisões

| Tema | Escolha | Motivo e limite |
|---|---|---|
| Grade de dados | Tabela HTML própria (`<table>` com `<input>` por célula), sem biblioteca | Atende teclado, colagem do Excel e leitores de tela com pouco código e sem dependência. **Sem virtualização:** adequada a dezenas ou centenas de linhas. Limite operacional será medido na ET10; se insuficiente, avaliar TanStack Table ou outra, com critérios de licença compatível com MIT |
| Navegação | Estado interno do fluxo (`useState` da etapa); **sem roteador** | A aplicação tem uma única visão com cinco etapas; URLs por etapa não trazem valor e complicariam a hospedagem estática. `AppShell` e `Router` do mapa não foram criados. Reavaliar se surgirem páginas independentes (ex.: abrir projeto compartilhado) |
| Estado do projeto | `useReducer` + Context (`state/project.ts`, `ProjectContext.tsx`); células guardam o **texto digitado** | Previsível e testável; a conversão para número ocorre ao montar o conjunto de dados, de modo que erros de célula são conhecidos e exibidos. O formato espelha os contratos C01 para ser substituído pelo documento persistido (P01) na ET03 |
| Resultado obsoleto | Assinatura (JSON de dados e opções) guardada com o resultado; etapa de resultados só abre se coincidir | Impede mostrar resultado antigo como atual |
| Soma e variância | Soma compensada de Neumaier e variância por segunda passagem corrigida | Candidatos: duas passagens simples, Welford. Escolhida a combinação cujo erro é limitado e verificável contra aritmética racional; Welford não foi necessário e seu erro em deslocamentos grandes é maior que o da segunda passagem corrigida. Validação: [estatística descritiva](../metodos/estatistica-descritiva.md) |
| Números de entrada | Um separador decimal (ponto ou vírgula); milhar rejeitado; `NaN`/infinito rejeitados | `JSON.stringify(NaN)` produz `null` (ausente): aceitar esses textos mudaria silenciosamente o significado |
| Verificação nativa | WebDriver (`tauri-driver`) + chamada do IPC por `execute/async` | Verifica o comando real em WebKitGTK (Linux) e, na CI, WebView2 (Windows); a descritiva é conferida pelo valor numérico, não só pela presença de texto |
| Acessibilidade automatizada | `@axe-core/playwright` (MPL-2.0, somente desenvolvimento) | Detecta violações WCAG A/AA por etapa e tema; controle negativo no teste |

## Alternativas consideradas

| Alternativa | Motivo de não adotar agora |
|---|---|
| TanStack Table, AG Grid Community, Glide Data Grid | Mais recursos (virtualização, redimensionamento) que a ET02 não exige; custo de dependência e integração com colagem e acessibilidade |
| React Router | Sem necessidade de URLs por etapa |
| Welford online | Um passe, mas sem a correção que remove o erro da média |

## Consequências

- A ET03 troca o estado em memória pelo documento do projeto.
- A ET10 mede o desempenho da grade e decide sobre virtualização.
- `@axe-core/playwright` (MPL-2.0) entra em [dependências](../arquitetura/dependencias.md) como dependência de desenvolvimento.
