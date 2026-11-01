# U17 — Idiomas

**Estado:** implementado para as funcionalidades da ET02 · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/i18n` |
| Arquivos | `index.ts`, `format.ts`, `locales/{pt-BR,en}/{common,results,diagnostics}.json` |
| Decisão | [DT-0006](../decisoes-tecnicas/dt-0006-idiomas-temas-fontes.md) |

Namespaces: `common` (navegação, formulários, fluxo), `results` (tabela, interpretação, fatos do motor), `diagnostics` (diagnósticos, erros de célula e do motor). Chaves em inglês estável; os códigos do motor viram chaves (`issues.<código>`, `facts.<chave>`). Plural por regra de cada idioma — o pt-BR exige a forma `many` além de `one` e `other`. `format.ts`: apresentação numérica (até 10 algarismos significativos, separador decimal do idioma); o valor calculado não muda.

Testes (`i18n.test.ts`): mesmas chaves nos dois idiomas (plural comparado pela chave-base), todas as categorias de plural de cada idioma presentes, sem valores vazios, detecção do idioma do sistema, interpolação e plural. Esses testes já evitaram dois defeitos: texto em inglês aparecendo em português para contagens ≥ 1.000.000 e a frase "observação(ões)".
