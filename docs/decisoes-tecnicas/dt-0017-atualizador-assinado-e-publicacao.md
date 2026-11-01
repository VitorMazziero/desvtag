# DT-0017 — Atualizador assinado, instalador sem assinatura de código e fluxos de publicação (ET10)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Decisões do usuário em 2026-11-01: repositório público (PD-15); geração das chaves do atualizador autorizada; instalador sem certificado de assinatura de código nesta versão (PD-11) |
| Pendências relacionadas | PD-11, PD-15 |
| Substitui / substituída por | — |

## Contexto

A ET10 prevê instalador, atualização assinada e publicação da versão web. Há **duas assinaturas diferentes**, que não se confundem:

| Assinatura | Para que serve | Quem verifica | Situação na v0.1 |
|---|---|---|---|
| **Assinatura do atualizador** (minisign, chave própria do projeto) | Garante que o pacote de atualização baixado foi produzido pelo projeto e não foi adulterado | O próprio aplicativo, antes de instalar | **Adotada** |
| **Assinatura de código** (certificado emitido por uma autoridade, pago) | Faz o Windows (SmartScreen) reconhecer o instalador/executável como de um editor identificado | O Windows, ao baixar e executar | **Não adotada** (PD-11) |

Sem a assinatura de código, o Windows pode mostrar o aviso "O Windows protegeu seu computador" na primeira execução do instalador baixado; o usuário pode seguir em "Mais informações → Executar assim mesmo". O aviso não indica defeito, só ausência de um editor verificado pela Microsoft. Os cálculos, os projetos e o atualizador não dependem dele.

## Decisões

1. **PD-11 — instalador sem certificado de assinatura de código na v0.1.** As notas de versão explicam o aviso do Windows e como conferir a integridade (soma SHA-256 publicada no release). Reavaliar o certificado (ou o serviço de assinatura gratuito para projetos de código aberto, se aceito) a partir da v0.2.
2. **Atualizador do Tauri com chave própria.** Par de chaves minisign gerado em 2026-11-01 com `tauri signer generate`: a **chave pública** está em `app/desktop/src-tauri/tauri.conf.json` (`plugins.updater.pubkey`); a **privada e sua senha** estão apenas em segredos do GitHub (`TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) e em cópia local do mantenedor fora do repositório (`%USERPROFILE%\.tauri\`). Perder a chave privada ou a senha impede assinar atualizações futuras: quem tiver só a pública não consegue gerar pacotes aceitos, e os usuários precisariam reinstalar manualmente.
3. **Endereço do manifesto:** `https://github.com/VitorMazziero/enzitag-optima/releases/latest/download/latest.json`, arquivo anexado a cada release publicado (gerado por `scripts/make-updater-manifest.mjs` a partir do instalador e da assinatura). O canal é **experimental** (`0.x`): o texto do release e do aplicativo diz isso; o release marcado como mais recente é o que o atualizador consulta.
4. **Instalação passiva e sem tocar nos projetos.** `windows.installMode = "passive"`; o instalador atual (NSIS, por usuário) substitui o aplicativo e preserva os arquivos `.enzitag`, que são do usuário. A interface oferece "Verificar atualizações" apenas no aplicativo Windows e só instala se a assinatura conferir.
5. **Publicação por fluxos de trabalho, sem publicar sozinha.** `release.yml` dispara em etiqueta `vX.Y.Z`, confere que a etiqueta é a versão do aplicativo, gera o instalador assinado e cria um **rascunho** de release; só o mantenedor o publica. `pages.yml` publica a versão web no GitHub Pages por **disparo manual**. Nenhum dos dois roda em pull request.
6. **Visibilidade pública do repositório (PD-15)** habilita o GitHub Pages sem plano pago e a CI do Windows em todos os pushes (minutos gratuitos em repositório público). Antes da mudança, a varredura de credenciais foi refeita sobre o histórico inteiro ([relatório](../../validation/reports/v0.1.0/README.md#auditoria-de-dependências-e-licenças)).

## Alternativas consideradas

| Alternativa | Motivo de não adotar agora |
|---|---|
| Comprar certificado de assinatura de código | Custo e burocracia para uma versão experimental; o atualizador já protege a integridade das atualizações |
| Atualização sem assinatura | Qualquer pessoa com acesso ao endereço poderia servir um pacote falso |
| Publicar o release automaticamente a cada etiqueta | A publicação é decisão do mantenedor; rascunho permite conferir o instalador antes |
| Manifesto no GitHub Pages | Acoplaria a atualização do aplicativo à publicação da versão web |

## Critérios e evidências

Chave pública no repositório e privada fora dele (varredura de segredos); `tauri build` local gera o instalador, o `.sig` e a verificação da assinatura com a chave pública; manifesto gerado e validado por teste do script; a atualização ponta a ponta (instalar uma candidata, publicar a versão seguinte, atualizar) só pode ser verificada **depois** de existir um release publicado e permanece pendente.
