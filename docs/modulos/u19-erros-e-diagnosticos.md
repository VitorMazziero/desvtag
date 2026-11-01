# U19 — Erros e diagnósticos

**Estado:** implementado (registro local sem dados experimentais ainda não criado) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/services/errors` |
| Arquivos | `codes.ts` (código → chave), `presentation.ts` (chave + parâmetros → frase localizada) |

O motor devolve códigos e parâmetros, nunca frases. `engineErrorMessages` monta a frase do erro e a de cada diagnóstico (`invalidInput`); erros de célula da grade usam `diagnostics:cellErrors.*`. Código sem tradução recai em "Erro desconhecido do motor" em vez de exibir o código cru. `services/logging/local.ts`, previsto no mapa, **não foi criado**: não há dados a registrar além do que já aparece na tela; entra quando houver necessidade (e sem dados experimentais por padrão).
