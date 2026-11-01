# Publicação da v0.1.0

**Estado:** **nenhuma publicação foi executada** · **Atualizado em:** 2026-11-01

Este documento registra o procedimento **previsto** para publicar a v0.1.0 e o que depende de decisão do usuário. Não é o registro de uma publicação feita: o repositório continua **privado**, não há URL pública, instalador em Releases nem atualizador.

## O que já está pronto localmente

| Item | Situação |
|---|---|
| Build web estática (`npm run build` em `app/web`) | Pronta; `base: "./"` funciona em `/enzitag-optima/`; aberta sob esse subcaminho no Chromium e no Firefox, sem erros |
| Avisos de terceiros | `THIRD_PARTY_NOTICES.txt` na build (gerado por `node scripts/make-third-party-notices.mjs`) |
| Instalador Windows (NSIS) | Gerado pela CI em `windows-latest` como artefato; não testado em Windows 11 limpo |
| Notas de versão | [`CHANGELOG.md`](../../CHANGELOG.md) |
| Relatório de validação | [`validation/reports/v0.1.0/`](../../validation/reports/v0.1.0/README.md) |

## Decisões que cabem ao usuário

1. **PD-15 — hospedagem web e visibilidade.** O GitHub Pages em repositório privado depende do plano da conta; a alternativa é tornar o repositório público (ou usar outra hospedagem estática). Nada será publicado antes desta decisão.
2. **PD-11 — assinatura de código.** Publicar o instalador sem assinatura (com instruções nas notas, pois o Windows exibirá alerta) ou obter certificado.
3. **Chaves do atualizador.** Gerar o par de chaves de assinatura fora do repositório (a privada em segredo do GitHub, a pública no `tauri.conf.json`) e definir o endereço do manifesto do canal experimental.
4. Aceitar ou não as lacunas de escopo da v0.1.0 (DIC aleatorizado e personalização por figura) listadas no [relatório](../../validation/reports/v0.1.0/README.md#lacunas-e-reclassificações).

## Procedimento previsto (depois das decisões)

1. Confirmar a CI verde no commit candidato (todos os jobs, inclusive `desktop-windows`).
2. **Web (se Pages):** fluxo de trabalho de implantação a partir de `app/web/dist` em `/enzitag-optima/`; abrir a URL publicada em Chrome, Edge e Firefox atuais e conferir versão do motor e dos métodos.
3. **Windows:** instalar o NSIS em uma máquina Windows 11 de 64 bits limpa, executar os dois percursos (quatro condições; PB → DCCR → otimização → confirmação), salvar, fechar, reabrir e exportar; abrir no navegador um `.enzitag` salvo no Windows e vice-versa.
4. **Atualizador:** publicar a versão candidata, instalar, publicar a `v0.1.0` e verificar a atualização sem perda de projetos.
5. Criar a etiqueta `v0.1.0` e o *release* com as notas; atualizar o [repositório GitHub](repositorio-github.md), o README e a matriz de cobertura.
6. Registrar neste documento o que **foi executado**, com datas, URLs e versões.

Até lá, a v0.1.0 é uma **candidata pronta localmente**, não uma versão publicada e verificada.
