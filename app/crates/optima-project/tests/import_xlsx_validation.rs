//! Leitura de XLSX contra o caso independente `validation/cases/import_xlsx/`.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_project::xlsx::read_xlsx;
use serde_json::Value;

fn case() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/import_xlsx/001-acentos-virgula-ausentes-formula")
}

#[test]
fn reads_stored_values_as_text_without_running_formulas() {
    let bytes = fs::read(case().join("input.xlsx")).expect("input.xlsx");
    let expected: Value =
        serde_json::from_str(&fs::read_to_string(case().join("expected.json")).expect("expected"))
            .expect("json");

    let sheet = read_xlsx(&bytes, None).expect("leitura");
    assert_eq!(sheet.sheets, ["Dados", "Notas"]);
    assert_eq!(sheet.selected, "Dados");
    let want: Vec<Vec<String>> = serde_json::from_value(expected["rows"].clone()).expect("rows");
    assert_eq!(sheet.rows, want);

    for (code, count) in expected["warningCounts"].as_object().expect("avisos") {
        let found = sheet
            .warnings
            .iter()
            .find(|w| &w.code == code)
            .unwrap_or_else(|| panic!("aviso {code} ausente"));
        assert_eq!(
            found.params.get("count").map(String::as_str),
            Some(count.as_u64().expect("n").to_string().as_str()),
            "{code}"
        );
    }
    assert_eq!(
        sheet.warnings.len(),
        expected["warningCounts"].as_object().expect("avisos").len(),
        "avisos inesperados"
    );
}

#[test]
fn selects_another_sheet_and_reports_unknown_sheets() {
    let bytes = fs::read(case().join("input.xlsx")).expect("input.xlsx");
    let notes = read_xlsx(&bytes, Some("Notas")).expect("Notas");
    assert_eq!(notes.rows, vec![vec!["isto não é dado".to_string()]]);
    let err = read_xlsx(&bytes, Some("Inexistente")).expect_err("deve falhar");
    assert_eq!(err[0].code, "import.sheet_not_found");
    assert_eq!(
        err[0].params.get("sheet").map(String::as_str),
        Some("Inexistente")
    );
}

#[test]
fn a_zip_that_is_not_a_workbook_is_rejected() {
    // Um `.enzitag` é um ZIP, mas não é uma planilha.
    let doc = optima_project::ProjectDocument::empty(
        optima_core::domain::StableId::new("p").expect("id"),
        "x",
        "2026-11-01T00:00:00Z",
    );
    let bytes = optima_project::archive::encode(&doc).expect("encode");
    assert_eq!(
        read_xlsx(&bytes, None).err().map(|v| v[0].code.clone()),
        Some("import.not_xlsx".into())
    );
}
