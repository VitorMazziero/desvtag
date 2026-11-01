//! Validação numérica de `descriptive_summary` contra referências independentes
//! (casos em `validation/cases/descriptive_summary/`), executada pelo contrato
//! completo de `optima-core::descriptive::summarize`.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::{Path, PathBuf};

use optima_core::descriptive::{DescriptiveRequest, summarize};
use optima_core::domain::{Dataset, Observation, Response, StableId};
use serde_json::Value;

fn cases_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases/descriptive_summary")
}

fn load_dataset(case: &Path) -> Dataset {
    let text = fs::read_to_string(case.join("input.csv")).expect("input.csv");
    let observations = text
        .lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(i, line)| Observation {
            id: StableId::new(format!("o{}", i + 1)).expect("id"),
            unit_id: None,
            factors: vec![],
            responses: vec![Some(line.trim().parse::<f64>().expect("número"))],
        })
        .collect();
    Dataset {
        factors: vec![],
        responses: vec![Response {
            id: StableId::new("y").expect("id"),
            name: "y".into(),
            unit: None,
        }],
        observations,
    }
}

fn rel_err(actual: f64, expected: f64) -> f64 {
    if expected == 0.0 {
        actual.abs()
    } else {
        ((actual - expected) / expected).abs()
    }
}

#[test]
fn matches_exact_rational_reference_and_nist_certified_values() {
    let mut cases: Vec<_> = fs::read_dir(cases_dir())
        .expect("pasta de casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.join("expected.json").exists())
        .collect();
    cases.sort();
    assert!(
        cases.len() >= 9,
        "esperava os 9 conjuntos NIST, achei {}",
        cases.len()
    );

    for case in cases {
        let name = case
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let expected: Value = serde_json::from_str(
            &fs::read_to_string(case.join("expected.json")).expect("expected"),
        )
        .expect("json");
        let result = summarize(&DescriptiveRequest {
            dataset: load_dataset(&case),
            response_id: StableId::new("y").expect("id"),
            group_by: vec![],
        })
        .unwrap_or_else(|e| panic!("{name}: {e}"));

        let tol = expected["tolerances"]["relative"]
            .as_f64()
            .expect("tolerância");
        let exact = &expected["exactOnBinary64Inputs"];
        assert_eq!(
            u64::from(result.overall.n_valid),
            expected["n"].as_u64().expect("n"),
            "{name}: n"
        );
        let got = |s: optima_core::descriptive::Stat| {
            s.value().unwrap_or_else(|| panic!("{name}: indefinida"))
        };
        for (label, actual, key) in [
            ("média", got(result.overall.mean), "mean"),
            ("variância", got(result.overall.variance), "variance"),
            ("desvio-padrão", got(result.overall.sd), "sd"),
        ] {
            let want = exact[key].as_f64().expect("valor exato");
            assert!(
                rel_err(actual, want) <= tol,
                "{name}: {label} = {actual:e}, exato {want:e}, erro relativo {:e}",
                rel_err(actual, want)
            );
        }
        assert_eq!(
            got(result.overall.min),
            exact["min"].as_f64().expect("min"),
            "{name}: min"
        );
        assert_eq!(
            got(result.overall.max),
            exact["max"].as_f64().expect("max"),
            "{name}: max"
        );

        // Valores certificados (decimais): diferença limitada pela conversão decimal→binário.
        let bounds = &expected["certifiedBounds"];
        let cert_mean: f64 = expected["certifiedNist"]["mean"]
            .as_str()
            .expect("m")
            .parse()
            .expect("f64");
        let cert_sd: f64 = expected["certifiedNist"]["sd"]
            .as_str()
            .expect("s")
            .parse()
            .expect("f64");
        let mean_allowed = bounds["mean"].as_f64().expect("b") + tol * cert_mean.abs();
        let sd_allowed = bounds["sd"].as_f64().expect("b") + tol * cert_sd.abs();
        assert!(
            (got(result.overall.mean) - cert_mean).abs() <= mean_allowed,
            "{name}: média vs NIST"
        );
        assert!(
            (got(result.overall.sd) - cert_sd).abs() <= sd_allowed,
            "{name}: desvio-padrão vs NIST"
        );
    }
}

#[test]
fn naive_algorithm_would_fail_numacc4_so_the_case_is_discriminating() {
    // Garante que o caso mais difícil distingue o algoritmo correto do ingênuo:
    // variância por Σx² − n·x̄² erra por ordens de grandeza com deslocamento 1e7.
    let text = fs::read_to_string(cases_dir().join("004-nist-numacc4/input.csv")).expect("input");
    let xs: Vec<f64> = text
        .lines()
        .skip(1)
        .filter(|l| !l.is_empty())
        .map(|l| l.trim().parse().expect("f64"))
        .collect();
    let n = xs.len() as f64;
    let mean = xs.iter().sum::<f64>() / n;
    let naive = (xs.iter().map(|x| x * x).sum::<f64>() - n * mean * mean) / (n - 1.0);
    let expected: Value = serde_json::from_str(
        &fs::read_to_string(cases_dir().join("004-nist-numacc4/expected.json")).expect("e"),
    )
    .expect("j");
    let exact = expected["exactOnBinary64Inputs"]["variance"]
        .as_f64()
        .expect("v");
    assert!(
        rel_err(naive, exact) > 1e-3,
        "o caso deveria derrotar o algoritmo ingênuo (erro {:e})",
        rel_err(naive, exact)
    );
}
