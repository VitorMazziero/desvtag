# 19 — Planejamento ótimo em dois lotes

Abra [projeto.enzitag](projeto.enzitag) e vá para **Planejamento e dados**. Em **Ótimo D/I**, consulte o desenho inicial ou o último desenho salvo. Em **Resultados**, o modelo ajustado é o da ampliação. [Ensaios em CSV](ensaios.csv).

## Dados e configuração

Os dados são sintéticos. O fator numérico **X** varia de −1 a 1 e **Condição** tem níveis A e B. A resposta é **Atividade**. O primeiro D-ótimo usa seis ensaios, três níveis candidatos de X, quatro inícios e semente 17. O modelo inclui X, Condição e a interação. Na ampliação, os seis ensaios ficam fixos no lote **Antes** e quatro ensaios entram no lote **Depois**. O modelo ampliado acrescenta um efeito aditivo de lote.

## Conferência

- A ampliação tem cinco parâmetros, dez ensaios e posto 5. O coeficiente da interação de X com a condição A é cerca de 1,4792. O contraste de lote para **Antes** é cerca de −0,9964 na codificação por soma zero.
- Há um perfil de variância salvo para cada desenho. O perfil ampliado abre na distribuição do lote **Depois** e na curva da condição B. Nesse lote, a média da variância escalada na região é aproximadamente 4,9603.
- O arquivo abre com o desenho inicial selecionado para consulta. O relatório do ajuste continua vinculado ao desenho ampliado e ao seu perfil.

O percurso do zero pode ser reproduzido pelo teste de ampliação mista em `et25-categories.spec.ts` em `app/web`. [Método de planejamentos ótimos](../../docs/metodos/planejamentos-otimos.md).
