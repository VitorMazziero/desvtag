# Publicação da v0.1.0

**Estado:** **versão web publicada; instalador em rascunho de release (não publicado)** · **Atualizado em:** 2026-11-01

> **v0.2.0:** está em preparação no ramo `feat/v0.2` e **não foi publicada** (nenhuma etiqueta, release ou publicação no Pages foi feita para ela). Quando o usuário decidir publicar, o registro correspondente entra aqui.

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
3. **Chaves do atualizador:** geração autorizada e feita; a privada e a senha estão apenas em segredos do GitHub (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) e em cópia local fora do repositório (`%USERPROFILE%\.tauri\`). **Guarde essa cópia em local seguro**: sem ela não é possível assinar atualizações.
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
