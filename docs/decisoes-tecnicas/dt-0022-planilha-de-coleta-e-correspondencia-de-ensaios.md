# DT-0022 — Planilha de coleta e correspondência de ensaios (ET13)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-02 |
| Origem | Pedido do usuário em 2026-11-02 (usar o mesmo arquivo da matriz para importar as respostas); [ET13](../planos-execucao/ativos/et13-planilha-de-coleta.md) |
| Pendências relacionadas | — |
| Substitui / substituída por | Estende o U05 ([DT-0008](dt-0008-formato-enzitag-versoes-recuperacao.md) não muda: o esquema do projeto é o mesmo) |

## Contexto

A matriz de ensaios exportada na v0.2 não tinha colunas de resposta, e a importação **substituía todos os dados** do experimento (recriando fatores e respostas com identificadores novos), de modo que o planejamento deixava de estar ligado aos dados. Além disso, o importador de CSV tratava como dados as linhas `# chave: valor` que o próprio aplicativo grava no início dos CSV exportados.

## Decisões

### 1. A matriz exportada é a planilha de coleta

A matriz de cada planejamento (dois níveis e superfícies, DIC e DBC) ganha **uma coluna por resposta do experimento**, com o nome e a unidade no cabeçalho (`Atividade (U/mL)`), vazia ou com os valores já digitados nos ensaios correspondentes (reexportar preserva o que já foi coletado). O DBC ganha a coluna `unit_id` (que o DIC já tinha). A ordem das colunas existentes não muda.

### 2. Sem identificador novo no projeto: correspondência pelo conteúdo

Em vez de gravar um `run_id` novo (mudança de esquema), a correspondência usa o que já existe:

1. Se **todas** as linhas do arquivo trazem a unidade experimental (`unit_id`: `T<nível>-R<unidade>` no DIC, `B<bloco>-T<tratamento>` no DBC), vale a **unidade** (cada ensaio tem a sua, estável mesmo se a semente mudar).
2. Caso contrário, vale a **combinação de níveis** de todos os fatores presentes no arquivo. Ensaios com os mesmos níveis (réplicas e pontos centrais) são atribuídos **na ordem em que aparecem** no arquivo e nos dados; como têm as mesmas condições, são intercambiáveis para a análise (a ordem de execução não entra no modelo).
3. Níveis numéricos são comparados com **tolerância relativa de 1e-9** (planilhas arredondam e trocam o separador decimal); níveis categóricos, por texto exato (sem espaços nas pontas, com diferença entre maiúsculas e minúsculas).
4. Linha sem ensaio correspondente (níveis diferentes dos planejados ou ensaio já usado) **não é gravada** e é listada; ensaios sem linha continuam como estão.

Alternativa descartada: `run_id` gravado nas linhas. Exigiria campo novo, regra para projetos antigos e não evita o caso das réplicas; a unidade experimental já cobre os planejamentos em que a identidade importa.

### 3. Importação em dois modos, com o preenchimento como padrão

O assistente reconhece uma planilha de coleta quando o experimento tem dados, o cabeçalho traz **todos os fatores** do experimento (ou a coluna de unidade) e **ao menos uma resposta** (nome com ou sem a unidade, sem diferenciar maiúsculas). Nesse caso oferece: **preencher só as respostas** (padrão) ou **substituir todos os dados** (o caminho anterior). O preenchimento:

- grava só células de resposta legíveis como número (vazio = ausente, fica como está; texto não numérico impede gravar e é listado);
- avisa quantos valores já digitados serão substituídos;
- registra duas revisões (`edit` com o estado anterior e `import` com o novo), de modo que o histórico de versões permite desfazer;
- não altera fatores, ordem dos ensaios, `design`, `crd` ou `rcbd`; as análises guardadas passam a «desatualizadas» pelo mecanismo comum de assinatura.

### 4. CSV: linhas de metadados

`splitMetadata` separa as linhas **iniciais** que começam por `#` (e a linha em branco seguinte) da tabela antes de detectar o separador. Um `#` no meio dos dados continua sendo dado. Vale para qualquer CSV exportado pelo aplicativo.

### 5. Onde fica o código

Correspondência e conferência em `features/import/fillResponses.ts` (texto e comparação de níveis; **não é cálculo científico**, então fica fora do núcleo Rust), colunas da matriz em `features/design/collectionColumns.ts`, ação `applyResponses` no estado do projeto.

## Critérios e evidências

`fillResponses.test.ts` (reconhecimento do cabeçalho, correspondência com linhas em outra ordem, réplicas, tolerância, unidades, valores inválidos, ida e volta do CSV exportado); `ImportWizard.fill.test.tsx` (assistente); `collection-flow.spec.ts` (E2E com o motor real: exportar, preencher fora, importar o mesmo arquivo, reexportar; DIC por unidade; recusa de arquivo que não corresponde).
