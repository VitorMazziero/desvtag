//! Especificação do modelo linear.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::domain::StableId;

/// Codificação dos fatores categóricos na matriz do modelo.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum CategoricalCoding {
    /// Indicadoras dos níveis, com o **primeiro nível como referência**: o coeficiente é a
    /// diferença para a referência.
    Treatment,
    /// Contrastes de soma zero: o último nível recebe −1 em todas as colunas; o coeficiente é o
    /// desvio da média geral.
    Sum,
}

/// Termo do modelo.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum TermSpec {
    /// Efeito principal de um fator.
    #[serde(rename_all = "camelCase")]
    Main {
        /// Fator.
        factor_id: StableId,
    },
    /// Interação entre dois ou mais fatores distintos (produto das colunas dos efeitos principais).
    #[serde(rename_all = "camelCase")]
    Interaction {
        /// Fatores.
        factor_ids: Vec<StableId>,
    },
    /// Potência `xᵈ` de um fator quantitativo (`d ≥ 2`); o efeito principal deve constar do modelo
    /// quando a hierarquia for desejada (a interface avisa; o motor não impõe).
    #[serde(rename_all = "camelCase")]
    Power {
        /// Fator quantitativo.
        factor_id: StableId,
        /// Grau (≥ 2).
        degree: u32,
    },
}

/// Modelo: resposta, intercepto e termos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ModelSpec {
    /// Resposta modelada.
    pub response_id: StableId,
    /// Inclui intercepto.
    pub intercept: bool,
    /// Termos.
    pub terms: Vec<TermSpec>,
    /// Codificação dos fatores categóricos.
    pub coding: CategoricalCoding,
    /// Nível de confiança dos intervalos (padrão 0,95).
    pub confidence_level: f64,
}
