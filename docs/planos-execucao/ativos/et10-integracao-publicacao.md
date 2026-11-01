# ET10 — Integração, verificação e publicação da v0.1

| Campo | Valor |
|---|---|
| Estado | **Ativo** (verificação local feita; publicação bloqueada por decisão do usuário e por Windows 11) |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F12 e F13 (recortes da v0.1) |
| Marco | **Versão v0.1.0** |
| Depende de | ET01–ET09 |
| Módulos | Todos os entregues; C19 (situação dos métodos), E02, E04 (`updater`), U18 (`UpdateSettings`) |
| Ativado em | 2026-11-01 |
| Concluído em | — |

## 1. Objetivo

Verificar o produto da v0.1 como um todo, medir limites operacionais, auditar dependências e licenças e publicar a versão `v0.1.0` no canal experimental: aplicativo web e instalador Windows, com notas de versão e atualizador assinado.

## 2. Escopo

**Inclui**

- Matriz de cobertura da v0.1 completa, com evidência por método, variante e plataforma.
- Percursos integrados: quatro condições; PB → DCCR → otimização → confirmação; ambos com salvar, reabrir e exportar nas duas plataformas.
- Robustez: arquivos antigos, falhas de escrita, sessões recuperadas, idiomas, temas, teclado, contraste e preferências.
- Desempenho: tempo e memória em conjuntos representativos e no crescimento de fatores e ensaios; limites operacionais medidos.
- Cancelamento e progresso; descarte de respostas de tarefas canceladas ou revisões antigas.
- Auditoria de dependências, licenças de fontes e ícones, ausência de credenciais e exclusão de `referencias/` dos artefatos.
- Decisão do usuário sobre hospedagem web e visibilidade do repositório (PD-15).
- Build estática para GitHub Pages em `/enzitag-optima/`, com caminhos de assets, WASM e Worker corretos.
- Instalador Windows 11 de 64 bits testado em máquina limpa; GitHub Releases com notas.
- Atualizador com pacotes assinados, canal experimental, instalação no momento escolhido pelo usuário e preservação do trabalho; chave fora do repositório.
- `CHANGELOG.md`, etiqueta `v0.1.0` e relatório de validação da versão.

**Não inclui**

- Canal estável e cobertura completa do catálogo (v1.0.0).
- Domínio próprio, Windows 10 e Safari (F14).

## 3. Entradas e referências

- [Roteiro — F12](../roteiro-produto.md#f12--integração-desempenho-e-cobertura-de-produto) e [F13](../roteiro-produto.md#f13--publicação-e-atualizações).
- [Critérios de lançamento da v0.1](../plano-v0.1.md#6-critérios-de-lançamento-da-v010).
- [Decisões aprovadas](../../produto/decisoes-aprovadas.md) §14 e [repositório GitHub](../../distribuicao/repositorio-github.md).
- Pendências: PD-11 (assinatura de código), PD-12 (navegadores) e PD-15 (hospedagem e visibilidade).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Hospedagem web (PD-15, decisão do usuário) | Como publicar a versão web | Tornar o repositório público; plano GitHub que permita Pages em repositório privado; outra hospedagem estática | Decisão de visibilidade, custo, coerência com §14 |
| Formato do instalador | Tipo de pacote Windows | Instaladores suportados pelo Tauri (NSIS, MSI) | Instalação por usuário, atualização, desinstalação limpa |
| Assinatura de código (PD-11) | Assinar o instalador na v0.1 | Sem assinatura, com instrução nas notas; certificado de assinatura | Custo, alertas do Windows, público inicial |
| Matriz de navegadores (PD-12) | Versões testadas | Versões estáveis vigentes de Chrome, Edge e Firefox na data do teste | Evidência reproduzível |

## 5. Tarefas

- [x] **T01** — Matriz de cobertura revisada (2026-11-01): cada item `v0.1` tem estado e link; os não validados estão **reclassificados com registro** no [relatório de validação](../../../validation/reports/v0.1.0/README.md#lacunas-e-reclassificações) (DIC aleatorizado, personalização por figura, Windows 11, Chrome/Edge, publicação e atualizador).
- [x] **T02** — Percursos integrados nas duas plataformas: percurso 1 (quatro condições → ANOVA → Tukey → letras → exportar → salvar/reabrir; e o DIC aleatorizado de ponta a ponta) e percurso 2 em encadeamento (triagem PB → DCCR → ajuste → otimização → confirmação vinculada → salvar/reabrir/exportar) cobertos por E2E em Chromium 156.0.8078.4, Firefox 157.0, Chrome 156.0.8078.74 e Edge 156.0.4314.58 (260 testes) e pela verificação nativa no Windows 10 e em `windows-latest`. *Limites:* Windows 11 não verificado (decisão do usuário); o percurso 2 é verificado como encadeamento de especificações, não como um único teste ininterrupto.
- [x] **T03** — Robustez, acessibilidade e preferências: recuperação de sessão, descarte, arquivo inválido, esquema futuro, falha de escrita segura (testes do pacote Tauri), CSV Windows-1252, XLSX com fórmulas, axe nos três temas em cada percurso, teclado e preferências de idioma/tema/exportação (ver registro).
- [x] **T04** — Desempenho e limites: [limites operacionais](../../arquitetura/limites-operacionais.md) (teste `performance.rs`, memória, WASM de ponta a ponta, limite de ANOVA/Tukey com muitos grupos).
- [x] **T05** — Cancelamento e respostas obsoletas: testes do cliente (`EngineClient.test.ts`: descarte por canal, cancelamento, falha de transporte) e E2E de cancelamento da busca. Sem progresso incremental (DT-0013).
- [x] **T06** — Auditoria de dependências e licenças (Rust e npm), ausência de credenciais e de `referencias/` no repositório e nos artefatos; avisos de terceiros gerados (`THIRD_PARTY_NOTICES.txt` na build). Registro no [relatório](../../../validation/reports/v0.1.0/README.md#auditoria-de-dependências-e-licenças).
- [x] **T07** — **Decisão do usuário sobre PD-15 obtida em 2026-11-01:** repositório público; Pages por disparo manual ([DT-0017](../../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)). A varredura de credenciais e dados pessoais no histórico foi refeita antes de mudar a visibilidade.
- [ ] **T08** — Workflow de publicação web e teste da URL publicada. *Parcial:* `pages.yml` (disparo manual) criado; a build estática foi servida sob `/enzitag-optima/` e aberta no Chromium e no Firefox. **Falta** disparar a publicação e abrir a URL publicada (depende de ato do mantenedor).
- [ ] **T09** — Instalador e publicação no Releases. *Parcial:* o instalador NSIS assinado para o atualizador foi construído no Windows 10, **instalado em modo silencioso, executado por 10 s e desinstalado sem resíduos**; `release.yml` cria um rascunho de release a partir de uma etiqueta. **Falta** criar a etiqueta, conferir o rascunho e publicá-lo (ato do mantenedor); Windows 11 não verificado.
- [x] **T10** — Atualizador assinado: par de chaves gerado com autorização do usuário (pública em `tauri.conf.json`; privada e senha em segredos do GitHub e cópia local fora do repositório), plugin `tauri-plugin-updater`, permissão mínima, controle “Verificar atualizações” (só no app Windows), `scripts/make-updater-manifest.mjs` (testado) e fluxo `release.yml`; o instalador da 0.1.0 gera `.exe.sig`. **A atualização ponta a ponta só pode ser verificada depois de existir um release publicado** (critério 3).
- [x] **T11** — Notas de versão e [`CHANGELOG.md`](../../../CHANGELOG.md) (rascunho da v0.1.0 marcada como **não publicada**), com métodos, variantes, situação de validação e limitações.
- [x] **T12** — [Relatório de validação](../../../validation/reports/v0.1.0/README.md) da candidata; [`docs/distribuicao/publicacao.md`](../../distribuicao/publicacao.md) contém o **procedimento previsto e o que ainda não foi executado** (não há procedimento executado a registrar).
- [x] **T13** — README (pt/en), `app/README.md`, matriz e índice dos planos atualizados. Planejamento da v0.2: lacunas registradas no relatório (itens para a próxima versão).

## 6. Entregas

Versão `v0.1.0` publicada no canal experimental, com evidências, notas de versão e procedimento de publicação documentado.

## 7. Critérios de conclusão

1. [ ] Critérios de lançamento da [v0.1](../plano-v0.1.md#6-critérios-de-lançamento-da-v010) atendidos. *Situação:* **atendidos, exceto o item 8 (publicação)** — ver o [relatório](../../../validation/reports/v0.1.0/README.md): nada foi publicado e a atualização não foi verificada.
2. [ ] URL e instalador publicados foram abertos e testados. *Situação:* **nada publicado** (instalador local testado no Windows 10; ver T09).
3. [ ] Atualização a partir de versão anterior verificada. *Situação:* **implementada, não verificada** (exige release publicado).
4. [ ] Problemas que comprometem cálculos, integridade dos projetos ou funcionamento nos ambientes declarados resolvidos; limitações documentadas. *Situação:* nenhum problema de cálculo conhecido em aberto; limitações documentadas no relatório, em [limites operacionais](../../arquitetura/limites-operacionais.md) e na matriz; funcionamento em Windows 11 não verificado (decisão do usuário); verificado no Windows 10 e em `windows-latest`.

## 8. Verificação

Execução registrada dos percursos integrados; relatório de validação da versão; teste da URL e do instalador; teste de atualização.

## 9. Documentação a criar ou atualizar

`CHANGELOG.md`, `docs/distribuicao/publicacao.md`, `docs/arquitetura/limites-operacionais.md`, `validation/reports/v0.1.0/`, README (pt/en), [matriz de cobertura](../../produto/matriz-cobertura.md) e índice dos planos.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Publicação bloqueada pela visibilidade do repositório | PD-15 apresentada ao usuário no início da etapa |
| Alertas do Windows com instalador sem assinatura | Decisão PD-11 e instruções nas notas de versão |
| Mistura de frontend antigo com motor novo na web | Versão do protocolo verificada na inicialização; cache invalidado por versão |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-01 | **Ativação** após a ET09 (essencial entregue). Esta etapa foi conduzida **sem publicar nada**, sem alterar a visibilidade do repositório e sem gerar chaves de assinatura. |
| 2026-11-01 | **Desempenho:** `performance.rs` (nativo, `release`) e medição no navegador; superfície e otimização < 70 ms até 5 fatores; ANOVA + Tukey cresce com o número de pares (≈ 0,2 s com 4 grupos; ≈ 3,4 s com 40; ≈ 16 s com 100). Memória de pico 48 MiB. Ver [limites operacionais](../../arquitetura/limites-operacionais.md). |
| 2026-11-01 | **Licenças:** Rust (motor WASM 70 crates; aplicativo Windows 438), npm de produção (14) — nenhuma licença copyleft forte; MPL-2.0 em quatro crates do Tauri (distribuídos sem modificação) e fontes OFL-1.1; `THIRD_PARTY_NOTICES.txt` gerado e incluído na build. Nenhuma credencial encontrada; `referencias/` não versionada. |
| 2026-11-01 | **Build estática sob `/enzitag-optima/`** servida localmente e aberta em Chromium e Firefox: motor WASM e Worker carregam sem erros (`base: "./"`). |
| 2026-11-01 | **Documentação:** `CHANGELOG.md`, `validation/reports/v0.1.0/`, `docs/distribuicao/publicacao.md`, READMEs. |
| 2026-11-01 | **Fechamento local da v0.1.0 (decisões do usuário):** DIC aleatorizado e personalização por figura implementados ([DT-0016](../../decisoes-tecnicas/dt-0016-dic-aleatorizado-e-estilo-por-figura.md)); repositório público (PD-15); instalador sem assinatura de código (PD-11) e atualizador com chaves geradas ([DT-0017](../../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)); verificação no Windows 10 em vez do 11. Verificações: Rust 401 aprovados (fmt e clippy limpos), vitest 246, E2E 260 em quatro navegadores, pacote Tauri (clippy, 8 testes), instalador NSIS construído, instalado, executado e desinstalado, verificação nativa por WebView2 (inclui DIC, projeto com DIC/estilos, reabertura cruzada e bytes idênticos). **Pendente, ato do mantenedor:** etiqueta `v0.1.0`, publicação do release e do Pages, e verificação da atualização. |

**Retomada.** Ramo `claude/epic-keller-3ad7jc`, PR aberto contra `main`. Candidata pronta **localmente**. Bloqueios: PD-15 (usuário), PD-11 (assinatura, usuário), Windows 11 (equipamento), geração das chaves do atualizador (autorização). Nenhum marco (M1–M3) foi declarado.

## 12. Desvios e descobertas

- **Etapa não concluída** por dependência externa; permanece ativa. A candidata local não é a "v0.1.0 publicada e verificada".
- **Lacuna de escopo da v0.1:** geração aleatorizada de DIC com fator categórico (matriz) e personalização gráfica por figura não foram implementadas; exigem decisão do usuário (aceitar na v0.1.0 ou implementar antes).
- **Desempenho:** a comparação com muitos tratamentos (≥ 40) é lenta por causa do valor-p de Tukey (≈ 10–12 ms por valor); o cálculo é correto. Melhoria registrada.
- **Verificação em Windows:** apenas em `windows-latest` (Windows Server 2025).
