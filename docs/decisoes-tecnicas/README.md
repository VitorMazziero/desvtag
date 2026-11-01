# Decisões técnicas

**Estado:** vigente · **Atualizado em:** 2026-11-01

Registro das escolhas técnicas (DT) com contexto, alternativas e consequências. Decisões de produto ficam nas [decisões aprovadas](../produto/decisoes-aprovadas.md); pendências técnicas ainda abertas, nas [decisões pendentes](../produto/decisoes-pendentes.md).

## Índice

| ID | Título | Estado | Data |
|---|---|---|---|
| [DT-0001](dt-0001-estrutura-documentacao-nomenclatura.md) | Estrutura da documentação, nomenclatura e planos de execução | Aceita | 2026-11-01 |
| [DT-0002](dt-0002-versionamento-primeira-versao.md) | Versionamento e definição da primeira versão | Aceita | 2026-11-01 |
| [DT-0003](dt-0003-toolchain-ferramentas-web-wasm.md) | Toolchain, ferramentas web e build WebAssembly | Aceita | 2026-11-01 |
| [DT-0004](dt-0004-pacote-tauri-workspace-proprio.md) | Pacote Tauri em workspace próprio e transporte nativo | Aceita | 2026-11-01 |
| [DT-0005](dt-0005-contrato-serializacao-tipos.md) | Contrato, serialização e geração de tipos TypeScript | Aceita | 2026-11-01 |
| [DT-0006](dt-0006-idiomas-temas-fontes.md) | Idiomas, temas, fontes e preferências | Aceita | 2026-11-01 |
| [DT-0007](dt-0007-decisoes-et02-interface.md) | Decisões da ET02: grade de dados, navegação, estado, soma e verificação nativa | Aceita | 2026-11-01 |
| [DT-0008](dt-0008-formato-enzitag-versoes-recuperacao.md) | Formato `.enzitag`, política de versões, recuperação e importação | Aceita | 2026-11-01 |
| [DT-0009](dt-0009-fundamentos-numericos-modelos-lineares.md) | Fundamentos numéricos e modelos lineares (ET04) | Aceita | 2026-11-01 |

## Regras

- Criar a DT antes do código que depende dela, a partir do [modelo](../modelos/decisao-tecnica.md), com o próximo número livre.
- Uma DT que resolve uma pendência cita o identificador `PD-nn` e a pendência é marcada como resolvida no registro de pendências.
- DT aceita não é editada para mudar a decisão: cria-se outra DT que a substitui, e ambas apontam uma para a outra.
- Os planos de etapa listam, na seção 4, as DTs que precisam ser registradas durante a execução.
