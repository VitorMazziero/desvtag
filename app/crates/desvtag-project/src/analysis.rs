//! Análises salvas, vinculadas à revisão dos dados que as geraram.

use desvtag_core::comparisons::OneWayResult;
use desvtag_core::comparisons::procedures::{Procedure, ProcedureResult};
use desvtag_core::descriptive::DescriptiveResult;
use desvtag_core::designs::analysis::DesignAnalysisResult;
use desvtag_core::domain::StableId;
use desvtag_core::models::factorial_anova::{FactorialResult, FactorialSetup};
use desvtag_core::optimization::{OptimizationResult, OptimizationSetup};
use desvtag_core::surface::SurfaceResult;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Opções da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AnalysisOptions {
    /// Saved mixed optimal design whose exact model is selected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub optimal_design_id: Option<StableId>,
    /// Optional fixed additive block and explicit prediction reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub surface_block: Option<desvtag_core::surface::model::SurfaceBlockSpec>,
    /// Resposta analisada (vazio se ainda não escolhida na seleção do experimento).
    pub response_id: Option<StableId>,
    /// Fatores de agrupamento.
    pub group_by: Vec<StableId>,
    /// Fator que define os grupos da comparação de tratamentos (ausente nas análises descritivas).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub factor_id: Option<StableId>,
    /// Nível de significância da comparação (ausente nas análises descritivas).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub alpha: Option<f64>,
    /// Termos do modelo de um planejamento: cada termo é a lista dos fatores que o compõem (um =
    /// efeito principal; dois ou mais = interação). Na superfície de resposta, o mesmo fator
    /// repetido (`[A, A]`) é o termo quadrático `A²`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub terms: Option<Vec<Vec<StableId>>>,
    /// Incluir o termo de curvatura (planejamentos com pontos centrais).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub include_curvature: Option<bool>,
    /// Analisar como superfície de resposta de segunda ordem (matriz personalizada ou importada,
    /// no caminho "Analisar dados existentes").
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub surface: Option<bool>,
    /// Configuração da otimização (objetivos, limites, domínio e busca), para restaurar a tela.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub optimization: Option<OptimizationSetup>,
    /// Procedimento de comparação múltipla escolhido (ausente = Tukey).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub procedure: Option<Procedure>,
    /// Configuração da ANOVA multifatorial.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub factorial: Option<FactorialSetup>,
    /// Modelo escolhido para cada resposta (id da resposta → termos, no formato de `terms`).
    /// `terms` continua sendo o modelo da resposta analisada; a otimização usa o de cada resposta.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub response_models: Option<std::collections::BTreeMap<String, Vec<Vec<StableId>>>>,
}

/// Resultado guardado, por método.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum AnalysisResult {
    /// Complete mixed optimal model, distinct from numeric-only response surfaces.
    OptimalModel(Box<desvtag_core::designs::optimal::model::OptimalModelResult>),
    /// Resumo descritivo.
    Descriptive(Box<DescriptiveResult>),
    /// Comparação de tratamentos de um fator (ANOVA, Tukey, letras, diagnósticos).
    OneWayComparison(Box<OneWayResult>),
    /// Análise de um planejamento de dois níveis (efeitos, curvatura, Lenth, gráficos de triagem).
    TwoLevelDesign(Box<DesignAnalysisResult>),
    /// Superfície de resposta de segunda ordem (ANOVA, falta de ajuste, equação, região).
    ResponseSurface(Box<SurfaceResult>),
    /// Otimização por desejabilidade: candidatos, previsões, compromissos e convergência.
    Optimization(Box<OptimizationResult>),
    /// Procedimento de comparação múltipla (Games–Howell, Dunnett, Bonferroni, Holm, Kruskal–Wallis/Dunn).
    MultipleComparison(Box<ProcedureResult>),
    /// ANOVA multifatorial com blocos, médias marginais e contrastes.
    FactorialAnova(Box<FactorialResult>),
}

/// Análise guardada. Reabrir um projeto **não recalcula**: o resultado é o que foi guardado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AnalysisRecord {
    /// Identificador estável.
    pub id: StableId,
    /// Instante (RFC 3339) informado pela interface.
    pub created_at: String,
    /// Revisão de dados usada.
    pub revision_id: StableId,
    /// Assinatura opaca dos dados e opções (para detectar resultado obsoleto).
    pub signature: String,
    /// Método (`snake_case`).
    pub method_id: String,
    /// Versão do método.
    pub method_version: u32,
    /// Versão do motor que calculou.
    pub engine_version: String,
    /// Opções usadas.
    pub options: AnalysisOptions,
    /// Resultado.
    pub result: AnalysisResult,
}
