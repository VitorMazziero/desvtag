# Exemplos reproduzíveis

Exemplos distribuíveis do DesvTAG. Os projetos `.enzitag` das versões anteriores continuam utilizáveis.

Cada exemplo fica em `examples/<nn>-<slug>/` ([nomenclatura](../docs/convencoes/nomenclatura.md)) e contém um `README.md` com objetivo, origem dos dados, fatores ou tratamentos, respostas, configurações da análise e resultados esperados, além dos dados e, a partir da ET03, do projeto `.enzitag`. Utilizar dados sintéticos identificados ou dados autorizados para publicação.

Exemplos previstos no [plano da v0.1](../docs/planos-execucao/plano-v0.1.md):

| Exemplo | Etapa |
|---|---|
| Arquivo de referência do formato `.enzitag` | ET03 |
| [01 — Quatro condições de reação enzimática](01-enzimas-quatro-condicoes/README.md) com réplicas independentes (ANOVA, Tukey e letras) | ET05 (existe) |
| [02 — Triagem Plackett–Burman de componentes de meio de cultivo](02-triagem-meio-cultivo/README.md), com pontos centrais | ET06 (existe) |
| [03 — DCCR do meio de cultivo](03-superficie-meio-cultivo/README.md), com os fatores selecionados na triagem | ET07 (existe) |
| [04 — Otimização de duas respostas e ensaios de confirmação](04-otimizacao-e-confirmacao/README.md) | ET08 (existe) |
| [06 — kLa sintético: um modelo por resposta](06-kla-sintetico/README.md), composto central de face centrada com RPM e aeração | ET11 (existe) |
| [07 — Misturas: simplex-lattice e modelo de Scheffé](07-misturas-scheffe/README.md) | ET15 (existe) |
| [08 — Curva de saturação de Monod](08-saturacao-monod/README.md) | ET18 (existe) |
| [09 — Níveis mistos: 3 cepas × 2 pH × 2 repetições](09-niveis-mistos/README.md) | ET15 (existe) |
| [10 — Planejamento D-ótimo com restrição](10-planejamento-otimo/README.md) | ET16 (existe) |
| [11 — Medidas repetidas: pareado, Wilcoxon e modelo misto](11-medidas-repetidas/README.md) | ET17 (existe) |
| [12 — Potência e tamanho de amostra](12-potencia-e-tamanho-de-amostra/README.md) | ET18/ET22 (existe; projeto com resultado) |
| [13 — Planilha de coleta (matriz com respostas)](13-planilha-de-coleta/README.md) | ET13 (existe) |
| [14 — Meio de cultivo de *A. oryzae*](14-meios/README.md): DCCR, otimização e confirmação (dados fictícios do usuário; relatórios com o defeito da v0.3.0) | v0.3.0 (existe) |
| [15 — Perfis temporais, AR(1), testes conjuntos e médias marginais](15-medidas-repetidas-ar1/README.md) | ET23 (em verificação) |
| [16 — Perfil de saturação com dados NIST Misra1d](16-perfil-de-saturacao/README.md) | ET24 |
| [17 — Potência e simulação para um contraste planejado](17-potencia-de-contraste/README.md) | ET24 |
| [18 — Mistura de solventes com limites](18-mistura-limitada-cox/README.md), traço de Cox e compromisso entre duas respostas | ET25 |
| [19 — Planejamento ótimo em dois lotes](19-otimo-misto-em-blocos/README.md), com fator categórico e perfis de variância salvos | ET25 |

Existem os exemplos 01 a 04 e 06 a 19. O 05 está reservado aos dados reais de kLa do grupo (PD-16). Os exemplos são ligados às [fichas de módulos](../docs/modulos/README.md) e à [validação](../validation/README.md).

Na v0.4, os exemplos 07, 08, 11 e 12 incluem resultados persistidos pela ET22. O exemplo 11 permite consultar os dois métodos sem recalcular; os demais mantêm as referências independentes documentadas.
