# Publicação

**Estado:** **v0.3.0 publicada (versão web e release do instalador) e atualização 0.2.0 → 0.3.0 verificada pelo usuário**; **v0.2.0 publicada (versão web e release do instalador); v0.1.0 publicada como pré-lançamento; atualização v0.1.0 → v0.2.0 verificada pelo usuário** · **Atualizado em:** 2026-11-02

> **v0.3.0 (2026-11-02):** PR 6 fundido, etiqueta `v0.3.0`, Pages publicado e **release publicado** pelo usuário; o canal experimental foi criado automaticamente e a **atualização a partir da 0.2.0 foi verificada** pelo usuário. Registro em [Publicação da v0.3.0](#registro-da-publicação-da-v030-2026-11-02).
>
> **v0.2.0 (2026-11-02):** versão web **publicada**, etiqueta `v0.2.0` criada e **release publicado** pelo usuário; a atualização a partir da v0.1.0 foi verificada. Registro nas seções [Publicação da v0.2.0](#publicação-da-v020) e [Publicação dos releases e atualização](#publicação-dos-releases-e-atualização-2026-11-02).

## Publicação da v0.3.0

**Estado:** **publicada em 2026-11-02** (versão web, etiqueta `v0.3.0` e release do instalador); **atualização 0.2.0 → 0.3.0 verificada pelo usuário**. O procedimento seguido está na tabela de passos abaixo; o registro, na seção seguinte.

| Passo | Quem | Observação |
|---|---|---|
| 1. CI verde no PR 6 (Rust, web, E2E em Chromium, Firefox e WebKit, Tauri Linux e Windows) | Claude | Conferir no commit final |
| 2. Fundir o PR 6 em `main` | Claude, com a confirmação do usuário | Mescla (não *squash*), como nos PR anteriores |
| 3. Etiqueta anotada `v0.3.0` | Claude, com a confirmação do usuário | `check-versions` exige que a etiqueta confira com a versão |
| 4. O fluxo **Release** cria o **rascunho** com o instalador assinado, o `.sig` e o `latest.json` | Automático | Notas = seção `[0.3.0]` do CHANGELOG |
| 5. **GitHub Pages** (`pages.yml`, manual) | Claude, com a confirmação do usuário | Depois, `tests/public` confere a versão publicada nos quatro navegadores |
| 6. **Publicar o rascunho** como release normal (**não** pré-lançamento) | Usuário | Os aplicativos 0.1 e 0.2 só enxergam releases não pré-lançamento |
| 7. O fluxo **Canais de atualização** copia o `latest.json` para `channel-experimental` | Automático | Se não rodar, executar à mão com a etiqueta `v0.3.0` |
| 8. Verificar a atualização **0.2.0 → 0.3.0** (instalar a 0.2.0 e usar *Verificar atualizações*) e a leitura do canal | Usuário | Registrar o resultado aqui e no relatório da v0.3.0 |

**Notas da versão:** descrevem a **limitação conhecida** (resultados das famílias novas não guardados no projeto), o que **não foi verificado** (Drive com contas reais, Safari real, canal ponta a ponta, Windows 11) e o que vai para a [v0.4](../planos-execucao/plano-v0.4.md).

### Registro da publicação da v0.3.0 (2026-11-02)

| Hora (UTC, 2026-11-02) | Ato | Evidência |
|---|---|---|
| 21:2x | **CI verde no commit final do PR 6** (`63960c3`): documentação e versões, Rust, Web (contratos, lint, tipos, testes, build, E2E em Chromium, Firefox e WebKit), Tauri Linux e Tauri Windows | [execução 41524667311](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41524667311). As duas rodadas anteriores falharam e foram corrigidas: pasta `ativos/` vazia fora do git (job de documentação) e premissas de teste do WebKit do Linux e do Firefox da CI (ver o relatório) |
| 21:26:19 | **PR 6 fundido** em `main` (mescla, por autorização do usuário: «you have go for merge/tag/Pages») | commit de mescla `20f337a` |
| 21:26:31 | **Etiqueta anotada `v0.3.0`** («EnziTAG Optima v0.3.0 (experimental)») sobre `20f337a` | objeto da etiqueta `493db8e` |
| 21:2x–21:44 | **CI da `main`** e **CI da etiqueta** verdes | execuções [41528343372](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41528343372) e [41528370966](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41528370966) |
| 21:44:38 | Fluxo **Release** criou o **rascunho** com `EnziTAG-Optima_0.3.0_x64-setup.exe` (8 930 219 bytes), `.sig` (444 bytes) e `latest.json` | [execução 41528370967](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41528370967) |
| 21:30:29 | **GitHub Pages** publicado a partir de `main` | [execução 41528444201](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41528444201); `tests/public` contra o endereço público confirmou a **0.3.0** (abre, calcula, sem rede externa) no Chromium |
| 22:01:24 | **Usuário publicou o release** como release normal: **Latest**, `isPrerelease = false` | `gh release view v0.3.0` |
| 22:01:27–22:01:40 | Fluxo **Canais de atualização** rodou sozinho (evento `release`) e criou o release fixo `channel-experimental` (pré-lançamento, só com o `latest.json`) | [execução 41533596696](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41533596696) |
| depois | **Manifestos conferidos**: `releases/download/channel-experimental/latest.json` (aplicativos 0.3) e `releases/latest/download/latest.json` (aplicativos 0.1 e 0.2) respondem **0.3.0**, com assinatura de 444 bytes e endereço do instalador que responde **200** (8 930 219 bytes); `channel-stable/latest.json` responde **404**, como esperado até a 1.0.0 | `curl` |
| depois da publicação | **Atualização no aplicativo 0.2.0 → 0.3.0 verificada pelo usuário** (*Verificar atualizações* no aplicativo 0.2.0 instalado encontrou e instalou a 0.3.0) | relato do usuário em 2026-11-02 («a atualização 0.2.0 → 0.3.0 no aplicativo foi verificada») |
| opcional | No aplicativo **0.3.0** instalado, *Verificar atualizações* no canal **experimental** deve responder «você já usa a versão mais recente» (o manifesto do canal responde 0.3.0); no **estável**, «não foi possível verificar» (sem versões até a 1.0.0) | não relatado; não bloqueia |

## Canais de atualização (v0.3)

O aplicativo Windows tem um **canal de atualização** nas preferências (junto do botão *Verificar atualizações*):

| Canal | Recebe | Manifesto |
|---|---|---|
| **Experimental** (padrão na série 0.x) | Toda versão publicada | `https://github.com/VitorMazziero/enzitag-optima/releases/download/channel-experimental/latest.json` |
| **Estável** | Só versões ≥ 1.0.0, sem sufixo e não marcadas como pré-lançamento | `.../releases/download/channel-stable/latest.json` |

**Como funciona.** Cada release continua trazendo o seu `latest.json` assinado ([`release.yml`](../../.github/workflows/release.yml)). Quando o mantenedor **publica** o release, o fluxo [`channels.yml`](../../.github/workflows/channels.yml) copia esse `latest.json` para o release fixo de cada canal em que a versão entra (regra em `scripts/channels.mjs`, testada). Os releases `channel-*` só guardam o manifesto; **não são versões para baixar**. Também é possível rodar o fluxo à mão (*Run workflow*, informando uma etiqueta já publicada), por exemplo para criar os canais a partir da v0.2.0 ou da v0.3.0.

**Regras de publicação**

1. **Até a v1.0.0, publique os releases da série 0.x como releases normais** (não como pré-lançamento): os aplicativos 0.1 e 0.2 já instalados consultam `releases/latest/download/latest.json`, que só enxerga releases não pré-lançamento.
2. Pré-lançamentos (`v1.1.0-rc.1` ou release marcado como pré-lançamento) entram só no canal experimental.
3. A assinatura é a mesma nos dois canais (chave pública embutida): trocar de canal não permite instalar nada sem a assinatura.
4. **Verificação pendente:** o fluxo `channels.yml` só pode ser exercitado com um release publicado; registrar o resultado na primeira publicação com a v0.3.0.

## Publicação da v0.2.0

Datas de 2026-11-02, horário de Brasília (UTC−3), extraídas do GitHub. Endereços consultados na data do registro.

| Hora | Ação | Resultado e endereço |
|---|---|---|
| 09:29–09:42 | CI do commit final do PR 3 (`071e3dc`): 5 jobs aprovados, inclusive o Windows com verificação nativa dos PDFs da figura (17 501 bytes) e do relatório (52 054 bytes) | [execução 41445123635](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41445123635) |
| 09:43 | **PR 3 fundido** em `main` (commit `2459311`), por autorização do usuário («Sim, publicar») | https://github.com/VitorMazziero/enzitag-optima/pull/3 |
| 09:43 | **Etiqueta `v0.2.0`** (anotada) criada em `2459311` e enviada | https://github.com/VitorMazziero/enzitag-optima/releases/tag/v0.2.0 |
| 09:43–09:46 | Fluxo **Pages** (disparo manual em `main`): aprovado; versão web publicada | [execução 41447048838](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41447048838) |
| 09:43–10:01 | Fluxo **Release** (disparado pela etiqueta): aprovado; criou o **rascunho** de release com os três arquivos abaixo | [execução 41447050262](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41447050262) |
| 09:43–09:59 | CI da etiqueta e da `main`: aprovados | [etiqueta 41447050334](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41447050334), [main 41447027405](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41447027405) |

**Conferido por HTTP (sem abrir o aplicativo em navegador):** a página inicial do Pages responde 200 e o pacote JavaScript contém a versão `0.2.0`; o Worker do motor responde 200; o módulo do motor (`optima_wasm_bg-CcB_bf0M.wasm`, 4 296 618 bytes) é servido como `application/wasm`; `THIRD_PARTY_NOTICES.txt` responde 200.

**Arquivos do rascunho do release `v0.2.0`:**

| Arquivo | Tamanho |
|---|---:|
| `EnziTAG-Optima_0.2.0_x64-setup.exe` (soma SHA-256 nas notas do release: `c3c9d8c7a605e0f123b637d2d25df867e8688e326d2fa331bb965991066a5332`) | 8 199 713 bytes |
| `EnziTAG-Optima_0.2.0_x64-setup.exe.sig` (assinatura do atualizador) | 444 bytes |
| `latest.json` (manifesto do atualizador) | 4 874 bytes |

**Situação no momento da publicação (superada pelas seções seguintes):** o release da v0.2.0 foi criado como **rascunho** pelo fluxo Release; o usuário o publicou depois (abaixo).

**Windows 11:** validação **não será realizada** (decisão do usuário, [decisões aprovadas §17](../produto/decisoes-aprovadas.md#17-escopo-da-v03-2026-11-02)).

### Publicação dos releases e atualização (2026-11-02)

Consulta ao GitHub (`gh release list`) e ao endereço do atualizador, depois dos atos do usuário:

| Hora (Brasília) | Ação | Resultado |
|---|---|---|
| 10:11 | Usuário publicou o release da **v0.1.0** | marcado como **pré-lançamento** (`isPrerelease = true`; não é o «mais recente», o que não atrapalha o atualizador) |
| 10:13 | Usuário publicou o release da **v0.2.0** | **mais recente** (`isLatest = true`, rótulo «None») |
| depois | Consulta de `.../releases/latest/download/latest.json` | HTTP 200, `version = 0.2.0`, instalador `EnziTAG-Optima_0.2.0_x64-setup.exe` |
| depois | **Atualização v0.1.0 → v0.2.0 no aplicativo instalado** (Windows 10, pelo usuário) | **«Deu certo»** (relato do usuário); a captura de tela mostra «Nova versão disponível: 0.2.0» e «Baixar e instalar». Não foi registrado por mim que o projeto salvo na v0.1.0 abriu sem perda; o relato do usuário cobre o resultado final |

**Verificação da versão web publicada** (`app/web/tests/public/published.spec.ts`, config `playwright.public.config.ts`, URL `https://vitormazziero.github.io/enzitag-optima/`): em **Chrome, Edge, Chromium e Firefox** a página abre, o motor WebAssembly informa a versão `0.2.0`, a comparação de três tratamentos calcula ANOVA e letras e **nenhuma requisição externa** é feita.

**Observação:** as notas da atualização apareciam como Markdown cru, cortadas e com texto desatualizado; corrigido na v0.3 ([ET14-T09](../planos-execucao/concluidos/et14-itens-adiados-v01-v02.md)). O release da v0.2.0 publicado traz as notas da versão antiga do fluxo (CHANGELOG inteiro).

---

# Publicação da v0.1.0

Este documento registra o procedimento de publicação da v0.1.0 e **o que foi de fato executado**, com datas e endereços. O repositório é **público** desde 2026-11-01 (PD-15).

## Registro do que foi executado

Todas as datas são de 2026-11-01 (horário de Brasília; horas extraídas do GitHub, exceto onde indicado). Os endereços abaixo foram consultados na data do registro.

| Hora | Ação | Resultado e endereço |
|---|---|---|
| antes das 18:47 (hora exata não registrada) | Repositório tornado **público** (PD-15), após varredura do histórico | https://github.com/VitorMazziero/enzitag-optima |
| antes das 18:47 (hora exata não registrada) | GitHub Pages ativado com origem em GitHub Actions | https://vitormazziero.github.io/enzitag-optima/ |
| 18:47 | CI do commit final do PR 1 (`2da11d6`): 5 jobs aprovados, inclusive o Windows com instalador assinado | [execução 41353807436](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41353807436) |
| 19:13 | **PR 1 fundido** em `main` (commit `d511bbb`), por autorização do usuário | https://github.com/VitorMazziero/enzitag-optima/pull/1 |
| 19:14 | **Etiqueta `v0.1.0`** criada em `d511bbb` e enviada | https://github.com/VitorMazziero/enzitag-optima/releases/tag/v0.1.0 |
| 19:14 | Fluxo **Release** (disparado pela etiqueta): aprovado; criou o **rascunho** de release com os três arquivos abaixo | [execução 41356113066](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41356113066) |
| 19:14 | Fluxo **Pages** (disparo manual em `main`): aprovado; versão web publicada | [execução 41356113110](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41356113110) |
| 19:14 | CI da etiqueta e da `main`: aprovados | [etiqueta 41356113149](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41356113149), [main 41356038841](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41356038841) |

**Conferido por HTTP (sem abrir o aplicativo em navegador):** a página inicial do Pages responde 200; os arquivos JS e CSS são servidos com o tipo correto; o módulo do motor (`optima_wasm_bg-*.wasm`, 3 688 385 bytes) é servido como `application/wasm`; `THIRD_PARTY_NOTICES.txt` responde 200.

**Arquivos do rascunho do release `v0.1.0`:**

| Arquivo | Tamanho |
|---|---:|
| `EnziTAG-Optima_0.1.0_x64-setup.exe` (soma SHA-256 nas notas do release: `41c66da1f6c59a794e31fa7fc24b80ac6c78fcb1be1c37c879ce4246e635b038`) | 5 999 013 bytes |
| `EnziTAG-Optima_0.1.0_x64-setup.exe.sig` (assinatura do atualizador) | 444 bytes |
| `latest.json` (manifesto do atualizador) | 4 559 bytes |

### O que **não** foi feito (consulta de 2026-11-01)

- O release **continua rascunho** (`isDraft = true`, sem `publishedAt`): não está visível ao público e o `latest.json` ainda responde **404** no endereço do atualizador (`.../releases/latest/download/latest.json`). Portanto **o instalador não está publicado e a atualização não foi verificada**.
- O instalador do rascunho **não foi instalado nem testado** por quem o gerou; o instalador testado (instalar, executar por 10 s, desinstalar) foi o construído localmente no Windows 10 com o mesmo código.
- O aplicativo web publicado ainda **não foi aberto e usado em Chrome, Edge e Firefox** a partir da URL pública.
- Windows 11 não verificado (decisão do usuário).

## O que já está pronto

| Item | Situação |
|---|---|
| Build web estática (`npm run build` em `app/web`) | Pronta; `base: "./"` funciona em `/enzitag-optima/`; aberta sob esse subcaminho no Chromium e no Firefox, sem erros |
| Fluxo de publicação web | [`pages.yml`](../../.github/workflows/pages.yml): **disparo manual** |
| Instalador Windows (NSIS) assinado para o atualizador | Construído no Windows 10 (instalado, executado e desinstalado); [`release.yml`](../../.github/workflows/release.yml) o gera a partir de uma etiqueta e cria um **rascunho** de release |
| Atualizador | Chaves geradas (privada em segredo do GitHub); plugin, manifesto e controle no aplicativo prontos ([DT-0017](../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)) |
| Avisos de terceiros | `THIRD_PARTY_NOTICES.txt` na build |
| Notas de versão e relatório | [`CHANGELOG.md`](../../CHANGELOG.md); [`validation/reports/v0.1.0/`](../../validation/reports/v0.1.0/README.md) |

## Decisões do usuário (2026-11-01)

1. **PD-15:** repositório público; hospedagem da versão web no GitHub Pages.
2. **PD-11:** instalador sem certificado de assinatura de código (o Windows pode avisar na primeira execução; as notas explicam). O **atualizador** tem chave própria.
3. **Chaves do atualizador:** geração autorizada e feita; a privada e a senha estão apenas em segredos do GitHub (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) e em cópia local fora do repositório (`%USERPROFILE%\.tauri\` na época; desde 2026-11-02 em `D:\Arquivos_de_Programas\Rust\tauri`). **Guarde essa cópia em local seguro**: sem ela não é possível assinar atualizações.
4. Escopo: DIC aleatorizado e personalização por figura implementados; verificação no Windows 10 em vez do 11.

## Procedimento (ato do mantenedor)

1. Conferir a CI verde no commit candidato (todos os jobs, inclusive `desktop-windows`) e fundir o PR 1 em `main`.
2. **Web:** ativar o Pages (*Settings → Pages → Source: GitHub Actions*) e disparar o fluxo **Pages** (*Actions → Pages → Run workflow*). Abrir a URL publicada em Chrome, Edge e Firefox atuais e conferir a versão do motor e dos métodos.
3. **Windows:** criar a etiqueta e enviá-la:

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```

   O fluxo **Release** cria um *rascunho* com o instalador, o `.sig`, o `latest.json` e a soma SHA-256 nas notas. Instalar o arquivo do rascunho em uma máquina Windows, executar os dois percursos, salvar, fechar e reabrir; abrir no navegador um `.enzitag` salvo no Windows e vice-versa. Só então publicar o rascunho (o atualizador consulta o release marcado como mais recente).
4. **Atualizador:** com a 0.1.0 publicada e instalada, publicar a versão seguinte (por exemplo 0.1.1) e usar *Verificar atualizações*; confirmar que a atualização é instalada e que os projetos continuam abrindo.
5. Atualizar o [repositório GitHub](repositorio-github.md), o README e a matriz de cobertura; registrar neste documento o que **foi executado**, com datas, URLs e versões.

Até lá, a v0.1.0 é uma **candidata pronta localmente**, não uma versão publicada e verificada.
