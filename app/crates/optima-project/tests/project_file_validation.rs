//! Leitura de `.enzitag` escritos por Python independente (`validation/cases/project_file/`).
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_project::archive::{decode, encode};
use serde_json::Value;

fn dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases/project_file")
}

fn cases() -> Value {
    serde_json::from_str(&fs::read_to_string(dir().join("cases.json")).expect("cases.json"))
        .expect("json")
}

#[test]
fn reads_the_python_written_file_into_exactly_the_expected_document() {
    let bytes = fs::read(dir().join("001-valid.enzitag")).expect("arquivo");
    let decoded = decode(&bytes).unwrap_or_else(|issues| panic!("{issues:?}"));
    let expected: Value = serde_json::from_str(
        &fs::read_to_string(dir().join("001-valid.expected.json")).expect("expected"),
    )
    .expect("json");
    assert_eq!(
        serde_json::to_value(&decoded.document).expect("json"),
        expected
    );
    assert_eq!(decoded.migrated_from, None);
    assert!(decoded.warnings.is_empty());
    // Acentos e caracteres não latinos preservados.
    assert!(decoded.document.name.contains("日本") && decoded.document.name.contains('ß'));
    assert_eq!(
        decoded.document.experiments[0].notes,
        "Observação com acentos: ação, coração."
    );
}

#[test]
fn invalid_files_are_refused_with_the_expected_codes_and_never_modified() {
    let all = cases();
    for (file, spec) in all.as_object().expect("objeto") {
        if spec["ok"].as_bool() == Some(true) {
            continue;
        }
        let bytes = fs::read(dir().join(file)).expect("arquivo");
        let before = bytes.clone();
        let issues = decode(&bytes).expect_err(file);
        assert_eq!(
            issues[0].code,
            spec["code"].as_str().expect("code"),
            "{file}"
        );
        if let Some(params) = spec["params"].as_object() {
            for (k, v) in params {
                assert_eq!(
                    issues[0].params.get(k).map(String::as_str),
                    v.as_str(),
                    "{file}: {k}"
                );
            }
        }
        assert_eq!(bytes, before, "a entrada não pode ser alterada");
    }
}

#[test]
fn rust_written_files_carry_hashes_that_python_computes_identically() {
    // A mesma regra de resumo (SHA-256 da serialização compacta) implementada em Python e em Rust.
    let bytes = fs::read(dir().join("001-valid.enzitag")).expect("arquivo");
    let doc = decode(&bytes).expect("ler").document;
    let reencoded = decode(&encode(&doc).expect("encode"))
        .expect("ler de novo")
        .document;
    assert_eq!(reencoded, doc);
    for experiment in &doc.experiments {
        for revision in &experiment.revisions {
            assert_eq!(revision.content_hash, revision.data.content_hash());
        }
    }
}
