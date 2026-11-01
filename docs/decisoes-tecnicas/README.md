# Decisões técnicas

**Estado:** vigente · **Atualizado em:** 2026-11-01

Registro das escolhas técnicas (DT) com contexto, alternativas e consequências. Decisões de produto ficam nas [decisões aprovadas](../produto/decisoes-aprovadas.md); pendências técnicas ainda abertas, nas [decisões pendentes](../produto/decisoes-pendentes.md).

## Índice

| ID | Título | Estado | Data |
|---|---|---|---|
| [DT-0001](dt-0001-estrutura-documentacao-nomenclatura.md) | Estrutura da documentação, nomenclatura e planos de execução | Aceita | 2026-11-01 |
| [DT-0002](dt-0002-versionamento-primeira-versao.md) | Versionamento e definição da primeira versão | Aceita | 2026-11-01 |

## Regras

- Criar a DT antes do código que depende dela, a partir do [modelo](../modelos/decisao-tecnica.md), com o próximo número livre.
- Uma DT que resolve uma pendência cita o identificador `PD-nn` e a pendência é marcada como resolvida no registro de pendências.
- DT aceita não é editada para mudar a decisão: cria-se outra DT que a substitui, e ambas apontam uma para a outra.
- Os planos de etapa listam, na seção 4, as DTs que precisam ser registradas durante a execução.
