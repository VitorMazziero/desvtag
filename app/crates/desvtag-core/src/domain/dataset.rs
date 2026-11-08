//! Conjunto de dados experimentais (C01).
//!
//! Dados ausentes são `None` explícito; nunca se usa zero ou `NaN` como
//! substituto. A identidade de uma observação é o seu `id`, não a posição da
//! linha. O motor **não infere** que observações sejam réplicas independentes:
//! `unit_id` registra a unidade experimental quando o usuário a informa.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::factor::FactorKind;
use super::ids::StableId;

/// Fator definido pelo usuário.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Factor {
    /// Identificador estável.
    pub id: StableId,
    /// Nome digitado (preservado como está).
    pub name: String,
    /// Quantitativo ou categórico.
    pub kind: FactorKind,
    /// Unidade livre, quando houver.
    pub unit: Option<String>,
    /// Níveis categóricos declarados, na ordem de apresentação. Vazio: os
    /// níveis são os valores presentes nos dados, em ordem alfabética.
    pub levels: Vec<String>,
}

/// Resposta medida.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Response {
    /// Identificador estável.
    pub id: StableId,
    /// Nome digitado.
    pub name: String,
    /// Unidade livre, quando houver.
    pub unit: Option<String>,
}

/// Valor de um fator em uma observação: número (fator quantitativo) ou
/// texto (fator categórico).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
#[ts(export)]
pub enum FactorValue {
    /// Valor numérico.
    Number(f64),
    /// Rótulo de nível.
    Text(String),
}

/// Uma observação (linha).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Observation {
    /// Identificador estável da observação.
    pub id: StableId,
    /// Unidade experimental, se informada.
    pub unit_id: Option<StableId>,
    /// Valores dos fatores, na ordem de `Dataset::factors`; `None` = ausente.
    pub factors: Vec<Option<FactorValue>>,
    /// Valores das respostas, na ordem de `Dataset::responses`; `None` = ausente.
    pub responses: Vec<Option<f64>>,
}

/// Conjunto de dados.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Dataset {
    /// Fatores.
    pub factors: Vec<Factor>,
    /// Respostas.
    pub responses: Vec<Response>,
    /// Observações.
    pub observations: Vec<Observation>,
}

impl Dataset {
    /// Posição de uma resposta pelo identificador.
    #[must_use]
    pub fn response_index(&self, id: &StableId) -> Option<usize> {
        self.responses.iter().position(|r| &r.id == id)
    }

    /// Posição de um fator pelo identificador.
    #[must_use]
    pub fn factor_index(&self, id: &StableId) -> Option<usize> {
        self.factors.iter().position(|f| &f.id == id)
    }
}
