//! Objetivos, limites obrigatórios, domínio e opções de busca.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::designs::spec::DesignFactor;
use crate::domain::{Dataset, StableId};
use crate::models::TermSpec;
use crate::validation::{Issue, Severity};

/// Maior número de inícios aceito.
pub const MAX_STARTS: u32 = 5000;
/// Maior número de candidatos pedidos.
pub const MAX_CANDIDATES: u32 = 20;
/// Maior expoente de forma aceito.
pub const MAX_SHAPE: f64 = 100.0;
/// Maior importância aceita.
pub const MAX_IMPORTANCE: f64 = 100.0;

/// Objetivo de uma resposta (Derringer e Suich, 1980).
///
/// `shape` é o expoente da função: 1 = linear; maior que 1 exige chegar mais perto do alvo; menor que
/// 1 aceita valores intermediários.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum Goal {
    /// Maximizar: `d = 0` abaixo de `low`, `1` a partir de `target`.
    #[serde(rename_all = "camelCase")]
    Maximize {
        /// Menor valor aceitável (desejabilidade zero abaixo dele).
        low: f64,
        /// Valor a partir do qual a desejabilidade é 1.
        target: f64,
        /// Expoente.
        shape: f64,
    },
    /// Minimizar: `d = 1` até `target`, `0` a partir de `high`.
    #[serde(rename_all = "camelCase")]
    Minimize {
        /// Valor até o qual a desejabilidade é 1.
        target: f64,
        /// Maior valor aceitável (desejabilidade zero a partir dele).
        high: f64,
        /// Expoente.
        shape: f64,
    },
    /// Atingir um alvo, com limites inferior e superior.
    #[serde(rename_all = "camelCase")]
    Target {
        /// Limite inferior (zero abaixo dele).
        low: f64,
        /// Alvo (`d = 1`).
        target: f64,
        /// Limite superior (zero acima dele).
        high: f64,
        /// Expoente do lado inferior.
        shape_low: f64,
        /// Expoente do lado superior.
        shape_high: f64,
    },
    /// Permanecer em uma faixa: `d = 1` dentro, `0` fora.
    #[serde(rename_all = "camelCase")]
    Range {
        /// Limite inferior.
        low: f64,
        /// Limite superior.
        high: f64,
    },
}

/// Objetivo de uma resposta, com o modelo e a importância.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResponseGoal {
    /// Resposta.
    pub response_id: StableId,
    /// Termos do modelo de segunda ordem; vazio = modelo completo.
    pub terms: Vec<TermSpec>,
    /// Objetivo.
    pub goal: Goal,
    /// Importância relativa (peso da média geométrica); 1 por padrão.
    pub importance: f64,
}

/// Limite **obrigatório** sobre o valor previsto de uma resposta (distinto da preferência).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResponseLimit {
    /// Resposta.
    pub response_id: StableId,
    /// Valor previsto mínimo, se houver.
    pub min: Option<f64>,
    /// Valor previsto máximo, se houver.
    pub max: Option<f64>,
}

/// Limites reais de um fator.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorBounds {
    /// Fator.
    pub factor_id: StableId,
    /// Menor valor real.
    pub min: f64,
    /// Maior valor real.
    pub max: f64,
}

/// Domínio da busca.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum DomainSpec {
    /// Região experimental (padrão): intervalos observados dos fatores **e** alavancagem de predição
    /// não superior à maior dos ensaios (sem extrapolação oculta).
    Region,
    /// Extensão **explícita**: limites informados por fator; candidatos fora da região experimental
    /// são marcados como extrapolação.
    #[serde(rename_all = "camelCase")]
    Extended {
        /// Limites por fator (fatores ausentes mantêm o intervalo observado).
        bounds: Vec<FactorBounds>,
    },
}

/// Opções da busca.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SearchOptions {
    /// Inícios (1 a 5000).
    pub starts: u32,
    /// Semente do hipercubo latino (PCG32).
    #[ts(type = "number")]
    pub seed: u64,
    /// Candidatos devolvidos (1 a 20).
    pub max_candidates: u32,
    /// Distância codificada abaixo da qual dois ótimos locais são a mesma solução.
    pub cluster_tolerance: f64,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            starts: 40,
            seed: 1,
            max_candidates: 5,
            cluster_tolerance: 0.05,
        }
    }
}

/// Configuração da otimização (guardada no projeto para restaurar a tela).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimizationSetup {
    /// Objetivos por resposta (ao menos um).
    pub responses: Vec<ResponseGoal>,
    /// Limites obrigatórios sobre as respostas previstas.
    pub limits: Vec<ResponseLimit>,
    /// Domínio da busca.
    pub domain: DomainSpec,
    /// Opções da busca.
    pub search: SearchOptions,
    /// Nível de significância dos intervalos de predição (`0 < α < 1`).
    pub alpha: f64,
}

/// Pedido de otimização.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimizationRequest {
    /// Optional fixed additive execution block and prediction reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<crate::surface::model::SurfaceBlockSpec>,
    /// Dados com os valores reais dos fatores e as respostas.
    pub dataset: Dataset,
    /// Fatores e níveis (definem a codificação).
    pub factors: Vec<DesignFactor>,
    /// Configuração.
    pub setup: OptimizationSetup,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

impl Goal {
    /// Verifica limites e expoentes.
    ///
    /// # Errors
    /// `optimization.invalid_goal` quando valores não são finitos, a ordem dos limites não vale ou um
    /// expoente está fora de `(0, 100]`.
    pub fn validate(&self) -> Result<(), Issue> {
        let shape_ok = |s: f64| s.is_finite() && s > 0.0 && s <= MAX_SHAPE;
        let ok = match *self {
            Self::Maximize { low, target, shape } => {
                low.is_finite() && target.is_finite() && low < target && shape_ok(shape)
            }
            Self::Minimize {
                target,
                high,
                shape,
            } => target.is_finite() && high.is_finite() && target < high && shape_ok(shape),
            Self::Target {
                low,
                target,
                high,
                shape_low,
                shape_high,
            } => {
                low.is_finite()
                    && target.is_finite()
                    && high.is_finite()
                    && low < target
                    && target < high
                    && shape_ok(shape_low)
                    && shape_ok(shape_high)
            }
            Self::Range { low, high } => low.is_finite() && high.is_finite() && low < high,
        };
        if ok {
            Ok(())
        } else {
            Err(error("optimization.invalid_goal").with_param("max_shape", &MAX_SHAPE))
        }
    }
}

impl SearchOptions {
    /// Verifica as faixas das opções.
    ///
    /// # Errors
    /// `optimization.invalid_search`.
    pub fn validate(&self) -> Result<(), Issue> {
        if (1..=MAX_STARTS).contains(&self.starts)
            && (1..=MAX_CANDIDATES).contains(&self.max_candidates)
            && self.cluster_tolerance.is_finite()
            && self.cluster_tolerance > 0.0
            && self.cluster_tolerance <= 2.0
        {
            Ok(())
        } else {
            Err(error("optimization.invalid_search")
                .with_param("max_starts", &MAX_STARTS)
                .with_param("max_candidates", &MAX_CANDIDATES))
        }
    }
}
