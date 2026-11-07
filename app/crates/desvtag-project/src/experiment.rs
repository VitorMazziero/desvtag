//! Dados brutos de um experimento: o que o usuário digitou ou importou.
//!
//! Células guardam o **texto original**; a conversão para números e a validação
//! científica ocorrem na montagem do conjunto de dados (nunca se descarta o texto
//! digitado). Os tipos são a fonte dos contratos TypeScript da interface.

use desvtag_core::domain::{FactorKind, StableId};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use ts_rs::TS;

/// Fator definido pelo usuário (versão textual).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorSpec {
    /// Identificador estável.
    pub id: StableId,
    /// Nome digitado.
    pub name: String,
    /// Quantitativo ou categórico.
    pub kind: FactorKind,
    /// Unidade livre (vazio: sem unidade).
    pub unit: String,
    /// Níveis categóricos declarados, separados por ponto e vírgula; vazio: os presentes nos dados.
    pub levels_text: String,
}

/// Resposta medida (versão textual).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResponseSpec {
    /// Identificador estável.
    pub id: StableId,
    /// Nome digitado.
    pub name: String,
    /// Unidade livre.
    pub unit: String,
}

/// Uma linha de observação, com o texto de cada célula.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RowRecord {
    /// Identificador estável da observação.
    pub id: StableId,
    /// Unidade experimental informada (vazio: não informada).
    pub unit_id: String,
    /// Texto dos fatores, na ordem de `ExperimentData::factors`.
    pub factors: Vec<String>,
    /// Texto das respostas, na ordem de `ExperimentData::responses`.
    pub responses: Vec<String>,
    /// Original occasion/time cell; absent in earlier files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub time_text: Option<String>,
}

/// Tabela completa de um experimento.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExperimentData {
    /// Fatores.
    pub factors: Vec<FactorSpec>,
    /// Respostas.
    pub responses: Vec<ResponseSpec>,
    /// Observações.
    pub rows: Vec<RowRecord>,
}

impl ExperimentData {
    /// Resumo SHA-256 (hexadecimal) do conteúdo, para detectar dados idênticos.
    ///
    /// A serialização segue a ordem fixa dos campos; o mesmo conteúdo gera o
    /// mesmo resumo em qualquer plataforma.
    #[must_use]
    pub fn content_hash(&self) -> String {
        let bytes = serde_json::to_vec(self).unwrap_or_default();
        hex(&Sha256::digest(&bytes))
    }
}

/// Hexadecimal minúsculo.
pub(crate) fn hex(bytes: &[u8]) -> String {
    use std::fmt::Write;
    bytes
        .iter()
        .fold(String::with_capacity(bytes.len() * 2), |mut out, b| {
            let _ = write!(out, "{b:02x}");
            out
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id(s: &str) -> StableId {
        StableId::new(s).unwrap_or_else(|_| unreachable!())
    }

    #[test]
    fn same_content_same_hash_different_content_different_hash() {
        let mut a = ExperimentData::default();
        let b = a.clone();
        assert_eq!(a.content_hash(), b.content_hash());
        a.rows.push(RowRecord {
            id: id("o1"),
            unit_id: String::new(),
            time_text: None,
            factors: vec![],
            responses: vec!["1,5".into()],
        });
        assert_ne!(a.content_hash(), b.content_hash());
        assert_eq!(a.content_hash().len(), 64);
    }

    #[test]
    fn time_is_optional_and_changes_the_data_revision_hash()
    -> Result<(), Box<dyn std::error::Error>> {
        let old = serde_json::json!({"id":"o1","unitId":"S1","factors":[],"responses":["1,5"]});
        let row: RowRecord = serde_json::from_value(old.clone())?;
        assert_eq!(row.time_text, None);
        assert_eq!(serde_json::to_value(&row)?, old);
        let mut data = ExperimentData {
            rows: vec![row],
            ..ExperimentData::default()
        };
        let before = data.content_hash();
        data.rows[0].time_text = Some("0,50".into());
        assert_ne!(data.content_hash(), before);
        let reopened: ExperimentData = serde_json::from_slice(&serde_json::to_vec(&data)?)?;
        assert_eq!(reopened.rows[0].time_text.as_deref(), Some("0,50"));
        Ok(())
    }

    #[test]
    fn hash_of_empty_data_matches_an_independent_sha256() {
        // Calculado fora do código: sha256 de {"factors":[],"responses":[],"rows":[]} (Python hashlib).
        assert_eq!(
            ExperimentData::default().content_hash(),
            "85195020d52211eadbe7771b9cc8d8afe00bf870e82737106e519599bc66af6b"
        );
    }
}
