//! Fatorial de níveis mistos contra a reimplementação independente em Python
//! (`validation/tools/make_mixed_cases.py`): ordem padrão, ordem de execução e níveis idênticos.
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::designs::mixed_levels::{MixedFactor, MixedSpec, generate};
use optima_core::domain::StableId;
use serde_json::Value;

#[test]
fn runs_equal_the_independent_implementation() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/mixed_levels_design/mixed.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 6);
    for c in cases {
        let factors: Vec<MixedFactor> = c["factors"]
            .as_array()
            .expect("fatores")
            .iter()
            .enumerate()
            .map(|(i, f)| MixedFactor {
                id: StableId::new(format!("f{}", i + 1)).expect("id"),
                name: f["name"].as_str().expect("nome").to_string(),
                levels: f["levels"]
                    .as_array()
                    .expect("níveis")
                    .iter()
                    .map(|s| s.as_str().expect("texto").to_string())
                    .collect(),
            })
            .collect();
        let spec = MixedSpec {
            factors,
            replicates: u32::try_from(c["replicates"].as_u64().expect("repetições")).expect("u32"),
            randomize: c["randomize"].as_bool().expect("bool"),
            seed: c["seed"].as_u64().expect("semente"),
        };
        let got = generate(&spec).expect("planejamento");
        let want = c["runs"].as_array().expect("ensaios");
        assert_eq!(got.runs.len(), want.len(), "semente {}", spec.seed);
        for (r, w) in got.runs.iter().zip(want) {
            assert_eq!(u64::from(r.run), w["run"].as_u64().expect("run"));
            assert_eq!(
                u64::from(r.standard_order),
                w["standardOrder"].as_u64().expect("ordem padrão"),
                "semente {}",
                spec.seed
            );
            let indices: Vec<u64> = r.level_indices.iter().map(|&i| u64::from(i)).collect();
            let expected: Vec<u64> = w["levelIndices"]
                .as_array()
                .expect("índices")
                .iter()
                .map(|x| x.as_u64().expect("índice"))
                .collect();
            assert_eq!(indices, expected, "semente {}", spec.seed);
            let names: Vec<&str> = w["levels"]
                .as_array()
                .expect("níveis")
                .iter()
                .map(|x| x.as_str().expect("texto"))
                .collect();
            assert_eq!(
                r.levels.iter().map(String::as_str).collect::<Vec<_>>(),
                names
            );
            assert_eq!(
                u64::from(r.replicate),
                w["replicate"].as_u64().expect("repetição")
            );
        }
    }
}
