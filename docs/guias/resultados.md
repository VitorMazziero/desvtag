# Guia dos resultados

**Estado:** vigente · **Atualizado em:** 2026-11-02

A página de resultados organiza cada análise em **seções**, escolhidas na barra lateral (ou nos botões acima do conteúdo em telas estreitas). A seção ativa é lembrada ao recarregar a página. «Mostrar todas as seções» reúne tudo numa página longa, como na v0.1. Capturas (seis temas, PT e EN) em [`docs/imagens/capturas/`](../imagens/capturas/).

![Resultados do exemplo 01 no tema Clay (inglês)](../imagens/capturas/resultados-en-clay.png)

## Seções por tipo de análise

| Análise | Seções |
|---|---|
| Comparação de tratamentos | Resumo · Tabelas (ANOVA, grupos, pares) · Diagnóstico · Gráficos · Exportar |
| Planejamento de dois níveis | Resumo · Efeitos · Diagnóstico · Gráficos · Exportar |
| Superfície de resposta | Resumo · Modelo (termos, equação, comparação de modelos) · Diagnóstico · Gráficos (contorno e 3D) · Otimização · Confirmação · Exportar |

**Exportar é sempre a última seção.** Os botões de CSV, XLSX, SVG, PNG e PDF de cada tabela e figura também ficam junto dela.

## Resumo

Conclusão, evidência e próximo passo em frases curtas, com os números principais (F, valor-p, número de pares que diferem). O texto diz o que o resultado **não** significa (por exemplo, que o teste F não indica quais grupos diferem).

## Modelo (superfícies)

- Cada termo do modelo pode ser ligado ou desligado; o aplicativo recalcula na hora. Remover um termo que quebra a hierarquia exige confirmação.
- Há **um modelo por resposta**; o seletor de resposta mostra qual já tem modelo. A otimização usa o modelo de cada resposta e marca o resultado como desatualizado se o modelo mudar.
- **Sugerir remoções:** eliminação regressiva (remove o termo de maior valor-p acima de α que respeite a hierarquia, recalcula e repete). A sequência mostra o efeito de cada passo; a decisão final é sua.
- **Comparação:** modelo completo, atual e recomendado, com R², R² ajustado, R² predito (PRESS), AICc, BIC e valores-p do modelo e da falta de ajuste. O aplicativo não declara um vencedor único: veja [seleção de modelos](../metodos/selecao-de-modelos.md).

## Diagnóstico

Resíduos × ajustados, gráfico normal dos resíduos, razão de desvios e teste de homogeneidade. Os avisos aparecem em todas as seções quando os dados mudaram depois do cálculo («resultado desatualizado»).

## Gráficos

Médias com a incerteza nomeada e letras de comparação, boxplot, Pareto, efeitos, observado × predito, contorno e superfície 3D. Cada figura tem personalização própria (título, eixos, cores, letras manuais, anotações) salva no projeto.

## Otimização e confirmação

Objetivos (maximizar, minimizar, alvo, faixa), restrições, candidatos com previsão e incerteza, desejabilidade global e compromissos entre respostas; depois, a proposta de ensaios de confirmação e a comparação com o observado. A busca é local com vários inícios: **não há afirmação de ótimo global**.

## Exportar

Relatório HTML e PDF (completos, em sequência), tabelas em CSV e XLSX, figuras em SVG, PNG e PDF e as preferências de exportação (decimais, paleta, idioma do relatório, logotipo do grupo). Ver o [guia de exportação](exportacao.md).

## Teclado e acessibilidade

Setas, Tab e Enter percorrem a barra de seções; o item ativo é indicado por texto e por `aria-current`, não só por cor. Todos os temas passam na verificação de contraste e do axe, e há tratamento para alto contraste do Windows e movimento reduzido.
