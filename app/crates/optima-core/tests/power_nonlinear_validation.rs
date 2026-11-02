//! Distribuições não centrais, potência e ajuste não linear contra o SciPy
//! (`validation/tools/make_power_nonlinear_cases.py`).
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::distributions::noncentral::{ncf_sf, nct_cdf};
use optima_core::models::nonlinear::{NonlinearRequest, SaturationModel, fit};
use optima_core::power::{PowerDesign, PowerGoal, PowerRequest, analyze};
use serde_json::Value;

fn load(relative: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases")
        .join(relative);
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
}

fn floats(v: &Value) -> Vec<f64> {
    v.as_array()
        .expect("lista")
        .iter()
        .map(|x| x.as_f64().expect("número"))
        .collect()
}

fn close(got: f64, want: f64, rel: f64, abs: f64, what: &str) {
    assert!(
        (got - want).abs() <= abs + rel * want.abs(),
        "{what}: {got} ≠ {want}"
    );
}

#[test]
fn noncentral_distributions_equal_scipy() {
    let v = load("power_analysis/power.json");
    let mut worst: f64 = 0.0;
    for c in v["ncf"].as_array().expect("ncf") {
        let got = ncf_sf(
            c["x"].as_f64().expect("x"),
            c["d1"].as_f64().expect("d1"),
            c["d2"].as_f64().expect("d2"),
            c["lambda"].as_f64().expect("λ"),
        );
        let want = c["sf"].as_f64().expect("sf");
        worst = worst.max((got - want).abs());
        close(got, want, 1e-9, 1e-12, "ncf.sf");
    }
    for c in v["nct"].as_array().expect("nct") {
        let got = nct_cdf(
            c["t"].as_f64().expect("t"),
            c["df"].as_f64().expect("df"),
            c["delta"].as_f64().expect("δ"),
        );
        let want = c["cdf"].as_f64().expect("cdf");
        worst = worst.max((got - want).abs());
        close(got, want, 1e-9, 1e-11, "nct.cdf");
    }
    assert!(worst < 1e-10, "maior erro absoluto: {worst}");
}

#[test]
fn power_and_sample_size_equal_the_scipy_search() {
    let v = load("power_analysis/power.json");
    for c in v["cases"].as_array().expect("casos") {
        let name = c["name"].as_str().expect("nome");
        let d = &c["design"];
        let design = match d["type"].as_str().expect("tipo") {
            "anova" => PowerDesign::Anova {
                means: floats(&d["means"]),
            },
            "oneSampleT" => PowerDesign::OneSampleT {
                difference: d["difference"].as_f64().expect("d"),
            },
            "pairedT" => PowerDesign::PairedT {
                difference: d["difference"].as_f64().expect("d"),
            },
            _ => PowerDesign::TwoSampleT {
                difference: d["difference"].as_f64().expect("d"),
            },
        };
        let g = &c["goal"];
        let goal = match g["type"].as_str().expect("objetivo") {
            "powerAt" => PowerGoal::PowerAt {
                n: u32::try_from(g["n"].as_u64().expect("n")).expect("u32"),
            },
            "sampleSizeFor" => PowerGoal::SampleSizeFor {
                power: g["power"].as_f64().expect("potência"),
            },
            _ => PowerGoal::PrecisionFor {
                half_width: g["halfWidth"].as_f64().expect("h"),
            },
        };
        let got = analyze(&PowerRequest {
            design,
            sigma: c["sigma"].as_f64().expect("σ"),
            alpha: c["alpha"].as_f64().expect("α"),
            two_sided: c["twoSided"].as_bool().expect("bilateral"),
            goal,
        })
        .expect("potência");
        let e = &c["expected"];
        assert_eq!(u64::from(got.n), e["n"].as_u64().expect("n"), "{name}: n");
        close(
            got.power.value().expect("p"),
            e["power"].as_f64().expect("p"),
            1e-9,
            1e-11,
            name,
        );
        close(
            got.noncentrality,
            e["noncentrality"].as_f64().expect("λ"),
            1e-12,
            1e-12,
            name,
        );
        close(got.df1, e["df1"].as_f64().expect("gl"), 0.0, 1e-12, name);
        close(
            got.critical,
            e["critical"].as_f64().expect("crítico"),
            1e-9,
            1e-12,
            name,
        );
    }
}

#[test]
fn nonlinear_fits_equal_scipy_curve_fit() {
    let v = load("nonlinear_saturation_fit/nonlinear.json");
    for c in v["cases"].as_array().expect("casos") {
        let name = c["name"].as_str().expect("nome");
        let model = match c["model"].as_str().expect("modelo") {
            "monod" => SaturationModel::Monod,
            "haldane" => SaturationModel::Haldane,
            _ => SaturationModel::Hill,
        };
        let got = fit(&NonlinearRequest {
            x: floats(&c["x"]),
            y: floats(&c["y"]),
            model,
            initial: None,
            lower: None,
            upper: None,
            alpha: 0.05,
        })
        .expect("ajuste");
        assert!(got.converged, "{name}");
        let e = &c["expected"];
        let estimates = floats(&e["estimates"]);
        let errors = floats(&e["stdErrors"]);
        for (i, p) in got.parameters.iter().enumerate() {
            close(
                p.estimate,
                estimates[i],
                1e-5,
                1e-8,
                &format!("{name} {}", p.name),
            );
            close(
                p.std_error.value().expect("se"),
                errors[i],
                1e-4,
                1e-8,
                &format!("{name} EP {}", p.name),
            );
        }
        close(got.sse, e["sse"].as_f64().expect("sse"), 1e-7, 1e-12, name);
        close(
            got.sigma.value().expect("σ"),
            e["sigma"].as_f64().expect("σ"),
            1e-7,
            1e-10,
            name,
        );
        close(
            got.r_squared.value().expect("r2"),
            e["rSquared"].as_f64().expect("r2"),
            1e-8,
            1e-10,
            name,
        );
    }
}
