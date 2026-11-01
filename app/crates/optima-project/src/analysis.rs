//! Análises salvas, vinculadas à revisão dos dados que as geraram.

use optima_core::comparisons::OneWayResult;
use optima_core::descriptive::DescriptiveResult;
use optima_core::designs::analysis::DesignAnalysisResult;
use optima_core::domain::StableId;
use optima_core::optimization::{OptimizationResult, OptimizationSetup};
use optima_core::surface::SurfaceResult;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Opções da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AnalysisOptions {
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
}

/// Resultado guardado, por método.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum AnalysisResult {
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
