# DT-0026 — Relatório em Word, comentários, canais de atualização e WebKit (ET20)

| Campo | Valor |
|---|---|
| Estado | Aceita (parcial: sem Safari real, sem domínio próprio, canal estável sem versões) |
| Data | 2026-11-02 |
| Origem | [ET20](../planos-execucao/concluidos/et20-docx-comentarios-e-distribuicao.md); [DT-0014](dt-0014-exportacao-e-relatorio.md), [DT-0017](dt-0017-atualizador-assinado-e-publicacao.md), [DT-0020](dt-0020-figuras-completas-e-exportacao-em-pdf.md) |
| Pendências relacionadas | PD-13 (Safari e domínio), PD-14 (comentários e edição simultânea) |
| Substitui / substituída por | — |

## 1. Biblioteca do relatório em Word

**Decisão:** [`docx`](https://github.com/dolanmiu/docx) 9.15.1 (MIT), carregada **sob demanda** só quando o usuário pede o `.docx`, como o `pdfmake`. Roda no dispositivo, sem rede, no navegador e no aplicativo Windows. Traz `fflate`, `nanoid` e `@types/node` (MIT).

**Alternativas avaliadas:** gerar OOXML à mão (controle total, mas centenas de linhas para tabelas, numeração, imagens e rodapé com paginação, e risco de arquivo que o Word recusa); converter o relatório HTML por um serviço externo (descartada: envia dados para fora).

**Como funciona:** o mesmo DOM limpo do relatório HTML e do PDF (`cleanReportRoot`) é convertido por `services/export/docxContent.ts` (títulos com nível semântico, parágrafos com negrito/itálico, listas com marcadores e numeradas que reiniciam em 1, tabelas **editáveis** com linha de cabeçalho repetida e alinhamento numérico, interpretação, proveniência, logotipo opcional e rodapé «Página X de Y» com campos do Word). **Figuras entram como PNG** (o SVG é rasterizado a 2× no navegador, com texto alternativo); o SVG nativo do Word não é confiável entre versões. O arquivo leva título, assunto, palavras-chave (proveniência) e criador.

**Limites conhecidos:** figuras são imagens (não editáveis); as fontes são as do computador de quem abre (Calibri por padrão, com substituição automática); a rasterização depende do navegador (feita em canvas), então não há um teste unitário dela, só o E2E em navegador real.

## 2. Comentários

**Modelo:** campo **opcional e aditivo** `comments` por experimento (esquema 1, sem migração; ausente quando vazio, de modo que arquivos sem comentários continuam idênticos). Cada comentário tem `target` (experimento, análise, figura ou tabela; figura e tabela pela **chave estável**), `revisionId` (revisão dos dados em que foi escrito: a da análise a que se refere, ou a mais recente), autor opcional, texto (≤ 2000 caracteres), data, `resolvedAt` e respostas. A validação (Rust) recusa texto vazio ou longo, análise ou revisão inexistentes e identificadores repetidos.

**Decisões:** (a) figuras e tabelas são encontradas pela **chave**, não pelo identificador da análise, para que o comentário continue visível quando a análise é refeita; (b) revisões nunca são apagadas, então o `revisionId` sempre resolve; (c) o nome de quem comenta é **livre e fica só no dispositivo** (não há contas); (d) no relatório os comentários entram **só quando o usuário marca a opção** (padrão: desligada), como seção final do mesmo DOM, saindo igual em HTML, PDF e Word.

**Tabelas:** o comentário de tabela vale pela chave `<tipo de resultado>/<sufixo de exportação>` e aparece junto dos botões CSV/XLSX da tabela.

**Não feito:** edição de um comentário já enviado (só responder, resolver, reabrir e excluir) e qualquer sincronização entre pessoas (ver [edição simultânea](../arquitetura/edicao-simultanea.md)).

## 3. Canais de atualização

**Decisão:** dois canais, cada um com **um manifesto assinado** (`latest.json`) num **release fixo**: `channel-experimental` (toda versão publicada) e `channel-stable` (somente ≥ 1.0.0, sem sufixo, não marcado como pré-lançamento). O fluxo `channels.yml` roda **depois que o mantenedor publica** um release (nunca em rascunho) e copia o `latest.json` da versão para o release de cada canal em que ela entra, decidido por `scripts/channels.mjs` (testado). O endereço do canal é montado **no Rust** (`updates.rs`, comandos `update_check` e `update_install`): a interface só escolhe o canal, que fica nas preferências do dispositivo. Enquanto a versão é 0.x o padrão é **experimental** e o estável **não tem versões** (a verificação avisa que não foi possível verificar).

**Segurança:** os dois canais usam a mesma chave pública embutida; trocar de canal **não permite instalar nada sem a assinatura** do instalador. O manifesto de cada canal é cópia byte a byte do manifesto assinado no release original.

**Compatibilidade:** os aplicativos 0.1 e 0.2 já instalados continuam lendo `releases/latest/download/latest.json` do último release **não pré-lançamento**. Por isso, **até a 1.0.0, os releases da série 0.x devem ser publicados como releases normais**, não como pré-lançamento.

**Remoção:** o pacote npm `@tauri-apps/plugin-updater` deixou de ser usado (o plugin em Rust continua).

**Não verificado:** o fluxo `channels.yml` e a verificação ponta a ponta de uma atualização por canal dependem de publicar um release real; foram verificados só os testes do script, do endereço no Rust e da preferência. Registrar o resultado na primeira publicação com a v0.3.0.

## 4. Safari e WebKit

O **WebKit do Playwright** (motor do Safari, versão 27.2 neste ambiente) foi acrescentado à configuração de testes e ao CI (Linux). A suíte E2E inteira roda nele; duas premissas dos testes eram do Chromium e foram corrigidas: (a) o WebKit **não inclui links na ordem do Tab** por padrão (no Safari é preciso Option+Tab ou a preferência «Pressionar Tab para destacar cada item»), então o link «Ir para o conteúdo» fica fora da sequência e o teste confere a ordem dos controles do cabeçalho; (b) uma espera faltava antes de ler as opções do seletor de tema.

**WebKit do Playwright não é o Safari.** Safari real (macOS e iOS) **não foi verificado**: não há Mac neste ambiente. Fica registrado como **não verificado**: o usuário decidiu em 2026-11-02 que **não haverá Mac** para isso. IndexedDB/armazenamento persistente, downloads e fontes do Safari real não foram observados; a cobertura é a do WebKit do Playwright no CI.

## 5. Domínio próprio

**Decisão do usuário (2026-11-02): não haverá domínio próprio**; o endereço é o do GitHub Pages (PD-13 resolvida). Se isso mudar no futuro: configurar `CNAME` no Pages, HTTPS, `base` do Vite, **atualizar o referenciador autorizado da chave do Picker e as origens do cliente OAuth** (DT-0025) e a política de privacidade.
