//! Manifesto do contêiner `.enzitag`: identifica o formato e lista os arquivos com resumo SHA-256.

use serde::{Deserialize, Serialize};

/// Identificador do formato (campo `format` do manifesto).
pub const FORMAT_NAME: &str = "enzitag";
/// Versão do **contêiner** (estrutura ZIP e manifesto), independente do esquema do documento.
pub const CONTAINER_VERSION: u32 = 1;
/// Nome do manifesto dentro do ZIP.
pub const MANIFEST_PATH: &str = "manifest.json";
/// Nome do documento dentro do ZIP.
pub const DOCUMENT_PATH: &str = "project.json";

/// Arquivo registrado no manifesto.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestFile {
    /// Caminho dentro do ZIP.
    pub path: String,
    /// SHA-256 hexadecimal do conteúdo.
    pub sha256: String,
    /// Tamanho em bytes.
    pub size: u64,
}

/// Manifesto.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    /// Sempre `"enzitag"`.
    pub format: String,
    /// Versão do contêiner.
    pub container_version: u32,
    /// Versão do esquema do documento.
    pub schema_version: u32,
    /// Versão do aplicativo que escreveu.
    pub app_version: String,
    /// Arquivos do contêiner (exceto o próprio manifesto).
    pub files: Vec<ManifestFile>,
}
