# DT-0002 — Versionamento e definição da primeira versão

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Solicitação do usuário: plano de execução por etapas como base da primeira versão, com escopo definido a partir dos documentos do projeto |
| Pendências relacionadas | PD-11, PD-12, PD-15 |
| Substitui / substituída por | — |

## Contexto

As [decisões aprovadas](../produto/decisoes-aprovadas.md) (§14) preveem canais experimental e estável, atualizações assinadas e validação identificada por versão. O [roteiro](../planos-execucao/roteiro-produto.md) admite versões experimentais com subconjunto identificado após F04 e reserva a versão completa para quando todas as famílias aprovadas estiverem entregues. Faltava definir a numeração e o recorte da primeira versão.

## Decisão

1. **Versionamento semântico** (`MAIOR.MENOR.CORREÇÃO`) para o aplicativo, com etiquetas `v<versão>` e candidatas `v<versão>-rc.<n>`.
2. **Série 0.x = canal experimental.** Cada versão menor acrescenta funcionalidades do roteiro; correções incrementam o terceiro número.
3. **Primeira versão = `v0.1.0`**, com o escopo do [plano da v0.1](../planos-execucao/plano-v0.1.md): F00–F07 completos e recortes de F10, F12 e F13 (marcos M1–M3, exportação essencial, verificação integrada e publicação experimental).
4. **`v1.0.0` = primeira versão estável**, quando o produto completo inicial (M5) estiver entregue e validado.
5. Versões independentes e inteiras para o **protocolo** entre interface e motor e para o **esquema** do arquivo `.enzitag`; ambas registradas em cada resultado e arquivo.
6. A versão do aplicativo é a mesma no workspace Rust, no `package.json` e na configuração do Tauri; a CI verifica a coincidência a partir da ET01.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Primeira versão já como `1.0.0` | Sinalizaria estabilidade e catálogo completo, contrariando o canal experimental e a cobertura progressiva |
| Primeira versão apenas com M1–M2 (comparação) | Deixaria de fora o caso típico do laboratório (PB e otimização) |
| Primeira versão com Drive e F08 | Ampliaria muito a primeira entrega; Drive depende de salvamento local consolidado e de configuração externa |
| Versionamento por data | Não comunica compatibilidade nem maturidade |

## Consequências

- O escopo da v0.1 pode ser ajustado por decisão do usuário, seguindo o [controle de mudanças](../planos-execucao/plano-v0.1.md#8-controle-de-mudanças-de-escopo).
- Versões posteriores (v0.2, v0.3…) recebem plano próprio `plano-v0.<n>.md` antes de iniciar suas etapas.
- Notas de cada versão listam métodos, variantes e situação de validação.
