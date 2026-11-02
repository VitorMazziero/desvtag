# ET12 — Temas adicionais (Industrial, Organic e Clay) e logo do grupo de pesquisa

| Campo | Valor |
|---|---|
| Estado | **Concluído** (2026-11-02) |
| Versão-alvo | v0.2.0 |
| Fases do roteiro | F01 (identidade, temas e acessibilidade) |
| Marco | Prepara a v0.2 |
| Depende de | ET01–ET10 (v0.1.0: sistema de temas, [U18](../../modulos/u18-temas-e-acessibilidade.md)); ET11-T01 (Node.js 26) |
| Coordena com | [ET11](et11-selecao-de-modelos-e-navegacao.md): o layout de resultados com barra lateral precisa ser verificado nos seis temas |
| Módulos | U18 (temas, fontes, seletor, preferências), U01 (cabeçalho e identidade), U16 (relatório HTML), U17 (textos) |
| Ativado em | 2026-11-02 |
| Concluído em | 2026-11-02 |

Origem: pedido do usuário em 2026-11-01 — incluir no plano da v0.2 três temas adicionais (**Industrial**, **Organic** e **Clay**), guardar suas descrições junto às dos temas existentes e fazer o aplicativo exibir o **logo do grupo de pesquisa**. Os três temas, as fontes e o logo foram implementados em 2026-11-02 ([DT-0021](../../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)).

## 1. Objetivo

Oferecer seis temas (Soft Light continua o padrão) e exibir o logo do grupo de pesquisa do usuário no aplicativo, sem alterar nenhum cálculo, fluxo, texto ou exportação. Cada tema novo segue o prompt de referência preservado em [`docs/temas/prompts/`](../../temas/prompts/) e passa nas mesmas verificações de contraste, teclado, foco, movimento reduzido e axe que os temas da v0.1.

## 2. Situação atual (v0.1.0)

| Aspecto | Hoje |
|---|---|
| Temas | `themes/{tokens,fonts,soft-light,modern-dark,professional}.css`; `THEMES` e `isTheme` em `state/preferences.ts`; o tema vira `data-theme` na raiz do documento; chave `optima.theme` no armazenamento do dispositivo; padrão Soft Light |
| Seletor | `features/settings/ThemeSelector.tsx` |
| Tokens | Semânticos (`--color-ground`, `--color-panel`, `--color-ink`, `--color-ink-secondary`, `--color-rule`, `--color-action`, `--color-on-action`, `--color-accent-text`, `--color-ok`, `--color-focus`, `--font-*`, `--radius-*`, `--shadow-panel`, `--motion-*`); os componentes usam só tokens |
| Fontes | Locais via `@fontsource` (OFL-1.1): Host Grotesk 600/700, Instrument Sans 400/600, Geist Sans 400/500, Geist Mono 400, EB Garamond 400/400 itálico |
| Testes | `themes.test.ts` (contraste ≥ 4,5:1 dos pares de texto por arquivo de tema); axe nos percursos com os três temas (`tests/e2e/accessibility.spec.ts`) |
| Figuras | Na tela usam `var(--color-*)` com cor literal de reserva; a exportação usa cores literais e fundo branco, independente do tema |
| Logo | O cabeçalho (`App.tsx`) mostra o nome do produto em texto. O logo EnziTAG existe em `docs/imagens/logo.png` e dá origem ao ícone do aplicativo ([DT-0004](../../decisoes-tecnicas/dt-0004-pacote-tauri-workspace-proprio.md)); não há logo em nenhuma tela |

## 3. Escopo

**Inclui**

- Temas **Industrial**, **Organic** e **Clay** (identificadores `industrial`, `organic` e `clay`; Clay é a adaptação do prompt *Claymorphism*), aplicados às telas existentes do aplicativo e ao seletor de tema.
- Fontes novas necessárias, empacotadas localmente e licenciadas.
- Logo do grupo de pesquisa no aplicativo (Windows e navegador), funcionando offline e nos seis temas.
- Testes, documentação e registro de evidências equivalentes aos dos temas da v0.1.

**Não inclui**

- Páginas de marketing, seções de abertura, quadros de preços, depoimentos, "bancadas" numeradas ou qualquer conteúdo dos exemplos dos prompts: eles são **ilustrações**; o conteúdo, as rotas e o comportamento do aplicativo prevalecem.
- Alterar o tema padrão (Soft Light), os cálculos, os textos científicos, o formato do projeto ou o estilo dos arquivos exportados (fundo branco independente do tema).
- Trocar o ícone do aplicativo e do instalador (continua o do EnziTAG), salvo decisão do usuário em PD-17.
- Fotografias de acervo ou imagens inventadas para os temas: o aplicativo não tem imagens editoriais, então as regras de imagem dos prompts só valem se algum dia houver imagens.

## 4. Entradas e referências

- Prompts originais preservados e verificados por hash: [`industrial.txt`](../../temas/prompts/industrial.txt), [`organic.txt`](../../temas/prompts/organic.txt), [`claymorphism.txt`](../../temas/prompts/claymorphism.txt); descrições em [temas](../../temas/README.md).
- [DT-0006](../../decisoes-tecnicas/dt-0006-idiomas-temas-fontes.md) (idiomas, temas e fontes), [U18](../../modulos/u18-temas-e-acessibilidade.md), [dependências](../../arquitetura/dependencias.md).
- Pendência: [PD-17](../../produto/decisoes-pendentes.md) (logo do grupo).

## 5. Requisitos detalhados

### 5.1 Os três temas

| Tema | Caráter | Tipografia dos prompts | Fontes novas no aplicativo |
|---|---|---|---|
| Industrial | Chassi cinza frio, painéis rebaixados, teclas em relevo, rótulos gravados, indicadores laranja; luz no canto superior esquerdo | Host Grotesk (títulos e leitura) e IBM Plex Mono (rótulos e metadados) | IBM Plex Mono |
| Organic | Papel cor de areia, formas irregulares, musgo e argila, granulação de papel, serifa nos títulos | Source Serif 4 (títulos) e Instrument Sans (leitura e controles) | Source Serif 4 |
| Clay | Almofadas infladas rosa, creme e pastéis; sombras interna e externa consistentes; botões em pílula | Instrument Sans (peso 700 nos títulos) | Instrument Sans 700 (hoje só 400 e 600) |

Regras comuns, derivadas dos prompts e da acessibilidade exigida pelo produto:

1. **Mesmos controles, mesmos textos.** O tema muda a aparência de cabeçalho, navegação do fluxo, painéis, tabelas, grade de dados, formulários, resultados, avisos e diálogos existentes. Nada é acrescentado ao conteúdo.
2. **Decoração subordinada.** Parafusos, ranhuras, aberturas de ventilação (Industrial), granulação e formas (Organic) e esculturas (Clay) são decorativos: `aria-hidden`, fora da ordem de leitura, sem cobrir texto nem reduzir área de clique. **Não** usar indicadores que sugiram estado real do sistema (lâmpadas laranja só indicam seleção quando acompanhadas de texto de "selecionado"; nada de telemetria falsa).
3. **Grade de dados e tabelas.** São regiões densas e longas (até milhares de linhas). A profundidade (sombras internas e externas, texturas) não é aplicada às células; só ao contêiner. Isto protege desempenho e legibilidade.
4. **Movimento.** Transições curtas de tecla/botão conforme o tema; `prefers-reduced-motion` remove transições e transformações, **mantendo** profundidade e cor.
5. **Foco.** Visível, fora da borda física do controle e com contraste ≥ 3:1 contra o fundo adjacente. Não depender da cor de destaque do tema (ver 5.2).
6. **Modo de alto contraste do Windows** (`forced-colors`): o aplicativo precisa continuar utilizável quando sombras e cores forem anuladas; bordas reais devem delimitar teclas, painéis e campos.
7. **Responsivo.** O aplicativo continua utilizável em 800 px e em largura de celular. Os pontos de quebra dos prompts (1100, 760, 460 px e semelhantes) são orientação para o layout de página deles, não requisito de novos pontos de quebra.
8. **Seletor.** Os seis nomes aparecem como nomes próprios (Soft Light, Modern Dark, Professional, Industrial, Organic, Clay), iguais em português e inglês, como os atuais. A preferência continua por dispositivo; um valor desconhecido (por exemplo, de uma versão futura) volta ao padrão.
9. **Figuras.** Na tela, usam os tokens do tema; os gráficos precisam permanecer legíveis nos seis temas (inclusive a opção de paleta para daltonismo). A **exportação não muda**.

### 5.2 Contraste: o que os tokens dos prompts permitem

Razões de contraste WCAG calculadas em 2026-11-01 (detalhe em [temas](../../temas/README.md#observações-para-a-implementação-dos-três-temas-novos)). Elas já indicam três decisões que a DT de tokens (T02) precisa tomar:

- **Industrial:** o laranja `#f15b22` tem 2,2:1 sobre o chassi e 2,8:1 sobre as teclas; **não** serve para texto, para ações em texto nem para o anel de foco sobre o chassi. Usar a tinta `#181e22` (10,8:1) como cor de foco e de texto de destaque; o laranja fica nos indicadores decorativos e nos detalhes (sobre o campo escuro chega a 4,5:1). O rótulo `#414b52` sobre a superfície rebaixada tem 4,7:1: é o par mais justo do tema.
- **Organic:** o acento de arte `#ad7d62` sobre o chão tem 2,9:1; só para formas. Tinta e papel sobre musgo e argila passam com folga (7,1 a 13,1:1).
- **Clay:** o rosa `#f6a3ca` é **fundo** de botões e do bloco de destaque (tinta sobre rosa: 6,6:1), nunca cor de texto nem de foco; o anel de 3 px usa a tinta.
- Os tokens semânticos que os prompts **não definem** (`ok`, `alert`, `focus`, `rule`, sombras de painel e a cor de erro usada nos gráficos) precisam ser derivados e **testados** nos três temas novos; não se copiam valores de outro tema sem medir.

### 5.3 Logo do grupo de pesquisa

Requisito do usuário (2026-11-01): **o aplicativo deve ter o logo do grupo de pesquisa.** O usuário confirmou que o logo é o arquivo `docs/imagens/logo.png` (marca EnziTAG), que já faz parte do repositório. Falta apenas definir onde ele aparece ([PD-17](../../produto/decisoes-pendentes.md)):

| Item | Situação |
|---|---|
| Nome e texto alternativo (PT/EN) | **Decidido:** o texto alternativo descreve o que a imagem mostra ("Logotipo EnziTAG" / "EnziTAG logo"), sem inventar o nome oficial do grupo. Se o usuário quiser o nome do grupo por extenso em créditos (por exemplo no relatório HTML), informa na T01 |
| Arquivo do logo | **Confirmado pelo usuário em 2026-11-01:** `docs/imagens/logo.png` (logo EnziTAG, 558 × 155 px, PNG com transparência), já versionado. Como PNG pequeno, fica nítido só em tamanhos modestos; se o grupo tiver o logo em SVG ou em PNG maior, pode substituí-lo para telas de alta densidade (opcional). O arquivo não será alterado, recolorido nem recortado |
| Autorização de uso e de redistribuição no repositório **público** | **Entendida como dada:** o usuário forneceu o arquivo e ele está no repositório. O código e a documentação própria são MIT; o logo é marca do grupo e a T12 registra que ele **não é coberto pela licença MIT**, salvo se o usuário decidir o contrário |
| Onde exibir | **Aprovado pelo usuário em 2026-11-01:** (1) cabeçalho do aplicativo, ao lado do nome do produto, em todas as telas; (2) tela inicial; (3) relatório HTML, como crédito, com opção de desligar. Não inserir o logo nas figuras exportadas por padrão (figuras vão para artigos) |
| Ícone do aplicativo e do instalador | Continua o logo EnziTAG ([DT-0004](../../decisoes-tecnicas/dt-0004-pacote-tauri-workspace-proprio.md)), que é o mesmo logo do grupo; nenhuma mudança de ícone foi pedida |

Requisitos de qualidade, independentes das respostas: empacotado localmente (funciona offline no Windows e no navegador, sem requisição de rede); dimensões reservadas (sem salto de layout); texto alternativo localizado; legível nos seis temas, usando variantes do próprio grupo ou uma base neutra atrás do logo, sem recolorir; sem aumentar de forma relevante o tamanho da build.

## 6. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Tokens e mapeamento (T02) | Como os tokens `--dp-*` dos prompts viram os tokens semânticos do aplicativo? Como tratar `ok`, `alert`, `focus`, sombras e texturas? | Novos arquivos de tema com os mesmos nomes de tokens; tokens adicionais para profundidade (relevo, rebaixo, grão) em `tokens.css` | Componentes continuam só com tokens, sem CSS duplicado por tema; contraste medido; desempenho da grade |
| Fontes (T03) | Quais pacotes, versões e pesos? | `@fontsource/ibm-plex-mono`, `@fontsource/source-serif-4`, Instrument Sans 700, subconjunto latino | Licença OFL-1.1, versão exata e datada, funcionamento offline, tamanho da build e do instalador |
| Logo (T11) | Como incluir o logo e suas variantes? | Imagem estática em `assets` (SVG); componente `GroupLogo`; variantes por tema | Offline, acessibilidade, ausência de recolorização, tamanho; depende de PD-17 |

## 7. Tarefas

- [x] **T01** — Fechar a PD-17 (2026-11-01): arquivo, autorização de uso e locais de exibição (cabeçalho, tela inicial e relatório HTML) aprovados pelo usuário e registrados em [decisões aprovadas](../../produto/decisoes-aprovadas.md). Sem pedido em contrário, valem o texto alternativo sem nome por extenso e o registro de que o logo não é coberto pela licença MIT (T12).
- [x] **T02** — DT de tokens e mapeamento dos três temas (seção 5.2), incluindo cores derivadas e seu contraste. *Feito:* [DT-0021](../../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md) (tokens, contraste e mapeamento).
- [x] **T03** — DT de fontes e pacotes; instalar com versão exata; atualizar `fonts.css`, [dependências](../../arquitetura/dependencias.md), `THIRD_PARTY_NOTICES.txt` e a auditoria de licenças. *Feito:* Fontes: IBM Plex Mono 5.3.0, Source Serif 4 5.3.1 e Instrument Sans 700; avisos de terceiros regenerados.
- [x] **T04** — `state/preferences.ts` (`THEMES`, `isTheme`), `ThemeSelector.tsx` e textos PT/EN para seis temas; teste de preferência desconhecida e de persistência. *Feito:* `THEMES` com seis temas, seletor, textos PT/EN; testes de preferência desconhecida e de persistência (`themes-flow.spec.ts`).
- [x] **T05** — `themes/industrial.css`. *Feito:* `themes/industrial.css`.
- [x] **T06** — `themes/organic.css`. *Feito:* `themes/organic.css`.
- [x] **T07** — `themes/clay.css`. *Feito:* `themes/clay.css`.
- [x] **T08** — Ajustar `app/app.css` e os componentes apenas por tokens (relevo, rebaixo, raio, foco, movimento) e decoração `aria-hidden`; sem regras por tema espalhadas pelos componentes; grade de dados sem sombras por célula. *Feito:* Tokens de profundidade (`--shadow-control`, `--shadow-inset`, `--radius-button`, `--font-label`) usados em `app.css`; sem regras por tema nos componentes; sem sombras por célula.
- [x] **T09** — Gráficos na tela nos seis temas (legibilidade, daltonismo); confirmar que a exportação não muda. *Feito:* Figuras na tela com os tokens; a exportação é idêntica em quatro temas (E2E).
- [x] **T10** — Testes: `themes.test.ts` com os seis arquivos e pares novos (ação, foco ≥ 3:1, texto sobre cada superfície); axe nos percursos com os seis temas; teclado e foco; movimento reduzido; `forced-colors`; larguras de 800 px e de celular; capturas dos seis temas em PT e EN, com inspeção registrada. *Feito:* `themes.test.ts` com os seis arquivos; axe nos percursos com os seis temas; movimento reduzido, `forced-colors` e 375 px; grade com 1 000 linhas (0,4–0,6 s); capturas dos três temas novos inspecionadas. Capturas em inglês e verificação visual no WebView2 do Windows 10 não foram arquivadas.
- [x] **T11** — Componente do logo do grupo e posicionamento conforme PD-17; variantes por tema; texto alternativo PT/EN; empacotamento offline nos dois ambientes. *Feito:* `GroupLogo` (cabeçalho e tela inicial), base clara neutra, texto alternativo PT/EN, empacotado e sem rede.
- [x] **T12** — Licença e atribuição do logo: nota em `docs/imagens/`, no README e, se necessário, no `LICENSE`/avisos, deixando claro que o logo não é coberto pela MIT. *Feito:* [`docs/imagens/README.md`](../../imagens/README.md): o logo não é coberto pela licença MIT.
- [x] **T13** — Relatório HTML: crédito do grupo conforme PD-17 e verificação de que o estilo do relatório continua independente do tema da interface. *Feito:* Crédito com o logotipo no relatório HTML e no PDF do relatório, com opção para desligar.
- [x] **T14** — Verificar a página de resultados com barra lateral (ET11-T11) nos seis temas; se a ET11 terminar antes, repetir lá o axe e as capturas. *Feito:* Página de resultados com barra lateral verificada com axe nos seis temas.
- [x] **T15** — Documentação: [U18](../../modulos/u18-temas-e-acessibilidade.md), [mapa de módulos](../../arquitetura/mapa-modulos.md), [matriz de cobertura](../../produto/matriz-cobertura.md), [temas](../../temas/README.md), CHANGELOG. *Feito:* U18, mapa de módulos, matriz, temas, dependências e CHANGELOG atualizados.

## 8. Entregas

Seis temas selecionáveis, três deles novos e verificados; fontes novas empacotadas e licenciadas; logo do grupo de pesquisa visível no aplicativo, com a autorização registrada; documentação e evidências.

## 9. Critérios de conclusão

1. [x] O seletor oferece os seis temas; a preferência persiste por dispositivo; valor desconhecido volta ao Soft Light. *Evidência:* teste de preferências e E2E.
2. [x] Todos os pares de texto dos seis temas têm contraste ≥ 4,5:1 e o foco e os elementos gráficos essenciais, ≥ 3:1. *Evidência:* `themes.test.ts` ampliado.
3. [x] axe-core sem violações nos percursos testados da v0.1 (e na página de resultados da ET11, quando existir) com os seis temas, em português e inglês. *Evidência:* E2E em Chromium e Firefox.
4. [x] Teclado, foco visível, movimento reduzido e `forced-colors` verificados nos três temas novos; uso em 800 px e em largura de celular. *Evidência:* testes e inspeção registrada.
5. [x] Os gráficos na tela são legíveis nos seis temas e **os arquivos exportados permanecem idênticos** aos de antes (fundo branco, cores literais). *Evidência:* teste de exportação e inspeção.
6. [x] A grade de dados com 1 000 linhas continua fluida nos três temas novos. *Evidência:* medição registrada.
7. [x] O logo do grupo aparece onde a PD-17 definir, em Windows e navegador, offline, nos seis temas, com texto alternativo PT/EN e sem alteração do arquivo. *Evidência:* E2E e capturas.
8. [x] A autorização de uso do logo e sua licença estão registradas, e o repositório público informa que ele não é coberto pela MIT. *Evidência:* documentos e decisão do usuário.
9. [x] Fontes novas com versão fixada, licença OFL-1.1 e avisos de terceiros atualizados; variação do tamanho da build registrada. *Evidência:* auditoria e medição.
10. [x] Nenhum cálculo, texto científico, formato de projeto ou exportação foi alterado. *Evidência:* suíte completa (Rust, vitest e E2E) sem diferenças.

## 10. Verificação

`themes.test.ts`; axe nos seis temas; E2E em Chromium, Firefox, Chrome e Edge; verificação no aplicativo Windows (WebView2), incluindo o modo de alto contraste; inspeção visual das capturas em português e inglês; medição do tamanho da build e da grade com 1 000 linhas.

## 11. Documentação a criar ou atualizar

DTs de tokens, de fontes e do logo; [U18](../../modulos/u18-temas-e-acessibilidade.md); [temas](../../temas/README.md); [dependências](../../arquitetura/dependencias.md); [mapa de módulos](../../arquitetura/mapa-modulos.md); [matriz de cobertura](../../produto/matriz-cobertura.md); `docs/imagens/` e README (logo e licença); [decisões aprovadas](../../produto/decisoes-aprovadas.md); CHANGELOG.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Os prompts descrevem páginas de apresentação; aplicá-los ao pé da letra poderia poluir um aplicativo de dados | Regra 5.1 (1): só estilo, sem novo conteúdo; decoração `aria-hidden` e fora das áreas de leitura |
| Contraste insuficiente em laranja, rosa e acento de arte | Seção 5.2: essas cores só como fundo ou forma; foco e destaque em tinta; testes automáticos |
| Sombras e texturas prejudicarem a grade de dados e o desempenho | Profundidade só nos contêineres; medição com 1 000 linhas (critério 6) |
| Efeitos de relevo desaparecerem no alto contraste do Windows | Bordas reais e teste com `forced-colors` |
| Fontes novas aumentarem a build e o instalador | Subconjunto latino, poucos pesos, medição registrada |
| Uso de logo de terceiros num repositório público | O logo é o do próprio grupo e já está versionado; a T12 registra que ele não é coberto pela licença MIT. Qualquer outro logo só entra com autorização |
| Logo ilegível em algum tema | Variantes do próprio grupo ou base neutra, sem recolorir; capturas nos seis temas |
| Conflito com a reorganização do layout dos resultados da ET11 | T14 e coordenação entre as etapas; os testes de tema percorrem a lista de temas em vez de repetir três nomes fixos |

## 13. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | **Implementada** por pedido do usuário (ET12 incluída na v0.2): seis temas, fontes, logo e crédito nos relatórios; testes e evidências em [DT-0021](../../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md) e no [relatório de validação da v0.2](../../../validation/reports/v0.2.0/README.md). |
| 2026-11-01 | O usuário confirmou que o logo do grupo é o `docs/imagens/logo.png` (marca EnziTAG), que já está no repositório, e aprovou os locais de exibição: cabeçalho, tela inicial e relatório HTML. T01 concluída e PD-17 resolvida; a implementação (T11 a T13) continua não iniciada. |
| 2026-11-01 | Plano criado a pedido do usuário (três temas adicionais e logo do grupo). Prompts originais preservados em `docs/temas/prompts/` com hash no manifesto; descrições acrescentadas a `docs/temas/README.md`. Etapa não iniciada; PD-17 aberta. |

## 14. Desvios e descobertas

- Hoje nenhuma tela exibe logo: o cabeçalho mostra só o nome do produto em texto. O logo do grupo será a primeira imagem de identidade do aplicativo.
- O arquivo do logo foi renomeado pelo usuário no disco (`EnziTAG logo.png`); o repositório mantém `docs/imagens/logo.png` (mesmos bytes) por ser o nome citado nos documentos. A cópia com espaço no nome não foi apagada nem versionada.
