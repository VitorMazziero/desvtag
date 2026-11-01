# ET10 — Integração, verificação e publicação da v0.1

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F12 e F13 (recortes da v0.1) |
| Marco | **Versão v0.1.0** |
| Depende de | ET01–ET09 |
| Módulos | Todos os entregues; C19 (situação dos métodos), E02, E04 (`updater`), U18 (`UpdateSettings`) |
| Ativado em | — |
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

- [ ] **T01** — Completar a [matriz de cobertura](../../produto/matriz-cobertura.md) da v0.1 com links de evidência; reclassificar com registro qualquer item não validado.
- [ ] **T02** — Percursos integrados nas duas plataformas com salvar, reabrir e exportar.
- [ ] **T03** — Testes de robustez, acessibilidade e preferências.
- [ ] **T04** — Medição de desempenho e limites operacionais em `docs/arquitetura/limites-operacionais.md`.
- [ ] **T05** — Verificação de cancelamento, progresso e respostas obsoletas.
- [ ] **T06** — Auditoria de dependências e licenças; verificação de credenciais e de materiais locais nos artefatos.
- [ ] **T07** — Obter a decisão do usuário sobre PD-15 e registrá-la.
- [ ] **T08** — Workflow de publicação web; teste da URL publicada nos navegadores da matriz.
- [ ] **T09** — Build e teste do instalador em Windows 11 limpo; publicação no Releases.
- [ ] **T10** — Atualizador: chaves fora do repositório (segredos do GitHub), manifesto do canal experimental, atualização verificada de uma versão candidata para a `v0.1.0`.
- [ ] **T11** — Notas de versão com métodos e variantes disponíveis, situação de validação por método e limitações; `CHANGELOG.md`.
- [ ] **T12** — Relatório em `validation/reports/v0.1.0/`; `docs/distribuicao/publicacao.md` com o procedimento executado.
- [ ] **T13** — Atualizar README, [repositório GitHub](../../distribuicao/repositorio-github.md) e [plano da v0.1](../plano-v0.1.md); preparar o planejamento da v0.2.

## 6. Entregas

Versão `v0.1.0` publicada no canal experimental, com evidências, notas de versão e procedimento de publicação documentado.

## 7. Critérios de conclusão

1. Critérios de lançamento da [v0.1](../plano-v0.1.md#6-critérios-de-lançamento-da-v010) atendidos.
2. URL e instalador publicados foram abertos e testados, com versão e métodos identificados.
3. Atualização a partir de versão anterior verificada sem perda de projetos.
4. Problemas que comprometem cálculos, integridade dos projetos ou funcionamento nos ambientes declarados estão resolvidos; limitações remanescentes estão documentadas com alcance preciso.

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
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
