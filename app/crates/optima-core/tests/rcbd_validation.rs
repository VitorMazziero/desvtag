//! DBC aleatorizado contra a reimplementação independente em Python
//! (`validation/tools/make_rcbd_cases.py`): ordem dos tratamentos em cada bloco idêntica.
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::designs::randomized_block::{RcbdSpec, generate};
use optima_core::domain::StableId;
use serde_json::Value;

#[test]
fn block_orders_equal_the_independent_implementation() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/randomized_block_design/rcbd.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 5);
    let strings = |x: &Value| -> Vec<String> {
        x.as_array()
            .expect("lista")
            .iter()
            .map(|s| s.as_str().expect("texto").to_string())
            .collect()
    };
    for c in cases {
        let spec = RcbdSpec {
            factor_id: StableId::new("f1".to_string()).expect("id"),
            factor_name: "Fator".into(),
            levels: strings(&c["levels"]),
            block_name: "Bloco".into(),
            blocks: strings(&c["blocks"]),
            randomize: c["randomize"].as_bool().expect("bool"),
            seed: c["seed"].as_u64().expect("semente"),
        };
        let got = generate(&spec).expect("DBC");
        let want = c["runs"].as_array().expect("ensaios");
        assert_eq!(got.runs.len(), want.len(), "semente {}", spec.seed);
        for (r, w) in got.runs.iter().zip(want) {
            assert_eq!(u64::from(r.run), w["run"].as_u64().expect("run"));
            assert_eq!(
                u64::from(r.block_index),
                w["blockIndex"].as_u64().expect("bloco")
            );
            assert_eq!(
                u64::from(r.position),
                w["position"].as_u64().expect("posição")
            );
            assert_eq!(
                u64::from(r.level_index),
                w["levelIndex"].as_u64().expect("nível")
            );
            assert_eq!(r.level, w["level"].as_str().expect("texto"));
        }
    }
}
