# Formato dos arquivos de projeto DesvTAG

**Estado:** vigente (contêiner 1, esquema 1) · **Atualizado em:** 2026-11-07

O DesvTAG salva novos projetos com a extensão `.desvtag` e lê arquivos históricos `.enzitag` com o mesmo contêiner ZIP e esquema JSON. A implementação fica em `app/crates/desvtag-project`. [Decisão de formato](../decisoes-tecnicas/dt-0008-formato-enzitag-versoes-recuperacao.md) e [módulos P01–P03](../modulos/p01-p03-projeto-e-arquivo.md).

## 1. Contêiner

Arquivo **ZIP** (compressão *deflate*) com duas entradas obrigatórias:

| Entrada | Conteúdo |
|---|---|
| `manifest.json` | Identifica o formato e lista os arquivos com SHA-256 |
| `project.json` | O documento do projeto (JSON, UTF-8, compacto) |

Outras entradas são **ignoradas com aviso** (`project.unknown_entry`): o aplicativo nunca extrai arquivos para o disco. A escrita é **determinística** (datas do ZIP fixas em 1980-01-01): o mesmo documento gera os mesmos bytes.

### Manifesto

```json
{
  "format": "enzitag",
  "containerVersion": 1,
  "schemaVersion": 1,
  "appVersion": "0.1.0",
  "files": [{ "path": "project.json", "sha256": "<64 hex minúsculos>", "size": 12345 }]
}
```

- `containerVersion` muda quando a estrutura do ZIP ou do manifesto muda de forma incompatível. Um arquivo com contêiner **mais novo** é recusado (`project.future_container`).
- `files[].sha256` e `size` são conferidos antes de interpretar o documento; divergência → `project.integrity_failed`.

## 2. Documento (`project.json`)

Campos em `camelCase`. Tipos de referência: os contratos gerados em `app/web/src/services/engine/contracts.generated.ts` (fonte: Rust).

```text
ProjectDocument
├─ schemaVersion        inteiro ≥ 1 (esquema do documento; atual: 1)
├─ projectId, name      identificador estável e nome digitado
├─ createdAt, modifiedAt, appVersion
└─ experiments[]
   ├─ id, name, entryPath ("plan" | "analyze" | "compare" | null)
   ├─ showUnitColumn, notes
   ├─ analysisSelection { responseId, groupBy[], factorId?, alpha?, terms?, includeCurvature?, surface?, optimization? }
   ├─ design?           DesignSpec do planejamento aplicado (ET06)
   ├─ origin?, confirmation?   vínculo e previsões de um experimento de confirmação (ET08)
   ├─ revisions[]       instantâneos imutáveis, da mais antiga para a mais recente
   │  └─ id, parent, createdAt, reason, contentHash, data
   │     └─ data = { factors[], responses[], rows[] }   (TEXTO das células)
   └─ analyses[]
      └─ id, createdAt, revisionId, signature, methodId, methodVersion, engineVersion,
         options { responseId, groupBy[], factorId?, alpha? },
         result { type: "descriptive" | "oneWayComparison" | "twoLevelDesign" | "responseSurface" | "optimization", ... }
```

`factorId` e `alpha` só existem nas comparações de tratamentos (ET05) e são **omitidos** nas análises descritivas, de modo que arquivos já escritos continuam idênticos e legíveis. O resultado `oneWayComparison` guarda o `OneWayResult` completo (grupos, ANOVA, Tukey, letras, diagnósticos, fatos e proveniência). O esquema segue `1`: as adições são campos opcionais e uma variante nova do resultado ([DT-0010](../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md), item 8); uma versão anterior do aplicativo recusa, com diagnóstico, um arquivo que contenha a variante que não conhece.

O campo opcional `design` guarda o `DesignSpec` (tipo, fatores com níveis reais, réplicas, pontos centrais, aleatorização e **semente**), de modo que a matriz e a ordem de execução possam ser reproduzidas; `terms` e `includeCurvature` registram o modelo escolhido para a análise de efeitos. O resultado `twoLevelDesign` guarda o `DesignAnalysisResult` completo. Aplicar um planejamento preserva os dados anteriores em uma revisão `edit` e registra uma revisão `design` ([DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md), item 7). Esquema segue `1` (campos opcionais).

**Comentários (v0.3, ET20).** O campo opcional `comments` do experimento guarda os comentários de revisão: `id`, `target` (`experiment`, `analysis`, `figure` ou `table`, com `key` e `analysisId` quando couber), `revisionId` (revisão dos dados em que foi escrito), `author` opcional, `text` (≤ 2000 caracteres), `createdAt`, `resolvedAt` opcional e `replies`. Ausente quando vazio, de modo que arquivos sem comentários continuam idênticos; a validação recusa texto vazio ou longo, revisão ou análise inexistentes e identificadores repetidos ([DT-0026](../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md)).

Na superfície de resposta ([DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md)), `design.kind` pode ser `centralComposite` (`axial`: `rotatable`, `faceCentered` ou `custom` com `alpha`; `inscribed`; `generators`) ou `boxBehnken`; `terms` usa o mesmo fator repetido (`[A, A]`) para o termo quadrático; `surface: true` marca a análise de matrizes personalizadas ou importadas; o resultado `responseSurface` guarda o `SurfaceResult` completo (coeficientes, ANOVA, falta de ajuste, equação nas duas escalas, região experimental). A **otimização** ([DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md)) é uma análise própria (`type: "optimization"`, método `desirability_optimization`) com os candidatos, previsões, compromissos e o relatório de convergência; `analysisSelection.optimization` guarda a configuração (objetivos, limites, domínio, busca) para restaurar a tela. Um experimento de **confirmação** traz `origin` (`experimentId` e `analysisId` da otimização que o propôs) e `confirmation` (nível de confiança e, por linha e resposta, valor previsto e intervalo de predição); o projeto é recusado se a origem não existir (`project.origin_not_found`). A malha das figuras **não** é guardada: é recalculada a partir do resultado e dos dados.

Regras:

- **A última revisão é o estado atual dos dados.** Salvar registra uma revisão `manualSave` quando há alterações desde a última.
- **Células guardam o texto original** (`"10,5"`, vazio = ausente). A conversão para número é refeita ao analisar; nada digitado é descartado.
- Cada análise aponta (`revisionId`) para a revisão que a gerou e guarda o resultado calculado. **Reabrir não recalcula.** A interface compara a `signature` com a dos dados atuais para marcar um resultado como obsoleto.
- `contentHash` = SHA-256 hexadecimal da serialização JSON compacta de `data` na ordem de campos `factors → responses → rows` (cada campo na ordem de declaração dos tipos). O Rust o **recalcula ao gravar** e o confere ao ler (`project.revision_hash_mismatch`).
- Motivos de revisão (`reason`): `created`, `edit`, `import`, `analysis`, `manualSave`, `restore`, `design`.
- Identificadores: texto `[A-Za-z0-9_.:-]`, 1 a 64 caracteres, únicos no escopo (experimentos no projeto; revisões e análises em cada experimento).
- **Sem credenciais** de qualquer serviço e **sem caminhos** do computador do usuário.

## 3. Versões

| Versão | Onde | Muda quando |
|---|---|---|
| Aplicativo | `appVersion` | A cada release |
| Contêiner | `manifest.containerVersion` | Estrutura do ZIP ou manifesto incompatível |
| Esquema | `project.json:schemaVersion` | Documento incompatível; exige função em `migrations/` |
| Protocolo | mensagens interface↔motor | Independente do arquivo |

**Abertura.** `schemaVersion` ausente, zero ou não numérico → `project.invalid_schema`. Maior que o suportado → `project.future_schema` com `found` e `supported`; o arquivo **não é alterado nem regravado**. Menor → migração em memória sobre cópia; a versão de origem é informada (`migratedFrom`); os bytes originais permanecem intactos. Hoje existe apenas o esquema 1: o mecanismo de migração está pronto e testado nos casos de recusa, mas **nenhuma migração real foi escrita**, pois não há esquema anterior publicado. A primeira mudança incompatível acrescenta `v1_to_v2` com um arquivo de teste da versão antiga.

## 4. Limites de leitura

| Limite | Valor |
|---|---|
| Tamanho do arquivo | 256 MiB (`project.too_large`) |
| Tamanho descompactado por entrada | 512 MiB (`project.entry_too_large`), imposto **durante** a leitura, pois o tamanho declarado no ZIP pode mentir |
| Número de entradas | 64 (`project.too_many_entries`) |
| Nome de entrada | relativo, sem `..`, sem `\`, sem `:`, sem `/` inicial (`project.unsafe_entry_name`) |

## 5. Códigos de diagnóstico

`project.not_a_zip`, `too_large`, `too_many_entries`, `unsafe_entry_name`, `entry_missing`, `entry_too_large`, `archive_corrupt`, `manifest_invalid`, `not_enzitag`, `future_container`, `integrity_failed`, `invalid_schema`, `future_schema`, `document_invalid`, `encode_failed`, `invalid_base64`, `unknown_entry` (aviso) e os de consistência: `duplicate_experiment_id`, `experiment_without_revision`, `duplicate_revision_id`, `unknown_parent_revision`, `revision_hash_mismatch`, `row_width_mismatch`, `duplicate_analysis_id`, `analysis_unknown_revision`. As mensagens em português e inglês estão em `diagnostics.json`.

## 6. Arquivo de referência

[`validation/cases/project_file/`](../../validation/cases/project_file/README.md): arquivos escritos por Python (`zipfile`, `hashlib`), sem usar o código Rust, mais variantes inválidas (esquema futuro, adulterado, não ZIP, resumo de revisão incorreto). Servem de exemplo prático do formato e de teste de leitura.

## 7. Interoperabilidade

Para ler um projeto `.desvtag` ou `.enzitag` fora do aplicativo, abra o ZIP, leia `project.json` e verifique o SHA-256 contra `manifest.json`. Os dados originais de cada versão estão em `experiments[].revisions[].data`.

## Seleção ativa opcional (ET29)

O documento do esquema 1 pode conter `currentExperimentId`, identificador do experimento ativo ao salvar. O campo ausente preserva compatibilidade; a interface também recua para o primeiro experimento se o id não existir. A seleção não altera cálculos ou revisões de dados, mas conta como alteração do arquivo por ser persistida. Testes em Rust e TypeScript cobrem ausência, presença e reabertura.
