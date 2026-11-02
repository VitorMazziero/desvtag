# Planilha de coleta: exportar a matriz, preencher e importar de volta

**Estado:** vigente · **Atualizado em:** 2026-11-02

Depois de gerar um planejamento (dois níveis, superfície, DIC ou DBC), a matriz de ensaios pode ser baixada em CSV ou XLSX e usada **como planilha de coleta**: o arquivo já traz uma coluna para cada resposta, vazia, e é o **mesmo arquivo** que se importa de volta com os valores medidos.

## Passo a passo

1. Cadastre os fatores e as respostas (nome e, se houver, a unidade) e gere o planejamento.
2. Em «Baixar matriz (CSV)» (ou XLSX), salve o arquivo. As colunas `run`, `standard_order`, os fatores e as respostas (por exemplo `Atividade (U/mL)`) estão nele; no DIC e no DBC há também `unit_id`.
3. Preencha as colunas de resposta no laboratório, com o programa de planilhas que preferir (vírgula ou ponto decimal). **Não altere** os níveis dos fatores nem a coluna `unit_id`; não apague colunas de fatores.
4. No aplicativo, use «Importar arquivo (CSV ou XLSX)…» e escolha o arquivo preenchido. O assistente reconhece a planilha e oferece **«Preencher só as respostas do experimento atual»** (padrão). Confira o resumo: quantos valores serão gravados, quantas células ficaram em branco, quantos valores já digitados serão substituídos e as linhas que não correspondem a nenhum ensaio.
5. Confirme em «Preencher respostas». Os fatores, a ordem dos ensaios e o planejamento não mudam; o estado anterior fica no histórico de versões.

Dá para preencher aos poucos: células em branco continuam em branco (ausentes) e podem ser preenchidas em outra importação. Se reexportar a matriz, ela traz os valores já digitados.

## Como o aplicativo identifica cada ensaio

- Com `unit_id` em todas as linhas (DIC e DBC), pela **unidade experimental**.
- Sem ela, pelos **níveis de todos os fatores**. Ensaios de mesmas condições (réplicas e pontos centrais) são atribuídos na ordem em que aparecem, o que não afeta a análise.
- Níveis numéricos toleram arredondamento (diferença relativa de até 1e-9). Linhas cujos níveis não existem no planejamento **não são gravadas** e são listadas.

Detalhes e alternativas descartadas em [DT-0022](../decisoes-tecnicas/dt-0022-planilha-de-coleta-e-correspondencia-de-ensaios.md).

## Linhas de metadados no CSV

Os CSV exportados começam por linhas `# chave: valor` (aplicativo, projeto, método, semente…), seguidas de uma linha em branco. O importador as reconhece e ignora; programas como o pandas as ignoram com `comment="#"`.

## Limites

- Só valores numéricos são aceitos nas respostas; texto como «n.d.» deve ficar em branco.
- Arquivos que não trazem os fatores do experimento (nem `unit_id`) são tratados como dados novos e **substituem** os dados atuais, como antes.
