//! Distribuições contra mpmath (60 dígitos): `validation/cases/distributions/`.
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::PathBuf;

use optima_core::distributions::{chi_square, f, normal, student_t};
use serde_json::Value;

fn load(name: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/distributions")
        .join(name)
        .join("expected.json");
    serde_json::from_str(&fs::read_to_string(path).expect("expected.json")).expect("json")
}

fn num(v: &Value) -> f64 {
    v.as_f64()
        .unwrap_or_else(|| v.as_str().expect("número ou texto").parse().expect("f64"))
}

/// Erro relativo máximo de `compute` sobre os pontos de `group`; o texto do valor é lido como o `f64` mais próximo.
fn max_rel_error(
    case: &Value,
    group: &str,
    mut compute: impl FnMut(&Value) -> f64,
) -> (f64, usize) {
    let mut worst = 0.0_f64;
    let points = case[group].as_array().expect(group);
    for p in points {
        let want = num(&p["value"]);
        let got = compute(p);
        let err = if want == 0.0 {
            got.abs()
        } else {
            ((got - want) / want).abs()
        };
        assert!(err.is_finite(), "{group} {p}: obtido {got}");
        if err > worst {
            worst = err;
        }
    }
    (worst, points.len())
}

fn check(name: &str, group: &str, tolerance_key: &str, compute: impl FnMut(&Value) -> f64) {
    let case = load(name);
    let tolerance = case["tolerances"][tolerance_key]
        .as_f64()
        .expect("tolerância");
    let (worst, n) = max_rel_error(&case, group, compute);
    println!(
        "{name}/{group}: {n} pontos, erro relativo máximo {worst:.3e} (tolerância {tolerance:e})"
    );
    assert!(
        worst <= tolerance,
        "{name}/{group}: {worst:e} > {tolerance:e}"
    );
}

/// Como `check`, separando os pontos com `df ≥ 1e5` (limite documentado da fração contínua da beta
/// para parâmetros enormes: ver `docs/metodos/distribuicoes.md`).
fn check_split(name: &str, group: &str, key: &str, compute: impl Fn(&Value) -> f64) {
    let case = load(name);
    let strict = case["tolerances"][key].as_f64().expect("tolerância");
    let loose = case["tolerances"][format!("{key}_df_above_1e5")]
        .as_f64()
        .expect("tolerância df grande");
    for (large, tolerance) in [(false, strict), (true, loose)] {
        let points: Vec<Value> = case[group]
            .as_array()
            .expect(group)
            .iter()
            .filter(|p| (num(&p["df"]) >= 1e5) == large)
            .cloned()
            .collect();
        let subset = serde_json::json!({ group: points });
        let (worst, n) = max_rel_error(&subset, group, &compute);
        println!(
            "{name}/{group} (df {}1e5): {n} pontos, erro relativo máximo {worst:.3e} (tolerância {tolerance:e})",
            if large { ">= " } else { "< " }
        );
        assert!(
            worst <= tolerance,
            "{name}/{group} large={large}: {worst:e} > {tolerance:e}"
        );
    }
}

#[test]
fn normal_matches_mpmath() {
    check("001-normal", "cdf", "cdf_sf_relative", |p| {
        normal::cdf(num(&p["x"]))
    });
    check("001-normal", "sf", "cdf_sf_relative", |p| {
        normal::sf(num(&p["x"]))
    });
    check("001-normal", "quantile_upper", "quantile_relative", |p| {
        normal::quantile_upper(num(&p["q"])).expect("quantil")
    });
}

#[test]
fn student_t_matches_mpmath() {
    check_split("002-student-t", "sf", "sf_relative", |p| {
        student_t::sf(num(&p["t"]), num(&p["df"]))
    });
    check_split(
        "002-student-t",
        "quantile_upper",
        "quantile_relative",
        |p| student_t::quantile_upper(num(&p["q"]), num(&p["df"])).expect("quantil"),
    );
}

#[test]
fn chi_square_matches_mpmath() {
    check("003-chi-square", "cdf", "cdf_sf_relative", |p| {
        chi_square::cdf(num(&p["x"]), num(&p["df"]))
    });
    check("003-chi-square", "sf", "cdf_sf_relative", |p| {
        chi_square::sf(num(&p["x"]), num(&p["df"]))
    });
    check(
        "003-chi-square",
        "quantile_upper",
        "quantile_relative",
        |p| chi_square::quantile_upper(num(&p["q"]), num(&p["df"])).expect("quantil"),
    );
    check(
        "003-chi-square",
        "quantile_lower",
        "quantile_relative",
        |p| chi_square::quantile(num(&p["p"]), num(&p["df"])).expect("quantil"),
    );
}

#[test]
fn f_matches_mpmath() {
    check("004-f", "cdf", "cdf_sf_relative", |p| {
        f::cdf(num(&p["x"]), num(&p["d1"]), num(&p["d2"]))
    });
    check("004-f", "sf", "cdf_sf_relative", |p| {
        f::sf(num(&p["x"]), num(&p["d1"]), num(&p["d2"]))
    });
    check("004-f", "quantile_upper", "quantile_relative", |p| {
        f::quantile_upper(num(&p["q"]), num(&p["d1"]), num(&p["d2"])).expect("quantil")
    });
}
