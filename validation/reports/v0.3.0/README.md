# Relatório de validação — v0.3.0 (candidata local)

**Estado:** verificação local final em 2026-11-02, na ramificação `feat/v0.3` (PR 6, **não fundido**), com o escopo **fechado por decisão do usuário** (o que não foi entregue vai para a [v0.4](../../../docs/planos-execucao/plano-v0.4.md)). A v0.3.0 **não foi publicada**: sem etiqueta, release nem Pages. · **Data:** 2026-11-02

Este relatório distingue o que **foi executado e tem evidência** do que **permanece pendente ou foi desviado do plano**. Complementa os relatórios da [v0.1.0](../v0.1.0/README.md) e da [v0.2.0](../v0.2.0/README.md), que continuam valendo para o que a v0.3 não alterou. Não declara verificação no Windows 11 (a validação foi dispensada pelo usuário), nem no Safari real, nem com conta real do Google, nem nenhum dos marcos M1–M6. A versão do código é **0.3.0** (`check-versions`); a etiqueta, o release e o Pages dependem do «go» expresso do usuário.

## Resumo

| Pergunta | Resposta |
|---|---|
| O que a v0.3 acrescenta? | Planilha de coleta (matriz com respostas e importação); níveis mistos e misturas (Scheffé, gráfico ternário); planejamentos D e I-ótimos com restrições; comparação pareada e modelo misto; ajuste de saturação (Monod, Haldane, Hill) e calculadora de potência; Google Drive opcional na versão web; relatório em Word; comentários de revisão; canais de atualização; notas de versão formatadas; revisão de espaçamento, logotipo único e rolagem entre etapas |
| Está pronta localmente? | **Sim para o que foi entregue**: compila, passa nos testes e roda em cinco navegadores (Chromium, Firefox, WebKit do Playwright, Chrome e Edge) |
| Está publicada? | **Não.** Depende de autorização do usuário |
| Todo o plano da v0.3 foi entregue? | **Não.** Ver «Desvios e itens não entregues» |
| Windows 11 / Safari real / Drive real? | **Não verificados** |

## Ambiente de verificação

| Item | Versão |
|---|---|
| Sistema | Windows 10 Pro 22H2, build 19045, 64 bits |
| Ferramentas | Rust 1.97.0 (MSVC), Node 26, `wasm-bindgen-cli` 0.2.130, Python 3.12 (NumPy, SciPy, statsmodels nas referências), LibreOffice (conferir o `.docx`) |
| Navegadores do E2E | Chromium, Firefox e **WebKit 27.2** do Playwright 1.64.1, Google Chrome e Microsoft Edge instalados no sistema |

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings` (e o pacote Tauri) | sem avisos |
| `cargo test --workspace --release` | **541 aprovados**, 0 falhas, 3 ignorados (medições de desempenho) |
| Pacote Tauri: `cargo test` | 10 aprovados (inclui o endereço por canal) |
| `biome check`, `tsc --noEmit` | sem erros (6 avisos preexistentes do Biome) |
| `npm run check:contracts` | sem diferenças (**uma execução falhou de forma intermitente** logo após o `cargo test` em lote e não se repetiu em três execuções seguidas; causa não investigada) |
| `vitest` (inclui paridade WebAssembly × referências independentes) | **383 aprovados** (46 arquivos) |
| `node --test scripts/channels.test.mjs` | 4 aprovados |
| Playwright (motor WebAssembly real), 5 navegadores | **671 aprovados de 675** (135 por navegador): os 4 que falharam foram **todos no Firefox**, por tempo esgotado sob carga paralela (4 *workers*; um dos falhos chegou a 1,5 min), e **passaram ao repetir** (3 com 2 *workers*; o axe do tema Industrial sozinho, duas vezes). É a mesma intermitência do Firefox já vista nas etapas anteriores; a causa não foi investigada |
| `check-docs-links`, `check-case-collisions` | 251 arquivos `.md` e 1 518 links; 1 017 arquivos versionados, sem colisões de caixa |
| CI do GitHub (PR 6) | primeira rodada do commit final: **documentação falhou** (pasta `ativos/` vazia fora do git; corrigido) e **Web falhou em 3 testes só no WebKit/Firefox da CI** (no WebKit do Linux o Tab alcança o link de salto e o nome sugerido do download troca espaço por «_»; um teste do Firefox estourou os 30 s); os três eram premissas de teste, corrigidas e verificadas em Chromium e WebKit; Rust, Tauri (Linux e Windows) passaram. A rodada seguinte é registrada na publicação |
| **Verificação nativa no Windows 10** (executável de verificação com `--features automation`, WebView2 por CDP, Windows 10 Pro 22H2) | **aprovada**: motor, `.enzitag`, estatísticas, planejamentos e comparações da v0.2; **na v0.3**: níveis mistos (5 casos), D e I-ótimo (ótimo conhecido e busca exaustiva), t pareado e Wilcoxon, potência e ajuste não linear (SciPy), seleção de modelos de dois níveis (statsmodels), 11 projetos de exemplo reabertos, PDF da figura e do relatório, **relatório em Word, comentário no relatório e comando nativo de atualização por canal** (o canal estável respondeu «não foi possível verificar», esperado: ainda não há manifesto publicado) |

**Não executado nesta rodada:** o instalador NSIS assinado da v0.3 (construído pelo fluxo de release na publicação), o Windows 11 e a CI do GitHub para o último commit (conferida antes da publicação).

## Validação numérica dos métodos novos

Todas as referências são **independentes do código Rust** (Python). Tolerâncias, medidas e limites estão em cada especificação.

| Método | Referência independente | Observação |
|---|---|---|
| [Níveis mistos](../../../docs/metodos/niveis-mistos.md) | implementação independente em Python (PCG32, produto cartesiano) | 6 casos; Rust e WebAssembly |
| [Misturas e Scheffé](../../../docs/metodos/misturas.md) | `itertools`, `statsmodels` | 11 casos; sem limites superiores nem otimização no simplex |
| [Planejamentos ótimos](../../../docs/metodos/planejamentos-otimos.md) | NumPy e busca exaustiva | 6 problemas pequenos; **sem garantia de ótimo global** |
| [Comparações pareadas](../../../docs/metodos/comparacoes-pareadas.md) | `scipy.stats` | t pareado e Wilcoxon |
| [Modelos mistos](../../../docs/metodos/modelos-mistos.md) | `statsmodels`, Satterthwaite independente, ANOVA de medidas repetidas | só intercepto aleatório (simetria composta) |
| [Ajuste não linear](../../../docs/metodos/ajuste-nao-linear.md) | `scipy.optimize.curve_fit` | sem verossimilhança perfilada nem NIST StRD |
| [Potência](../../../docs/metodos/potencia.md) | SciPy (F e t não centrais) | 220 pontos de distribuição e 9 casos; sem simulação |
| Planilha de coleta (ET13) | testes de unidade e E2E (XLSX e CSV) | ida e volta da matriz com respostas |

## Funcionalidades sem referência numérica (verificação funcional)

| Funcionalidade | Como foi verificada | Limites |
|---|---|---|
| **Relatório em Word** | Teste de unidade (pacote, títulos, tabelas, listas, imagens, paginação); E2E em navegador real (mesmos títulos do HTML, na mesma ordem; figuras PNG); abertura e conversão em PDF no **LibreOffice** (5 páginas, conferido a olho) | **Não aberto no Microsoft Word** |
| **Comentários** | Rust (validação e JSON), reducer, E2E (escrever na figura, na tabela e no experimento, responder, resolver, salvar, reabrir, relatório HTML e Word), axe nos seis temas | Sem edição de comentário enviado |
| **Google Drive** | Google **simulado** (unidade e E2E) | **Autorização real não verificada**; Windows sem Drive |
| **Canais de atualização** | Teste do script de canais, do endereço no Rust e da preferência | **Fluxo `channels.yml` e atualização por canal não verificados** (exigem um release publicado) |
| **WebKit** | Suíte E2E inteira no WebKit do Playwright | **Não é o Safari**; Safari real (Mac) não verificado |
| Espaçamento, logotipo único, rolagem (ET21) | E2E de layout em 1200 px e 375 px nos seis temas | — |

## Desvios e itens não entregues

| Item | Situação |
|---|---|
| Domínio próprio | **Não feito** (sem decisão do usuário, PD-13) |
| Safari real | **Não verificado** (sem Mac) |
| Edição simultânea | **Só a [especificação](../../../docs/arquitetura/edicao-simultanea.md)**, aguardando decisões do usuário |
| Drive: Windows (loopback + PKCE, chaveiro), fila persistente, compartilhamento por leitura real | **Adiados** |
| Resultados de misturas, modelos mistos, saturação e potência | **Não são guardados no projeto** nem entram nos relatórios (calculados ao pedir) |
| Seleção de modelos para efeitos de dois níveis (ET14-T03) | **Feita** (statsmodels em 4 fatoriais completos; paridade WebAssembly; E2E); **sem caso independente para fracionários e Plackett–Burman** → v0.4 |
| Verificação do CCD com as capturas do Protimiza (ET14-T02) | **Feita**: a opção «CCD» é o fatorial completo com pontos centrais; contagens e matriz reproduzidas (`protimiza_counts.rs`) |
| Misturas: limites superiores, otimização no simplex; planejamentos ótimos: exemplo, blocos, gráfico de variância; modelos mistos: AR(1), não estruturada, F multi-gl; saturação: perfil de verossimilhança, NIST; potência: simulação | **Não feitos** |
| Exemplos para os métodos da v0.3 | **Criados os 07 a 13** (misturas, Monod, níveis mistos, D-ótimo, medidas repetidas, potência, planilha de coleta), conferidos contra NumPy, SciPy ou `statsmodels` e abertos em E2E |
| Verificação nativa no Windows 10 dos fluxos da v0.3 | **Feita** (ver «Verificações executadas»); falta o instalador NSIS da v0.3, construído na publicação |
| Falhas intermitentes de CI vistas no PR 6 (Windows: «Nenhuma página do WebView2»; um job Web) | **Não investigadas a fundo** |

## Auditoria de dependências e licenças

| Conjunto | Mudança | Licença | Observações |
|---|---|---|---|
| Rust | nenhuma dependência nova no motor; o aplicativo Windows usa o plugin do atualizador em Rust (já presente) | como na v0.1 | — |
| npm — produção | **+ `docx` 9.15.1** (com `@types/node` e `undici-types`); **− `@tauri-apps/plugin-updater`** (a verificação passou ao Rust) | MIT | `docx` fica em um pacote carregado sob demanda (≈ 248 KB) e não acessa a rede |
| `THIRD_PARTY_NOTICES.txt` | regenerado (61 pacotes npm, 7 fontes) | — | — |

## Pendências do usuário

1. Revisar e **autorizar** a fusão do PR 6, a etiqueta `v0.3.0`, o Pages e a publicação do release (nada disso foi feito).
2. **Publicar os releases da série 0.x como releases normais** (não pré-lançamento) e, depois da publicação da v0.3.0, executar `channels.yml` (ou conferir que rodou) e **verificar a atualização por canal**.
3. Decidir sobre **domínio próprio** (PD-13), sobre o **caminho da edição simultânea** (§9 da especificação) e se há um **Mac** para verificar o Safari.
4. Verificar o Drive com uma **conta real do Google** e abrir um relatório `.docx` no **Word**.
