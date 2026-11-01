//! Codificação e decodificação do `.enzitag` em bytes (sem acessar o sistema de arquivos).
//!
//! Contêiner ZIP com `manifest.json` e `project.json`. A saída é determinística: o
//! mesmo documento gera os mesmos bytes (datas do ZIP fixas), o que permite comparar
//! e detectar mudanças por resumo.
//!
//! Limites de leitura protegem contra arquivos hostis ou corrompidos (bomba de
//! compressão, entradas demais, caminhos internos perigosos).

use std::io::{Cursor, Read, Write};

use optima_core::validation::{Issue, Severity};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

use crate::document::{ProjectDocument, SCHEMA_VERSION};
use crate::integrity::{matches_manifest, sha256_hex};
use crate::manifest::{
    CONTAINER_VERSION, DOCUMENT_PATH, FORMAT_NAME, MANIFEST_PATH, Manifest, ManifestFile,
};
use crate::migrations::migrate_to_current;

/// Tamanho máximo do arquivo `.enzitag` aceito (bytes).
pub const MAX_ARCHIVE_BYTES: usize = 256 * 1024 * 1024;
/// Tamanho máximo descompactado de cada entrada (bytes).
pub const MAX_ENTRY_BYTES: u64 = 512 * 1024 * 1024;
/// Número máximo de entradas no ZIP.
pub const MAX_ENTRIES: usize = 64;

/// Limites de leitura. Os valores padrão são as constantes `MAX_*`; os testes usam limites pequenos.
#[derive(Debug, Clone, Copy)]
pub struct Limits {
    /// Tamanho máximo do arquivo inteiro.
    pub max_archive_bytes: usize,
    /// Tamanho máximo descompactado de cada entrada.
    pub max_entry_bytes: u64,
    /// Número máximo de entradas.
    pub max_entries: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            max_archive_bytes: MAX_ARCHIVE_BYTES,
            max_entry_bytes: MAX_ENTRY_BYTES,
            max_entries: MAX_ENTRIES,
        }
    }
}

/// Resultado da leitura de um arquivo.
#[derive(Debug)]
pub struct Decoded {
    /// Documento (já no esquema atual).
    pub document: ProjectDocument,
    /// Versão de esquema de origem, se houve migração.
    pub migrated_from: Option<u32>,
    /// Avisos que não impediram a abertura.
    pub warnings: Vec<Issue>,
}

fn err(code: &str) -> Vec<Issue> {
    vec![Issue::new(code, Severity::Error)]
}

/// Codifica o documento em bytes `.enzitag`.
///
/// # Errors
/// Diagnósticos de documento inconsistente (`project.*`) ou falha de codificação.
pub fn encode(document: &ProjectDocument) -> Result<Vec<u8>, Vec<Issue>> {
    // A interface cria revisões sem resumo; o Rust é a única fonte do cálculo.
    let document = &document.clone().with_hashes();
    let issues = document.validate();
    if issues.iter().any(Issue::is_blocking) {
        return Err(issues);
    }
    let project = serde_json::to_vec(document).map_err(|_| err("project.encode_failed"))?;
    let manifest = Manifest {
        format: FORMAT_NAME.to_string(),
        container_version: CONTAINER_VERSION,
        schema_version: document.schema_version,
        app_version: document.app_version.clone(),
        files: vec![ManifestFile {
            path: DOCUMENT_PATH.to_string(),
            sha256: sha256_hex(&project),
            size: project.len() as u64,
        }],
    };
    let manifest_bytes =
        serde_json::to_vec_pretty(&manifest).map_err(|_| err("project.encode_failed"))?;

    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    for (name, bytes) in [(MANIFEST_PATH, &manifest_bytes), (DOCUMENT_PATH, &project)] {
        writer
            .start_file(name, options)
            .map_err(|_| err("project.encode_failed"))?;
        writer
            .write_all(bytes)
            .map_err(|_| err("project.encode_failed"))?;
    }
    let cursor = writer.finish().map_err(|_| err("project.encode_failed"))?;
    Ok(cursor.into_inner())
}

/// Caminho interno seguro: relativo, sem `..`, sem barra invertida, sem unidade de disco.
fn safe_entry_name(name: &str) -> bool {
    !name.is_empty()
        && !name.starts_with('/')
        && !name.contains('\\')
        && !name.contains(':')
        && !name
            .split('/')
            .any(|part| part == ".." || part.is_empty() && !name.ends_with('/'))
}

fn read_entry(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
    limit: u64,
) -> Result<Vec<u8>, Vec<Issue>> {
    let file = archive
        .by_name(name)
        .map_err(|_| err("project.entry_missing"))?;
    if file.size() > limit {
        return Err(vec![
            Issue::new("project.entry_too_large", Severity::Error).with_param("path", &name),
        ]);
    }
    let mut out = Vec::new();
    // `take` limita a leitura real: o tamanho declarado no ZIP pode mentir.
    file.take(limit + 1)
        .read_to_end(&mut out)
        .map_err(|_| err("project.archive_corrupt"))?;
    if out.len() as u64 > limit {
        return Err(vec![
            Issue::new("project.entry_too_large", Severity::Error).with_param("path", &name),
        ]);
    }
    Ok(out)
}

/// Decodifica bytes `.enzitag`. Nunca altera a entrada.
///
/// # Errors
/// Diagnósticos codificados: `project.not_a_zip`, `project.too_large`, `project.too_many_entries`,
/// `project.unsafe_entry_name`, `project.entry_missing`, `project.entry_too_large`,
/// `project.archive_corrupt`, `project.manifest_invalid`, `project.not_enzitag`,
/// `project.integrity_failed`, `project.invalid_schema`, `project.future_schema`,
/// `project.document_invalid` e os de [`ProjectDocument::validate`].
pub fn decode(bytes: &[u8]) -> Result<Decoded, Vec<Issue>> {
    decode_with_limits(bytes, &Limits::default())
}

/// Como [`decode`], com limites explícitos.
///
/// # Errors
/// Os mesmos de [`decode`].
pub fn decode_with_limits(bytes: &[u8], limits: &Limits) -> Result<Decoded, Vec<Issue>> {
    if bytes.len() > limits.max_archive_bytes {
        return Err(err("project.too_large"));
    }
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|_| err("project.not_a_zip"))?;
    if archive.len() > limits.max_entries {
        return Err(err("project.too_many_entries"));
    }
    let mut warnings = Vec::new();
    for i in 0..archive.len() {
        let name = archive
            .by_index(i)
            .map(|f| {
                f.name()
                    .map(std::borrow::Cow::into_owned)
                    .unwrap_or_default()
            })
            .unwrap_or_default();
        if !safe_entry_name(&name) {
            return Err(vec![
                Issue::new("project.unsafe_entry_name", Severity::Error).with_param("path", &name),
            ]);
        }
        if name != MANIFEST_PATH && name != DOCUMENT_PATH {
            warnings.push(
                Issue::new("project.unknown_entry", Severity::Warning).with_param("path", &name),
            );
        }
    }

    let manifest_bytes = read_entry(&mut archive, MANIFEST_PATH, limits.max_entry_bytes)?;
    let manifest: Manifest =
        serde_json::from_slice(&manifest_bytes).map_err(|_| err("project.manifest_invalid"))?;
    if manifest.format != FORMAT_NAME {
        return Err(err("project.not_enzitag"));
    }
    if manifest.container_version > CONTAINER_VERSION {
        return Err(vec![
            Issue::new("project.future_container", Severity::Error)
                .with_param("found", &manifest.container_version)
                .with_param("supported", &CONTAINER_VERSION),
        ]);
    }
    let project_bytes = read_entry(&mut archive, DOCUMENT_PATH, limits.max_entry_bytes)?;
    if !matches_manifest(&manifest, DOCUMENT_PATH, &project_bytes) {
        return Err(err("project.integrity_failed"));
    }

    let value: serde_json::Value =
        serde_json::from_slice(&project_bytes).map_err(|_| err("project.document_invalid"))?;
    let migrated = migrate_to_current(value).map_err(|issue| vec![issue])?;
    let document: ProjectDocument =
        serde_json::from_value(migrated.value).map_err(|_| err("project.document_invalid"))?;
    debug_assert_eq!(document.schema_version, SCHEMA_VERSION);
    let issues = document.validate();
    if issues.iter().any(Issue::is_blocking) {
        return Err(issues);
    }
    Ok(Decoded {
        document,
        migrated_from: migrated.from,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::document::Experiment;
    use optima_core::domain::StableId;

    fn id(s: &str) -> StableId {
        StableId::new(s).unwrap_or_else(|_| unreachable!())
    }

    pub(super) fn sample() -> ProjectDocument {
        let mut doc = ProjectDocument::empty(
            id("p1"),
            "Projeto — açúcar, ß, 日本",
            "2026-11-01T12:00:00Z",
        );
        doc.experiments.push(Experiment::new(
            id("e1"),
            "Experimento 1",
            id("v1"),
            "2026-11-01T12:00:00Z",
        ));
        doc
    }

    fn zip_with(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, bytes) in entries {
            w.start_file(*name, SimpleFileOptions::default())
                .unwrap_or_else(|_| unreachable!());
            w.write_all(bytes).unwrap_or_else(|_| unreachable!());
        }
        w.finish().map(Cursor::into_inner).unwrap_or_default()
    }

    fn codes(r: Result<Decoded, Vec<Issue>>) -> Vec<String> {
        r.err()
            .unwrap_or_default()
            .into_iter()
            .map(|i| i.code)
            .collect()
    }

    #[test]
    fn round_trip_preserves_the_document_including_unicode() {
        let doc = sample();
        let bytes = encode(&doc).unwrap_or_default();
        let back = decode(&bytes).map(|d| (d.document, d.migrated_from, d.warnings.len()));
        assert_eq!(back.ok(), Some((doc, None, 0)));
    }

    #[test]
    fn encoding_is_deterministic() {
        let doc = sample();
        assert_eq!(
            encode(&doc).unwrap_or_default(),
            encode(&doc).unwrap_or_default()
        );
    }

    #[test]
    fn refuses_to_encode_an_inconsistent_document() {
        let mut doc = sample();
        doc.experiments[0].revisions.clear();
        assert_eq!(
            encode(&doc).err().map(|v| v[0].code.clone()),
            Some("project.experiment_without_revision".into())
        );
    }

    #[test]
    fn encoding_recomputes_revision_hashes_so_the_ui_can_send_them_empty() {
        let mut doc = sample();
        doc.experiments[0].revisions[0].content_hash = String::new();
        let back = decode(&encode(&doc).unwrap_or_default())
            .ok()
            .map(|d| d.document);
        assert_eq!(
            back.map(|d| d.experiments[0].revisions[0].content_hash.len()),
            Some(64)
        );
    }

    #[test]
    fn rejects_garbage_and_truncated_files() {
        assert_eq!(codes(decode(b"not a zip")), vec!["project.not_a_zip"]);
        assert_eq!(codes(decode(&[])), vec!["project.not_a_zip"]);
        let bytes = encode(&sample()).unwrap_or_default();
        let truncated = &bytes[..bytes.len() / 2];
        assert!(decode(truncated).is_err());
    }

    #[test]
    fn detects_tampering_through_the_manifest_hash() {
        let bytes = encode(&sample()).unwrap_or_default();
        // Reconstrói o ZIP trocando o documento por outro com o mesmo manifesto.
        let manifest = read_entry(
            &mut ZipArchive::new(Cursor::new(&bytes[..])).unwrap_or_else(|_| unreachable!()),
            MANIFEST_PATH,
            MAX_ENTRY_BYTES,
        )
        .unwrap_or_default();
        let mut other = sample();
        other.name = "adulterado".into();
        let forged = zip_with(&[
            (MANIFEST_PATH, &manifest),
            (
                DOCUMENT_PATH,
                &serde_json::to_vec(&other).unwrap_or_default(),
            ),
        ]);
        assert_eq!(codes(decode(&forged)), vec!["project.integrity_failed"]);
    }

    fn forged_with_document(doc_json: &[u8], schema_version: u32) -> Vec<u8> {
        let manifest = Manifest {
            format: FORMAT_NAME.into(),
            container_version: CONTAINER_VERSION,
            schema_version,
            app_version: "x".into(),
            files: vec![ManifestFile {
                path: DOCUMENT_PATH.into(),
                sha256: sha256_hex(doc_json),
                size: doc_json.len() as u64,
            }],
        };
        zip_with(&[
            (
                MANIFEST_PATH,
                &serde_json::to_vec(&manifest).unwrap_or_default(),
            ),
            (DOCUMENT_PATH, doc_json),
        ])
    }

    #[test]
    fn future_schema_is_refused_without_touching_the_input() {
        let mut value = serde_json::to_value(sample()).unwrap_or_default();
        value["schemaVersion"] = serde_json::json!(SCHEMA_VERSION + 5);
        let bytes = forged_with_document(
            &serde_json::to_vec(&value).unwrap_or_default(),
            SCHEMA_VERSION + 5,
        );
        let before = bytes.clone();
        let issues = decode(&bytes).err().unwrap_or_default();
        assert_eq!(issues[0].code, "project.future_schema");
        assert_eq!(
            issues[0].params.get("found"),
            Some(&(SCHEMA_VERSION + 5).to_string())
        );
        assert_eq!(bytes, before);
    }

    #[test]
    fn rejects_foreign_zip_files_and_unsafe_paths() {
        assert_eq!(
            codes(decode(&zip_with(&[("hello.txt", b"hi")]))),
            vec!["project.entry_missing"]
        );
        let evil = zip_with(&[("../escape.json", b"{}"), (MANIFEST_PATH, b"{}")]);
        assert_eq!(codes(decode(&evil)), vec!["project.unsafe_entry_name"]);
        let abs = zip_with(&[("/etc/passwd", b"x")]);
        assert_eq!(codes(decode(&abs)), vec!["project.unsafe_entry_name"]);
        let win = zip_with(&[("a\\b.json", b"x")]);
        assert_eq!(codes(decode(&win)), vec!["project.unsafe_entry_name"]);
    }

    #[test]
    fn a_wrong_format_name_is_not_an_enzitag_file() {
        let manifest = br#"{"format":"other","containerVersion":1,"schemaVersion":1,"appVersion":"x","files":[]}"#;
        let bytes = zip_with(&[(MANIFEST_PATH, manifest), (DOCUMENT_PATH, b"{}")]);
        assert_eq!(codes(decode(&bytes)), vec!["project.not_enzitag"]);
    }

    #[test]
    fn unknown_entries_are_ignored_with_a_warning() {
        let bytes = encode(&sample()).unwrap_or_default();
        let mut archive =
            ZipArchive::new(Cursor::new(&bytes[..])).unwrap_or_else(|_| unreachable!());
        let manifest = read_entry(&mut archive, MANIFEST_PATH, MAX_ENTRY_BYTES).unwrap_or_default();
        let project = read_entry(&mut archive, DOCUMENT_PATH, MAX_ENTRY_BYTES).unwrap_or_default();
        let with_extra = zip_with(&[
            (MANIFEST_PATH, &manifest),
            (DOCUMENT_PATH, &project),
            ("notes/extra.txt", b"x"),
        ]);
        let decoded = decode(&with_extra).ok();
        assert_eq!(
            decoded.map(|d| d.warnings.into_iter().map(|w| w.code).collect::<Vec<_>>()),
            Some(vec!["project.unknown_entry".to_string()])
        );
    }

    #[test]
    fn size_limits_are_enforced_before_and_during_reading() {
        let bytes = encode(&sample()).unwrap_or_default();
        let tiny_entry = Limits {
            max_entry_bytes: 16,
            ..Limits::default()
        };
        assert_eq!(
            codes(decode_with_limits(&bytes, &tiny_entry)),
            vec!["project.entry_too_large"]
        );
        let tiny_archive = Limits {
            max_archive_bytes: 16,
            ..Limits::default()
        };
        assert_eq!(
            codes(decode_with_limits(&bytes, &tiny_archive)),
            vec!["project.too_large"]
        );
        let one_entry = Limits {
            max_entries: 1,
            ..Limits::default()
        };
        assert_eq!(
            codes(decode_with_limits(&bytes, &one_entry)),
            vec!["project.too_many_entries"]
        );
    }

    #[test]
    fn highly_compressible_entry_is_rejected_by_the_entry_limit() {
        // 4 MiB de zeros compactam para poucos KB; com limite de 1 MiB a leitura é recusada.
        let zeros = vec![0_u8; 4 * 1024 * 1024];
        let manifest = br#"{"format":"enzitag","containerVersion":1,"schemaVersion":1,"appVersion":"x","files":[]}"#;
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let opts = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        w.start_file(MANIFEST_PATH, opts)
            .unwrap_or_else(|_| unreachable!());
        w.write_all(manifest).unwrap_or_else(|_| unreachable!());
        w.start_file(DOCUMENT_PATH, opts)
            .unwrap_or_else(|_| unreachable!());
        w.write_all(&zeros).unwrap_or_else(|_| unreachable!());
        let bytes = w.finish().map(Cursor::into_inner).unwrap_or_default();
        assert!(
            bytes.len() < 100_000,
            "o arquivo é pequeno: {}",
            bytes.len()
        );
        let limits = Limits {
            max_entry_bytes: 1024 * 1024,
            ..Limits::default()
        };
        assert_eq!(
            codes(decode_with_limits(&bytes, &limits)),
            vec!["project.entry_too_large"]
        );
    }
}
