# C14 — Ajuste não linear de saturação

Estado: v1 entregue e extensão de perfil aceita localmente na ET24 em 2026-11-04.

## Responsabilidade

`models/nonlinear/mod.rs` é entrada da API `fit(NonlinearRequest)`. `types.rs` define contratos aditivos; `model.rs` avalia Monod/Haldane/Hill/Jacobiana; `optimizer.rs` resolve LM projetado com coordenada fixa interna e testes de convergência; `fitting.rs` valida e monta coeficientes/Wald/faixa; `profile.rs` reotimiza parâmetros de perturbação e devolve LR/IC/estados/pontos. O core não faz IO, idioma ou estilo. Tipos C01, matrizes C03, distribuições C04 e proveniência/diagnósticos C19.

## Interface e projeto

`SaturationFit.tsx` captura dados/configuração; `NonlinearOptions.tsx` e `parseNonlinearOptions.ts` só configuram, validam campos e fazem parsing. `LikelihoodProfiles.tsx` apresenta tabelas/exportações e `likelihoodProfile.ts` apenas transforma os pontos do Rust em geometria. `NonlinearResults.tsx` usa entradas e nomes históricos. `family_nonlinear_validation.rs` confere a estrutura guardada sem ajustar novamente. Inícios/limites brutos e opção de perfil integram a assinatura do resultado.

[Especificação](../metodos/ajuste-nao-linear.md), [decisão](../decisoes-tecnicas/dt-0033-perfil-de-verossimilhanca-e-dominio-nao-linear.md), [casos](../../validation/cases/nonlinear_profile/), [verificação e limites](../../validation/reports/et24/README.md). O fechamento da ET24 está registrado no relatório.

## Correção de integridade AU-B02

`fitting.rs` preserva estimativas e curva quando não há inferência disponível; Stat explícito e correlação vazia evitam NaN/null no contrato. Testes de ajuste exato, posto deficiente e parâmetro no limite incluem desserialização tipada; `et24-integrity.spec.ts` exercita apresentação, histórico e exports. O registro factual e os limites do aceite estão no relatório ET24 existente.

## Execução e falhas (bloco 03)

Potência e saturação compartilham o ciclo de vida `useCalculationTask`: fechamento/troca de destino cancela o canal e invalida sua geração; edição não troca a entrada histórica que produziu o resultado. Erros de transporte têm aviso traduzido, foco e preservação do registro. Duas filas limitadas isolam serviços/arquivos de cálculos longos; no Windows o cancelamento de um invoke não libera a vaga de CPU até ele terminar. Critérios e testes no plano v0.4 §9.8.

[Exemplo 16](../../examples/16-perfil-de-saturacao/README.md) reproduz Misra1d com a interface e preserva o perfil no arquivo.
