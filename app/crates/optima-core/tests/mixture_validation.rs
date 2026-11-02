//! Misturas contra as referências independentes em Python
//! (`validation/tools/make_mixture_cases.py`): geração (itertools + PCG32) e modelos de Scheffé
//! (statsmodels OLS sem intercepto, ANOVA centrada).
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::designs::mixture::{MixtureComponent, MixtureKind, MixtureSpec, generate};
use optima_core::domain::StableId;
use optima_core::models::mixture::{MixtureAnalysisRequest, MixtureModel, analyze};
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
fn designs_equal_the_independent_implementation() {
    let v = load("mixture_design/mixture.json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 6);
    for c in cases {
        let q = usize::try_from(c["q"].as_u64().expect("q")).expect("usize");
        let lowers = floats(&c["lowers"]);
        let kind = if c["kind"] == "lattice" {
            MixtureKind::Lattice {
                degree: u32::try_from(c["degree"].as_u64().expect("grau")).expect("u32"),
            }
        } else {
            MixtureKind::Centroid
        };
        let spec = MixtureSpec {
            components: (0..q)
                .map(|i| MixtureComponent {
                    id: StableId::new(format!("f{}", i + 1)).expect("id"),
                    name: format!("C{}", i + 1),
                    lower: lowers[i],
                })
                .collect(),
            kind,
            replicates: u32::try_from(c["replicates"].as_u64().expect("repetições")).expect("u32"),
            center_points: u32::try_from(c["centerPoints"].as_u64().expect("centrais"))
                .expect("u32"),
            randomize: c["randomize"].as_bool().expect("bool"),
            seed: c["seed"].as_u64().expect("semente"),
        };
        let got = generate(&spec).expect("planejamento");
        assert_eq!(
            u64::from(got.base_points),
            c["baseCount"].as_u64().expect("base")
        );
        let want = c["runs"].as_array().expect("ensaios");
        assert_eq!(got.runs.len(), want.len(), "semente {}", spec.seed);
        for (r, w) in got.runs.iter().zip(want) {
            assert_eq!(
                u64::from(r.standard_order),
                w["standardOrder"].as_u64().expect("ordem")
            );
            assert_eq!(
                u64::from(r.support),
                w["support"].as_u64().expect("suporte")
            );
            assert_eq!(r.extra_center, w["extraCenter"].as_bool().expect("central"));
            assert_eq!(
                u64::from(r.replicate),
                w["replicate"].as_u64().expect("repetição")
            );
            for (a, b) in r.pseudo.iter().zip(floats(&w["pseudo"])) {
                close(*a, b, 0.0, 1e-14, "pseudo");
            }
            for (a, b) in r.proportions.iter().zip(floats(&w["proportions"])) {
                close(*a, b, 0.0, 1e-14, "proporção");
            }
        }
    }
}

#[test]
fn scheffe_models_equal_statsmodels() {
    let v = load("mixture_model/scheffe.json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 5);
    for c in cases {
        let name = c["name"].as_str().expect("nome");
        let r = &c["request"];
        let model = match r["model"].as_str().expect("modelo") {
            "linear" => MixtureModel::Linear,
            "quadratic" => MixtureModel::Quadratic,
            _ => MixtureModel::SpecialCubic,
        };
        let request = MixtureAnalysisRequest {
            component_names: r["componentNames"]
                .as_array()
                .expect("nomes")
                .iter()
                .map(|s| s.as_str().expect("texto").to_string())
                .collect(),
            lower_bounds: floats(&r["lowerBounds"]),
            proportions: r["proportions"]
                .as_array()
                .expect("linhas")
                .iter()
                .map(floats)
                .collect(),
            response: floats(&r["response"]),
            model,
            alpha: r["alpha"].as_f64().expect("alfa"),
        };
        let got = analyze(&request).expect("ajuste");
        let e = &c["expected"];
        assert_eq!(
            u64::from(got.fit.rank),
            e["rank"].as_u64().expect("posto"),
            "{name}"
        );
        assert_eq!(
            u64::from(got.fit.df_residual),
            e["dfResidual"].as_u64().expect("gl"),
            "{name}"
        );
        let want = e["coefficients"].as_array().expect("coeficientes");
        assert_eq!(got.fit.coefficients.len(), want.len(), "{name}");
        for (row, w) in got.fit.coefficients.iter().zip(want) {
            let stat = |s: &optima_core::descriptive::Stat| s.value().expect("definido");
            close(
                stat(&row.estimate),
                w["estimate"].as_f64().expect("b"),
                1e-9,
                1e-9,
                &format!("{name} b"),
            );
            close(
                stat(&row.std_error),
                w["stdError"].as_f64().expect("se"),
                1e-9,
                1e-10,
                &format!("{name} se"),
            );
            close(
                stat(&row.t_value),
                w["t"].as_f64().expect("t"),
                1e-8,
                1e-9,
                &format!("{name} t"),
            );
            close(
                stat(&row.p_value),
                w["p"].as_f64().expect("p"),
                1e-7,
                1e-12,
                &format!("{name} p"),
            );
            close(
                stat(&row.ci_lower),
                w["ciLower"].as_f64().expect("ic"),
                1e-8,
                1e-9,
                &format!("{name} ic−"),
            );
            close(
                stat(&row.ci_upper),
                w["ciUpper"].as_f64().expect("ic"),
                1e-8,
                1e-9,
                &format!("{name} ic+"),
            );
        }
        let a = &got.fit.anova;
        close(
            a.total.sum_squares.value().expect("sst"),
            e["ssTotal"].as_f64().expect("sst"),
            1e-10,
            1e-10,
            "SST",
        );
        close(
            a.residual.sum_squares.value().expect("sse"),
            e["ssResidual"].as_f64().expect("sse"),
            1e-8,
            1e-10,
            "SSE",
        );
        close(
            a.f.value().expect("f"),
            e["f"].as_f64().expect("f"),
            1e-8,
            1e-9,
            &format!("{name} F"),
        );
        close(
            a.p_value.value().expect("p"),
            e["pValue"].as_f64().expect("p"),
            1e-7,
            1e-12,
            &format!("{name} p-F"),
        );
        close(
            a.r_squared.value().expect("r2"),
            e["rSquared"].as_f64().expect("r2"),
            1e-10,
            1e-12,
            "R²",
        );
        close(
            a.adjusted_r_squared.value().expect("r2aj"),
            e["adjustedRSquared"].as_f64().expect("r2aj"),
            1e-9,
            1e-12,
            "R² ajustado",
        );
    }
}
