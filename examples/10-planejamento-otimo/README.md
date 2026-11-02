# Exemplo 10 — Planejamento D-ótimo com restrição

**Dados sintéticos**, criados para este exemplo. Dois fatores — **Temperatura** (20 a 40 °C) e **pH** (5 a 7) — e **9 ensaios** escolhidos por **troca de Fedorov** para um modelo **quadrático** (D-ótimo), com a restrição linear `Temperatura + 5·pH ≤ 70`, que corta o canto de temperatura e pH altos. O planejamento resultante tem o ponto (20; 5) repetido, o que é normal em planejamentos ótimos.

A resposta verdadeira (escala codificada, `a = (T − 30)/10`, `b = pH − 6`) é `Atividade = 20 + 4a + 3b − 3a² − 2b² + 1,5ab` mais uma perturbação fixa e pequena (sequência pseudoaleatória `mulberry32(2026)`; `app/web/scripts/make-example-v03b.mjs`).

Arquivos: [`projeto.enzitag`](projeto.enzitag) (ensaios e respostas) e [`ensaios.csv`](ensaios.csv).

## Como reproduzir

1. Abra `projeto.enzitag`.
2. Use **Calcular superfície** (modelo completo de segunda ordem).

## Resultado esperado

Conferido contra uma regressão independente (NumPy a partir de `ensaios.csv`, escala codificada); 6 parâmetros e **3 graus de liberdade** no resíduo (poucos: as estimativas de erro são pouco confiáveis).

| Termo | Estimativa | Erro-padrão | Valor-p |
|---|---|---|---|
| Intercepto | 19,985 | 0,1015 | < 0,0001 |
| Temperatura | 4,0088 | 0,0728 | 0,00001 |
| pH | 3,0438 | 0,0728 | 0,00003 |
| Temperatura² | −3,0125 | 0,1015 | 0,00008 |
| pH² | −1,9775 | 0,1015 | 0,0003 |
| Temperatura × pH | 1,3712 | 0,0903 | 0,0006 |

`R²` = 0,9997. Método e limites (sem garantia de ótimo global): [planejamentos ótimos](../../docs/metodos/planejamentos-otimos.md).
