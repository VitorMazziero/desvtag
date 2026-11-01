//! Validação numérica de `linear_model` contra mínimos quadrados exatos (racionais) e contra os
//! valores certificados do NIST StRD (`validation/cases/linear_model/`).
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::{Path, PathBuf};

use optima_core::descriptive::Stat;
use optima_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use optima_core::models::linear::fit_model;
use optima_core::models::{CategoricalCoding, LinearModelRequest, ModelSpec, TermSpec};
use serde_json::Value;

fn cases_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases/linear_model")
}

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

struct Case {
    name: String,
    request: LinearModelRequest,
    expected: Value,
}

fn load(dir: &Path) -> Case {
    let name = dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("?")
        .to_string();
    let config: Value =
        serde_json::from_str(&fs::read_to_string(dir.join("config.json")).expect("config"))
            .expect("json");
    let expected: Value =
        serde_json::from_str(&fs::read_to_string(dir.join("expected.json")).expect("expected"))
            .expect("json");
    let text = fs::read_to_string(dir.join("input.csv")).expect("input.csv");
    let mut lines = text.lines();
    let header: Vec<&str> = lines.next().expect("cabeçalho").split(',').collect();
    let response_column = config["responseColumn"].as_str().expect("resposta");
    let response_at = header
        .iter()
        .position(|h| *h == response_column)
        .expect("coluna");
    let factor_columns: Vec<usize> = (0..header.len()).filter(|&c| c != response_at).collect();
    let kind_of = |name: &str| match config["factors"][name].as_str() {
        Some("categorical") => FactorKind::Categorical,
        _ => FactorKind::Numeric,
    };
    let factors = factor_columns
        .iter()
        .map(|&c| Factor {
            id: id(header[c]),
            name: header[c].to_string(),
            kind: kind_of(header[c]),
            unit: None,
            levels: vec![],
        })
        .collect();
    let observations = lines
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(i, line)| {
            let cells: Vec<&str> = line.split(',').map(str::trim).collect();
            let factor_value = |c: usize| {
                if cells[c].is_empty() {
                    None
                } else if kind_of(header[c]) == FactorKind::Categorical {
                    Some(FactorValue::Text(cells[c].to_string()))
                } else {
                    Some(FactorValue::Number(cells[c].parse().expect("número")))
                }
            };
            Observation {
                id: id(&format!("o{}", i + 1)),
                unit_id: None,
                factors: factor_columns.iter().map(|&c| factor_value(c)).collect(),
                responses: vec![if cells[response_at].is_empty() {
                    None
                } else {
                    Some(cells[response_at].parse().expect("número"))
                }],
            }
        })
        .collect();
    let dataset = Dataset {
        factors,
        responses: vec![Response {
            id: id(response_column),
            name: response_column.into(),
            unit: None,
        }],
        observations,
    };
    let terms = config["terms"]
        .as_array()
        .expect("termos")
        .iter()
        .map(|t| {
            let factor = id(t["factor"].as_str().unwrap_or("-"));
            match t["type"].as_str().expect("tipo") {
                "main" => TermSpec::Main { factor_id: factor },
                "interaction" => TermSpec::Interaction {
                    factor_ids: t["factors"]
                        .as_array()
                        .expect("fatores")
                        .iter()
                        .map(|f| id(f.as_str().expect("fator")))
                        .collect(),
                },
                "power" => TermSpec::Power {
                    factor_id: factor,
                    degree: u32::try_from(t["degree"].as_u64().expect("grau")).expect("u32"),
                },
                other => panic!("termo desconhecido {other}"),
            }
        })
        .collect();
    let request = LinearModelRequest {
        dataset,
        spec: ModelSpec {
            response_id: id(response_column),
            intercept: config["intercept"].as_bool().expect("intercepto"),
            terms,
            coding: if config["coding"] == "sum" {
                CategoricalCoding::Sum
            } else {
                CategoricalCoding::Treatment
            },
            confidence_level: config["confidenceLevel"].as_f64().expect("nível"),
        },
    };
    Case {
        name,
        request,
        expected,
    }
}

fn num(v: &Value) -> f64 {
    v.as_f64()
        .unwrap_or_else(|| v.as_str().expect("texto").parse().expect("f64"))
}

/// Dígitos corretos (LRE, Wild e Seber): `−log10(|q − c| / |c|)`, limitado a 15; se `c = 0`, o
/// erro absoluto relativo à `scale`.
fn lre(got: f64, want: f64, scale: f64) -> f64 {
    let err = if want == 0.0 {
        got.abs() / scale
    } else {
        ((got - want) / want).abs()
    };
    if err <= 1e-15 {
        15.0
    } else {
        (-err.log10()).min(15.0)
    }
}

fn value(stat: Stat) -> f64 {
    stat.value().expect("estatística definida")
}

/// LRE mínimo por grandeza.
#[derive(Debug)]
struct Measured {
    coefficients: f64,
    std_errors: f64,
    sigma: f64,
    r_squared: f64,
    ss_model: f64,
    ss_residual: f64,
    f: Option<f64>,
}

fn measure(case: &Case) -> (Measured, optima_core::models::LinearFit) {
    let fit = fit_model(&case.request).unwrap_or_else(|e| panic!("{}: {e}", case.name));
    let exact = &case.expected["exactOnBinary64Inputs"];
    let sst = num(&exact["ssTotal"]);
    let coefficients = exact["coefficients"].as_array().expect("coeficientes");
    assert_eq!(
        coefficients.len(),
        fit.coefficients.len(),
        "{}: número de coeficientes",
        case.name
    );
    // Ajuste (quase) perfeito: a referência de SQE/σ/EP é ~0 e só o erro absoluto, na escala dos
    // dados, tem sentido; F é omitido (o denominador é ruído de arredondamento).
    let perfect = num(&exact["ssResidual"]) / sst < 1e-20;
    let mut measured = Measured {
        coefficients: 15.0,
        std_errors: 15.0,
        sigma: 0.0,
        r_squared: 0.0,
        ss_model: 0.0,
        ss_residual: 0.0,
        f: None,
    };
    for (row, want) in fit.coefficients.iter().zip(coefficients) {
        measured.coefficients =
            measured
                .coefficients
                .min(lre(value(row.estimate), num(&want["estimate"]), 1.0));
        // Erro-padrão nulo (ajuste exato): erro absoluto relativo ao desvio-padrão da resposta.
        let sd_scale = (sst / f64::from(fit.n_observations)).sqrt();
        let want_se = if perfect { 0.0 } else { num(&want["sd"]) };
        measured.std_errors = measured
            .std_errors
            .min(lre(value(row.std_error), want_se, sd_scale));
    }
    let sd_scale = (sst / f64::from(fit.n_observations)).sqrt();
    let want_sigma = if perfect {
        0.0
    } else {
        num(&exact["residualSd"])
    };
    measured.sigma = lre(value(fit.residual_sd), want_sigma, sd_scale);
    measured.r_squared = lre(value(fit.anova.r_squared), num(&exact["rSquared"]), 1.0);
    measured.ss_model = lre(
        value(fit.anova.model.sum_squares),
        num(&exact["ssModel"]),
        sst,
    );
    let want_sse = if perfect {
        0.0
    } else {
        num(&exact["ssResidual"])
    };
    measured.ss_residual = lre(value(fit.anova.residual.sum_squares), want_sse, sst);
    if !perfect && !exact["f"].is_null() {
        measured.f = Some(lre(value(fit.anova.f), num(&exact["f"]), 1.0));
    }
    (measured, fit)
}

#[test]
fn nist_strd_linear_regression_against_exact_reference() {
    let mut dirs: Vec<_> = fs::read_dir(cases_dir())
        .expect("casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.join("expected.json").exists() && p.to_string_lossy().contains("-nist-"))
        .collect();
    dirs.sort();
    assert!(
        dirs.len() >= 11,
        "esperava os 11 conjuntos NIST, achei {}",
        dirs.len()
    );
    for dir in dirs {
        let case = load(&dir);
        let (m, fit) = measure(&case);
        let min = &case.expected["tolerances"]["minLre"];
        let required = |key: &str| min[key].as_f64();
        let checks = [
            ("coefficients", Some(m.coefficients)),
            ("stdErrors", Some(m.std_errors)),
            ("sigma", Some(m.sigma)),
            ("rSquared", Some(m.r_squared)),
            ("ssModel", Some(m.ss_model)),
            ("ssResidual", Some(m.ss_residual)),
            ("f", m.f),
        ];
        for (key, got) in checks {
            match (required(key), got) {
                (Some(need), Some(got)) => assert!(
                    got >= need,
                    "{}: {key} com {got:.1} dígitos corretos, exigido {need}",
                    case.name
                ),
                (None, None) => {}
                other => panic!(
                    "{}: {key}: exigência e medição discordam {other:?}",
                    case.name
                ),
            }
        }
        if case.name.contains("filip") {
            assert!(
                fit.issues.iter().any(|i| i.code == "model.ill_conditioned"),
                "Filip deve emitir o aviso de mau condicionamento"
            );
        } else {
            assert!(
                fit.issues.is_empty(),
                "{}: avisos inesperados {:?}",
                case.name,
                fit.issues
            );
        }
        println!(
            "{}: LRE coef {:.1} · SE {:.1} · σ {:.1} · R² {:.1} · SQM {:.1} · SQE {:.1} · F {:?} · rank {}/{} · cond {:?} · avisos {:?}",
            case.name,
            m.coefficients,
            m.std_errors,
            m.sigma,
            m.r_squared,
            m.ss_model,
            m.ss_residual,
            m.f.map(|v| (v * 10.0).round() / 10.0),
            fit.rank,
            fit.n_columns,
            fit.condition_number.value(),
            fit.issues
                .iter()
                .map(|i| i.code.as_str())
                .collect::<Vec<_>>()
        );
    }
}

fn builder_cases() -> Vec<Case> {
    let mut dirs: Vec<_> = fs::read_dir(cases_dir())
        .expect("casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.join("expected.json").exists() && p.to_string_lossy().contains("-model-"))
        .collect();
    dirs.sort();
    assert!(
        dirs.len() >= 6,
        "esperava os 6 casos do construtor, achei {}",
        dirs.len()
    );
    dirs.iter().map(|d| load(d)).collect()
}

fn close(case: &str, what: &str, got: f64, want: f64, tol: &Value, scale: f64) {
    let rel = tol["relative"].as_f64().expect("relativa");
    let abs = tol["absoluteScale"].as_f64().expect("absoluta");
    let allowed = rel * want.abs() + abs * scale;
    assert!(
        (got - want).abs() <= allowed,
        "{case}: {what}: obtido {got:e}, esperado {want:e} (±{allowed:e})"
    );
}

fn nums(v: &Value) -> Vec<f64> {
    v.as_array().expect("lista").iter().map(num).collect()
}

#[test]
fn model_builder_cases_match_numpy_scipy() {
    for case in builder_cases() {
        let fit = fit_model(&case.request).unwrap_or_else(|e| panic!("{}: {e}", case.name));
        let want = &case.expected["reference"];
        let tol = &case.expected["tolerances"];
        let scale = nums(&want["fitted"])
            .iter()
            .fold(1.0_f64, |a, b| a.max(b.abs()));
        let name = case.name.as_str();

        // Observações usadas e excluídas, na ordem dos dados.
        let used: Vec<String> = fit
            .observations
            .iter()
            .map(|o| {
                o.observation_id
                    .as_ref()
                    .map(ToString::to_string)
                    .unwrap_or_default()
            })
            .collect();
        let want_used: Vec<String> = case.expected["usedObservations"]
            .as_array()
            .expect("usadas")
            .iter()
            .map(|v| v.as_str().unwrap_or_default().to_string())
            .collect();
        assert_eq!(used, want_used, "{name}: observações usadas");
        let excluded: Vec<String> = fit
            .excluded
            .iter()
            .map(|e| e.observation_id.to_string())
            .collect();
        let want_excluded: Vec<String> = case.expected["excludedObservations"]
            .as_array()
            .expect("excluídas")
            .iter()
            .map(|v| v.as_str().unwrap_or_default().to_string())
            .collect();
        assert_eq!(excluded, want_excluded, "{name}: observações excluídas");

        let labels: Vec<&str> = fit.coefficients.iter().map(|c| c.label.as_str()).collect();
        let want_labels: Vec<&str> = case.expected["labels"]
            .as_array()
            .expect("rótulos")
            .iter()
            .map(|v| v.as_str().unwrap_or_default())
            .collect();
        assert_eq!(labels, want_labels, "{name}: colunas");
        assert_eq!(
            u64::from(fit.rank),
            want["rank"].as_u64().expect("posto"),
            "{name}: posto"
        );
        assert_eq!(
            u64::from(fit.df_residual),
            want["dfResidual"].as_u64().expect("gl"),
            "{name}: gl residual"
        );

        close(
            name,
            "SQE",
            value(fit.anova.residual.sum_squares),
            num(&want["ssResidual"]),
            tol,
            num(&want["ssTotal"]),
        );
        close(
            name,
            "SQM",
            value(fit.anova.model.sum_squares),
            num(&want["ssModel"]),
            tol,
            num(&want["ssTotal"]),
        );
        close(
            name,
            "SQT",
            value(fit.anova.total.sum_squares),
            num(&want["ssTotal"]),
            tol,
            num(&want["ssTotal"]),
        );
        close(
            name,
            "R²",
            value(fit.anova.r_squared),
            num(&want["rSquared"]),
            tol,
            1.0,
        );
        for (i, o) in fit.observations.iter().enumerate() {
            close(
                name,
                "ajustado",
                o.fitted,
                nums(&want["fitted"])[i],
                tol,
                scale,
            );
            close(
                name,
                "resíduo",
                o.residual,
                nums(&want["residuals"])[i],
                tol,
                scale,
            );
        }
        if !want["adjRSquared"].is_null() {
            close(
                name,
                "R² ajustado",
                value(fit.anova.adjusted_r_squared),
                num(&want["adjRSquared"]),
                tol,
                1.0,
            );
            close(
                name,
                "σ",
                value(fit.residual_sd),
                num(&want["sigma"]),
                tol,
                scale,
            );
        }
        if !want["f"].is_null() {
            close(name, "F", value(fit.anova.f), num(&want["f"]), tol, 1.0);
            close(
                name,
                "p do F",
                value(fit.anova.p_value),
                num(&want["fP"]),
                tol,
                1.0,
            );
        }
        if let Some(rows) = want["coefficients"].as_array() {
            for (row, w) in fit.coefficients.iter().zip(rows) {
                close(
                    name,
                    &format!("{} estimativa", row.label),
                    value(row.estimate),
                    num(&w["estimate"]),
                    tol,
                    scale,
                );
                close(
                    name,
                    &format!("{} EP", row.label),
                    value(row.std_error),
                    num(&w["stdError"]),
                    tol,
                    scale,
                );
                close(
                    name,
                    &format!("{} t", row.label),
                    value(row.t_value),
                    num(&w["t"]),
                    tol,
                    1.0,
                );
                close(
                    name,
                    &format!("{} p", row.label),
                    value(row.p_value),
                    num(&w["p"]),
                    tol,
                    1.0,
                );
                close(
                    name,
                    &format!("{} IC inf", row.label),
                    value(row.ci_lower),
                    num(&w["ciLower"]),
                    tol,
                    scale,
                );
                close(
                    name,
                    &format!("{} IC sup", row.label),
                    value(row.ci_upper),
                    num(&w["ciUpper"]),
                    tol,
                    scale,
                );
            }
            for (key, pick) in [
                ("leverage", 0),
                ("standardized", 1),
                ("studentized", 2),
                ("cook", 3),
            ] {
                if want[key].is_null() {
                    continue;
                }
                let w = nums(&want[key]);
                for (o, w) in fit.observations.iter().zip(&w) {
                    let got = match pick {
                        0 => o.leverage,
                        1 => value(o.standardized_residual),
                        2 => value(o.studentized_residual),
                        _ => value(o.cooks_distance),
                    };
                    close(name, key, got, *w, tol, 1.0);
                }
            }
        }
        println!("{name}: ok ({} colunas, posto {})", fit.n_columns, fit.rank);
    }
}

#[test]
fn aliasing_and_saturation_are_explicit_states() {
    use optima_core::descriptive::UndefinedReason;
    let cases = builder_cases();
    let aliased = cases
        .iter()
        .find(|c| c.name.contains("aliasing"))
        .expect("caso");
    let fit = fit_model(&aliased.request).expect("ajuste");
    assert_eq!(fit.rank, 3);
    assert_eq!(fit.aliased.len(), 1, "uma coluna aliasada");
    assert!(fit.issues.iter().any(|i| i.code == "model.rank_deficient"));
    let row = fit
        .coefficients
        .iter()
        .find(|c| c.label == fit.aliased[0])
        .expect("linha");
    for stat in [
        row.estimate,
        row.std_error,
        row.t_value,
        row.p_value,
        row.ci_lower,
        row.ci_upper,
    ] {
        assert_eq!(
            stat,
            Stat::Undefined {
                reason: UndefinedReason::NotEstimable
            }
        );
    }

    let saturated = cases
        .iter()
        .find(|c| c.name.contains("saturado"))
        .expect("caso");
    let fit = fit_model(&saturated.request).expect("ajuste");
    assert_eq!(fit.df_residual, 0);
    assert!(fit.issues.iter().any(|i| i.code == "model.no_residual_df"));
    let none = Stat::Undefined {
        reason: UndefinedReason::NoResidualDegreesOfFreedom,
    };
    assert_eq!(fit.residual_sd, none);
    assert_eq!(fit.anova.f, none);
    for row in &fit.coefficients {
        assert!(
            row.estimate.value().is_some(),
            "estimativas existem no modelo saturado"
        );
        assert_eq!(row.std_error, none);
        assert_eq!(row.p_value, none);
    }
}
