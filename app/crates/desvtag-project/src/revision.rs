//! Revisões dos dados de um experimento.
//!
//! Uma revisão é um instantâneo imutável da tabela. São criadas nas operações
//! relevantes (criação, importação, análise, salvamento manual, restauração), não
//! a cada tecla, e **nunca são apagadas automaticamente**: resultados apontam para
//! a revisão que os gerou (política em `docs/decisoes-tecnicas/dt-0008-…`).

use desvtag_core::domain::StableId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::experiment::ExperimentData;

/// Motivo da revisão.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum RevisionReason {
    /// Experimento criado.
    Created,
    /// Alterações feitas à mão, registradas no limite de outra operação (importar, analisar, salvar).
    Edit,
    /// Dados importados (colagem, CSV, XLSX, matriz externa).
    Import,
    /// Instantâneo anterior a uma análise.
    Analysis,
    /// Salvamento manual com alterações.
    ManualSave,
    /// Restauração de uma revisão anterior (cria nova revisão; a antiga permanece).
    Restore,
    /// Matriz de ensaios gerada por um planejamento de dois níveis.
    Design,
}

/// Instantâneo imutável dos dados.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Revision {
    /// Identificador estável.
    pub id: StableId,
    /// Revisão da qual esta partiu.
    pub parent: Option<StableId>,
    /// Instante (RFC 3339), informado pela interface: o núcleo não lê o relógio.
    pub created_at: String,
    /// Motivo.
    pub reason: RevisionReason,
    /// Dados.
    pub data: ExperimentData,
    /// Resumo SHA-256 dos dados. A interface pode enviar vazio: o `encode` o recalcula.
    pub content_hash: String,
}
