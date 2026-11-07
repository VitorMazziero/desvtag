//! Validação do DIC aleatorizado contra a reimplementação independente em Python
//! (`validation/tools/make_crd_cases.py`): a ordem de execução, o nível e a repetição de cada
//! ensaio devem coincidir com os casos registrados em `validation/cases/completely_randomized_design`.

#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::designs::completely_randomized::{CrdSpec, generate};
use desvtag_core::domain::StableId;
use serde_json::Value;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases")
}

#[test]
fn execution_order_equals_the_independent_implementation() {
    let text =
        fs::read_to_string(root().join("completely_randomized_design/crd.json")).expect("arquivo");
    let v: Value = serde_json::from_str(&text).expect("json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 6);
    for c in cases {
        let levels: Vec<String> = c["levels"]
            .as_array()
            .expect("níveis")
            .iter()
            .map(|l| l.as_str().expect("texto").to_string())
            .collect();
        let spec = CrdSpec {
            factor_id: StableId::new("f1".to_string()).expect("id"),
            factor_name: "Fator".to_string(),
            levels,
            replicates: u32::try_from(c["replicates"].as_u64().expect("repetições")).expect("u32"),
            randomize: c["randomize"].as_bool().expect("bool"),
            seed: c["seed"].as_u64().expect("semente"),
        };
        let got = generate(&spec).expect("DIC");
        let want = c["runs"].as_array().expect("ensaios");
        assert_eq!(got.runs.len(), want.len(), "semente {}", spec.seed);
        for (run, expected) in got.runs.iter().zip(want) {
            assert_eq!(
                u64::from(run.standard_order),
                expected["standardOrder"].as_u64().expect("posição")
            );
            assert_eq!(
                u64::from(run.level_index),
                expected["levelIndex"].as_u64().expect("nível")
            );
            assert_eq!(run.level, expected["level"].as_str().expect("texto"));
            assert_eq!(
                u64::from(run.replicate),
                expected["replicate"].as_u64().expect("repetição")
            );
        }
    }
}
