//! Amplitude studentizada contra SciPy (grade) e mpmath (subconjunto):
//! `validation/cases/studentized_range/`.
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::distributions::studentized_range::StudentizedRange;
use serde_json::Value;

fn load() -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/studentized_range/001-grade-scipy-mpmath/expected.json");
    serde_json::from_str(&fs::read_to_string(path).expect("expected.json")).expect("json")
}

fn num(v: &Value) -> f64 {
    v.as_f64()
        .unwrap_or_else(|| v.as_str().expect("texto").parse().expect("f64"))
}

fn df_of(v: &Value) -> f64 {
    match v.as_str() {
        Some("inf") => f64::INFINITY,
        _ => num(v),
    }
}

#[test]
fn grid_matches_scipy() {
    let case = load();
    let abs_tol = case["tolerances"]["absolute"].as_f64().expect("tolerância");
    let q_tol = case["tolerances"]["quantileRelative"]
        .as_f64()
        .expect("tolerância");
    let (mut worst_cdf, mut worst_sf, mut worst_q) = (0.0_f64, 0.0_f64, 0.0_f64);
    let points = case["points"].as_array().expect("pontos");
    assert!(points.len() >= 400, "{} pontos", points.len());
    let mut kernels = std::collections::HashMap::new();
    for (index, p) in points.iter().enumerate() {
        let k = usize::try_from(p["k"].as_u64().expect("k")).expect("usize");
        let df = df_of(&p["df"]);
        let kernel = kernels
            .entry((k, df.to_bits()))
            .or_insert_with(|| StudentizedRange::new(k, df).expect("núcleo"));
        let q = num(&p["q"]);
        let cdf_err = (kernel.cdf(q) - num(&p["cdf"])).abs();
        let sf_err = (kernel.sf(q) - num(&p["sf"])).abs();
        assert!(cdf_err <= abs_tol, "cdf k={k} df={df} q={q}: {cdf_err:e}");
        assert!(sf_err <= abs_tol, "sf k={k} df={df} q={q}: {sf_err:e}");
        worst_cdf = worst_cdf.max(cdf_err);
        worst_sf = worst_sf.max(sf_err);
        // Quantil: a cauda pedida reproduz o q (nível 1e-5 tem erro absoluto de sf comparável ao próprio nível).
        let level = num(&p["level"]);
        if level >= 1e-3 && index % 3 == 0 {
            let got = kernel.quantile_upper(level).expect("quantil");
            let rel = ((got - q) / q).abs();
            assert!(rel <= q_tol, "quantil k={k} df={df} α={level}: {rel:e}");
            worst_q = worst_q.max(rel);
        }
    }
    println!(
        "{} pontos: erro absoluto máximo cdf {worst_cdf:.2e}, sf {worst_sf:.2e}; quantil relativo máximo {worst_q:.2e}",
        points.len()
    );
}

#[test]
fn mpmath_confirms_the_reference_and_the_implementation() {
    let case = load();
    for check in case["mpmathChecks"].as_array().expect("verificações") {
        let k = usize::try_from(check["k"].as_u64().expect("k")).expect("usize");
        let df = df_of(&check["df"]);
        let q = num(&check["q"]);
        let want = num(&check["cdfMpmath"]);
        let got = StudentizedRange::new(k, df).expect("núcleo").cdf(q);
        let err = (got - want).abs();
        println!("mpmath k={k} df={df} q={q}: erro {err:.2e}");
        assert!(err <= 2e-12, "k={k} df={df}: {err:e}");
    }
}
