//! Matrizes CCD/Box–Behnken e análise de superfície de resposta contra referências independentes
//! (`validation/cases/surface_design/` e `response_surface/`).
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::{Path, PathBuf};

use desvtag_core::descriptive::Stat;
use desvtag_core::designs::spec::{AxialKind, DesignFactor, DesignKind, DesignSpec, PointType};
use desvtag_core::designs::{count_runs, generate};
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use desvtag_core::models::TermSpec;
use desvtag_core::surface::equation::{EquationTermKind, evaluate};
use desvtag_core::surface::{GridRequest, SurfaceGridFit, SurfaceRequest, analyze, compute_grid};
use serde_json::Value;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases")
}

fn read(path: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
}

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn factors_of(k: usize) -> Vec<DesignFactor> {
    (0..k)
        .map(|i| DesignFactor {
            id: id(&format!("f{}", i + 1)),
            name: format!("F{}", i + 1),
            low: 10.0 * (i as f64 + 1.0),
            high: 10.0 * (i as f64 + 1.0) + 8.0,
            unit: None,
        })
        .collect()
}

#[test]
fn central_composite_and_box_behnken_matrices_equal_the_independent_enumeration() {
    let v = read(&root().join("surface_design/designs.json"));
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 12);
    for c in cases {
        let k = usize::try_from(c["k"].as_u64().expect("k")).expect("usize");
        let kind = match c["kind"].as_str().expect("tipo") {
            "centralComposite" => DesignKind::CentralComposite {
                axial: match c["axial"].as_str().expect("axial") {
                    "rotatable" => AxialKind::Rotatable,
                    "face" => AxialKind::FaceCentered,
                    _ => AxialKind::Custom {
                        alpha: c["alpha"].as_f64().expect("alpha"),
                    },
                },
                inscribed: c["inscribed"].as_bool().expect("inscrito"),
                generators: Vec::new(),
            },
            _ => DesignKind::BoxBehnken,
        };
        let spec = DesignSpec {
            kind,
            factors: factors_of(k),
            replicates: 1,
            center_points: 0,
            randomize: false,
            seed: 1,
        };
        let label = format!("{} k={k}", c["kind"]);
        let count = count_runs(&spec).expect("contagem");
        let design = generate(&spec).expect("planejamento");
        let rows = c["rows"].as_array().expect("linhas");
        assert_eq!(design.runs.len(), rows.len(), "{label}");
        assert_eq!(count.total as usize, rows.len(), "{label}");
        assert_eq!(
            count.axial_runs as usize,
            c["axialPoints"].as_u64().expect("n") as usize,
            "{label}"
        );
        for (run, want) in design.runs.iter().zip(rows) {
            let want: Vec<f64> = want
                .as_array()
                .expect("linha")
                .iter()
                .map(|x| x.as_f64().expect("número"))
                .collect();
            for (g, w) in run.coded.iter().zip(&want) {
                assert!((g - w).abs() < 1e-12, "{label}: {:?} ≠ {want:?}", run.coded);
            }
        }
        let axial = design
            .runs
            .iter()
            .filter(|r| r.point == PointType::Axial)
            .count();
        assert_eq!(
            axial,
            c["axialPoints"].as_u64().expect("n") as usize,
            "{label}"
        );
        match c["alpha"].as_f64() {
            Some(a) => {
                let got = design.axial_distance.expect("alpha");
                assert!((got - a).abs() < 1e-12, "{label}: α {got} ≠ {a}");
            }
            None => assert!(design.axial_distance.is_none(), "{label}"),
        }
        if let Some(rotatable) = c["rotatable"].as_bool() {
            assert_eq!(
                is_rotatable(
                    &design
                        .runs
                        .iter()
                        .map(|r| r.coded.clone())
                        .collect::<Vec<_>>()
                ),
                rotatable,
                "{label}"
            );
        }
    }
}

/// Condição de Box e Hunter: momentos de ordem 4 = 3 × cruzados, e momentos de ordem 2 iguais.
fn is_rotatable(rows: &[Vec<f64>]) -> bool {
    let k = rows[0].len();
    let m2 = |i: usize| rows.iter().map(|r| r[i] * r[i]).sum::<f64>();
    let n = rows.len() as f64;
    let tol = 1e-9 * n;
    let mut ok = (1..k).all(|i| (m2(i) - m2(0)).abs() < tol);
    for i in 0..k {
        for j in (i + 1)..k {
            let fourth: f64 = rows.iter().map(|r| r[i].powi(4)).sum();
            let cross: f64 = rows.iter().map(|r| r[i] * r[i] * r[j] * r[j]).sum();
            ok &= (fourth - 3.0 * cross).abs() < tol;
        }
    }
    ok
}

fn term_of(code: &str) -> TermSpec {
    let idx: Vec<StableId> = code
        .chars()
        .map(|c| id(&format!("f{}", c as usize - 'A' as usize + 1)))
        .collect();
    match idx.len() {
        1 => TermSpec::Main {
            factor_id: idx[0].clone(),
        },
        _ if idx[0] == idx[1] => TermSpec::Power {
            factor_id: idx[0].clone(),
            degree: 2,
        },
        _ => TermSpec::Interaction { factor_ids: idx },
    }
}

fn request_of(dir: &Path) -> (SurfaceRequest, Value, Value) {
    let config = read(&dir.join("config.json"));
    let expected = read(&dir.join("expected.json"));
    let factors: Vec<DesignFactor> = config["factors"]
        .as_array()
        .expect("fatores")
        .iter()
        .map(|f| DesignFactor {
            id: id(f["id"].as_str().expect("id")),
            name: f["name"].as_str().expect("nome").to_string(),
            low: f["low"].as_f64().expect("low"),
            high: f["high"].as_f64().expect("high"),
            unit: None,
        })
        .collect();
    let k = factors.len();
    let text = fs::read_to_string(dir.join("input.csv")).expect("input.csv");
    let observations = text
        .lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(r, line)| {
            let cells: Vec<f64> = line
                .split(',')
                .map(|c| c.parse().expect("número"))
                .collect();
            Observation {
                id: id(&format!("o{}", r + 1)),
                unit_id: None,
                factors: cells[..k]
                    .iter()
                    .map(|v| Some(FactorValue::Number(*v)))
                    .collect(),
                responses: vec![Some(cells[k])],
            }
        })
        .collect();
    let dataset = Dataset {
        factors: factors
            .iter()
            .map(|f| Factor {
                id: f.id.clone(),
                name: f.name.clone(),
                kind: FactorKind::Numeric,
                unit: None,
                levels: Vec::new(),
            })
            .collect(),
        responses: vec![Response {
            id: id("y"),
            name: "y".into(),
            unit: None,
        }],
        observations,
    };
    let request = SurfaceRequest {
        block: None,
        dataset,
        response_id: id("y"),
        factors,
        terms: config["terms"]
            .as_array()
            .expect("termos")
            .iter()
            .map(|t| term_of(t.as_str().expect("texto")))
            .collect(),
        alpha: config["alpha"].as_f64().expect("alpha"),
    };
    (request, config, expected)
}

fn close(case: &str, what: &str, got: f64, want: f64, rel: f64, abs: f64, scale: f64) {
    let allowed = rel * want.abs() + abs * scale;
    assert!(
        (got - want).abs() <= allowed,
        "{case}: {what}: obtido {got:e}, esperado {want:e} (±{allowed:e})"
    );
}

fn val(s: Stat) -> f64 {
    s.value().expect("definida")
}

#[test]
fn response_surface_cases_match_numpy_scipy() {
    let mut dirs: Vec<_> = fs::read_dir(root().join("response_surface"))
        .expect("casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.join("expected.json").exists())
        .collect();
    dirs.sort();
    assert!(dirs.len() >= 6, "esperava 6 casos, achei {}", dirs.len());
    for dir in dirs {
        let name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let (request, config, expected) = request_of(&dir);
        let want = &expected["reference"];
        let tol = &expected["tolerances"];
        let (rel, abs) = (
            tol["relative"].as_f64().expect("rel"),
            tol["absolute"].as_f64().expect("abs"),
        );
        let scale = request
            .dataset
            .observations
            .iter()
            .filter_map(|o| o.responses[0])
            .fold(1.0_f64, |m, y| m.max(y.abs()));
        let result = analyze(&request).expect(&name);
        assert_eq!(
            result.fit.df_residual as usize,
            want["dfResidual"].as_u64().expect("gl") as usize,
            "{name}"
        );

        // Coeficientes: intercepto e depois os termos.
        let rows = std::iter::once(&result.intercept).chain(result.terms.iter());
        for (i, (row, w)) in rows
            .zip(want["coefficients"].as_array().expect("coef"))
            .enumerate()
        {
            let what = |s: &str| format!("coef {i} {s}");
            close(
                &name,
                &what("estimativa"),
                val(row.estimate),
                w["coefficient"].as_f64().expect("b"),
                rel,
                abs,
                scale,
            );
            close(
                &name,
                &what("EP"),
                val(row.std_error),
                w["stdError"].as_f64().expect("se"),
                rel,
                abs,
                1.0,
            );
            close(
                &name,
                &what("t"),
                val(row.t_value),
                w["t"].as_f64().expect("t"),
                rel,
                abs,
                1.0,
            );
            close(
                &name,
                &what("p"),
                val(row.p_value),
                w["p"].as_f64().expect("p"),
                rel,
                1e-12,
                1.0,
            );
            close(
                &name,
                &what("IC inf"),
                val(row.ci_lower),
                w["ciLower"].as_f64().expect("lo"),
                rel,
                abs,
                scale,
            );
            close(
                &name,
                &what("IC sup"),
                val(row.ci_upper),
                w["ciUpper"].as_f64().expect("hi"),
                rel,
                abs,
                scale,
            );
        }
        for (row, label) in result
            .terms
            .iter()
            .zip(want["labels"].as_array().expect("rótulos"))
        {
            assert_eq!(row.label, label.as_str().expect("texto"), "{name}");
        }

        // ANOVA.
        let a = &want["anova"];
        close(
            &name,
            "SQ modelo",
            val(result.anova.model.sum_squares),
            a["ssModel"].as_f64().expect("v"),
            rel,
            abs,
            scale * scale,
        );
        close(
            &name,
            "SQ resíduo",
            val(result.anova.residual.sum_squares),
            a["ssResidual"].as_f64().expect("v"),
            rel,
            abs,
            scale * scale,
        );
        close(
            &name,
            "SQ total",
            val(result.anova.total.sum_squares),
            a["ssTotal"].as_f64().expect("v"),
            rel,
            abs,
            scale * scale,
        );
        close(
            &name,
            "F",
            val(result.anova.f),
            a["f"].as_f64().expect("v"),
            rel,
            abs,
            1.0,
        );
        close(
            &name,
            "p do modelo",
            val(result.anova.p_value),
            a["p"].as_f64().expect("v"),
            rel,
            1e-12,
            1.0,
        );
        close(
            &name,
            "R²",
            val(result.anova.r_squared),
            a["r2"].as_f64().expect("v"),
            rel,
            abs,
            1.0,
        );
        close(
            &name,
            "R² ajustado",
            val(result.anova.adjusted_r_squared),
            a["adjR2"].as_f64().expect("v"),
            rel,
            abs,
            1.0,
        );

        // Falta de ajuste: apenas quando identificável.
        match (&result.lack_of_fit, want["lackOfFit"].as_object()) {
            (Some(l), Some(w)) => {
                assert_eq!(
                    l.df_pure_error as u64,
                    w["dfPure"].as_u64().expect("gl"),
                    "{name}"
                );
                assert_eq!(
                    l.df_lack_of_fit as u64,
                    w["dfLof"].as_u64().expect("gl"),
                    "{name}"
                );
                close(
                    &name,
                    "SQ erro puro",
                    l.ss_pure_error,
                    w["ssPure"].as_f64().expect("v"),
                    rel,
                    abs,
                    scale * scale,
                );
                close(
                    &name,
                    "SQ falta",
                    val(l.ss_lack_of_fit),
                    w["ssLof"].as_f64().expect("v"),
                    rel,
                    abs,
                    scale * scale,
                );
                close(
                    &name,
                    "F da falta",
                    val(l.f),
                    w["f"].as_f64().expect("v"),
                    rel,
                    abs,
                    1.0,
                );
                close(
                    &name,
                    "p da falta",
                    val(l.p_value),
                    w["p"].as_f64().expect("v"),
                    rel,
                    1e-12,
                    1.0,
                );
            }
            (None, None) => {
                assert!(
                    result
                        .facts
                        .iter()
                        .any(|f| f.key == "surface.lack_of_fit_unavailable"),
                    "{name}: a ausência de falta de ajuste deve ser explicada"
                );
            }
            (got, expect) => panic!("{name}: falta de ajuste {got:?} ≠ {expect:?}"),
        }

        // Ajustados, alavancagens, região.
        for (p, (fit, lev)) in result.fit_points.iter().zip(
            want["fitted"]
                .as_array()
                .expect("aj")
                .iter()
                .zip(want["leverage"].as_array().expect("h")),
        ) {
            close(
                &name,
                "ajustado",
                p.predicted,
                fit.as_f64().expect("v"),
                rel,
                abs,
                scale,
            );
            close(
                &name,
                "alavancagem",
                p.leverage,
                lev.as_f64().expect("v"),
                rel,
                abs,
                1.0,
            );
        }
        close(
            &name,
            "alavancagem máxima",
            result.max_leverage,
            want["maxLeverage"].as_f64().expect("v"),
            rel,
            abs,
            1.0,
        );
        for (r, w) in result
            .ranges
            .iter()
            .zip(want["ranges"].as_array().expect("faixas"))
        {
            close(
                &name,
                "mínimo",
                r.min,
                w["min"].as_f64().expect("v"),
                rel,
                abs,
                1.0,
            );
            close(
                &name,
                "máximo",
                r.max,
                w["max"].as_f64().expect("v"),
                rel,
                abs,
                1.0,
            );
        }
        let gaps: Vec<&str> = want["hierarchyGaps"]
            .as_array()
            .expect("lacunas")
            .iter()
            .map(|g| g.as_str().expect("t"))
            .collect();
        assert_eq!(
            result
                .hierarchy_gaps
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            gaps,
            "{name}"
        );

        // Equação em unidades reais: segundo ajuste direto com os fatores reais.
        let real = result.equation.real.as_ref().expect("equação real");
        for w in want["equationReal"].as_array().expect("equação") {
            let key = w["term"].as_str().expect("termo");
            let parts: Vec<&str> = key.split('|').collect();
            let found = real.iter().find(|t| match (parts[0], t.kind) {
                ("1", EquationTermKind::Intercept) => true,
                ("z", EquationTermKind::Linear) => {
                    t.factors == [parts[1].parse::<usize>().expect("i")]
                }
                ("sq", EquationTermKind::Square) => {
                    t.factors == [parts[1].parse::<usize>().expect("i")]
                }
                ("x", EquationTermKind::Interaction) => {
                    t.factors
                        == [
                            parts[1].parse::<usize>().expect("i"),
                            parts[2].parse::<usize>().expect("j"),
                        ]
                }
                _ => false,
            });
            let term = found.unwrap_or_else(|| panic!("{name}: termo real {key} ausente"));
            let target = w["coefficient"].as_f64().expect("v");
            close(
                &name,
                &format!("equação real {key}"),
                val(term.coefficient),
                target,
                1e-6,
                1e-6,
                scale,
            );
        }
        assert_eq!(
            real.len(),
            want["equationReal"].as_array().expect("e").len(),
            "{name}"
        );

        // Critério: a equação exibida coincide com o preditor, nas duas escalas, nos ensaios.
        for (obs, p) in request.dataset.observations.iter().zip(&result.fit_points) {
            let z: Vec<f64> = obs
                .factors
                .iter()
                .map(|f| match f {
                    Some(FactorValue::Number(v)) => *v,
                    _ => panic!("número"),
                })
                .collect();
            let x: Vec<f64> = z
                .iter()
                .zip(&request.factors)
                .map(|(v, f)| (v - (f.low + f.high) / 2.0) / ((f.high - f.low) / 2.0))
                .collect();
            let coded = evaluate(&result.equation.coded, &x).expect("codificada");
            let in_real = evaluate(real, &z).expect("real");
            close(
                &name,
                "equação codificada = preditor",
                coded,
                p.predicted,
                1e-10,
                1e-10,
                scale,
            );
            close(
                &name,
                "equação real = preditor",
                in_real,
                p.predicted,
                1e-7,
                1e-7,
                scale,
            );
        }

        // Malha 5×5 e extrapolação.
        let axes: Vec<usize> = config["gridAxes"]
            .as_array()
            .expect("eixos")
            .iter()
            .map(|a| a.as_u64().expect("i") as usize)
            .collect();
        let mut grid_request = GridRequest {
            fitted: None,
            surface: request.clone(),
            x_factor: request.factors[axes[0]].id.clone(),
            y_factor: request.factors[axes[1]].id.clone(),
            fixed: Vec::new(),
            steps_x: 5,
            steps_y: 5,
            contour_levels: 6,
        };
        let grid = compute_grid(&grid_request).expect(&name);
        grid_request.fitted = Some(SurfaceGridFit::from(&result));
        assert_eq!(
            compute_grid(&grid_request).expect("saved grid"),
            grid,
            "{name}"
        );
        for (iy, row) in want["grid"].as_array().expect("malha").iter().enumerate() {
            for (ix, cell) in row.as_array().expect("linha").iter().enumerate() {
                close(
                    &name,
                    &format!("malha[{iy}][{ix}]"),
                    val(grid.z[iy][ix]),
                    cell["z"].as_f64().expect("z"),
                    rel,
                    abs,
                    scale,
                );
                assert_eq!(
                    grid.extrapolated[iy][ix],
                    cell["extrapolated"].as_bool().expect("b"),
                    "{name}: extrapolação [{iy}][{ix}]"
                );
            }
        }
        assert_eq!(
            grid.fixed.len(),
            request.factors.len() - 2,
            "{name}: condições fixadas ecoadas"
        );
    }
}

#[test]
fn replicate_identity_is_exact_so_nearby_conditions_are_not_pure_error() {
    let (mut request, _, _) =
        request_of(&root().join("response_surface/001-ccd-rotacional-2-fatores"));
    let pure_df = |r: &SurfaceRequest| {
        analyze(r)
            .expect("ajuste")
            .lack_of_fit
            .map_or(0, |l| l.df_pure_error)
    };
    let before = pure_df(&request);
    assert!(before >= 2, "o caso tem pontos centrais replicados");
    // Referência independente: contagem par a par de condições idênticas no conjunto de dados.
    let independent = |r: &SurfaceRequest| {
        let rows: Vec<Vec<f64>> = r
            .dataset
            .observations
            .iter()
            .map(|o| {
                o.factors
                    .iter()
                    .map(|v| match v {
                        Some(FactorValue::Number(x)) => *x,
                        _ => f64::NAN,
                    })
                    .collect()
            })
            .collect();
        let distinct = rows
            .iter()
            .enumerate()
            .filter(|(i, row)| !rows[..*i].contains(row))
            .count();
        u32::try_from(rows.len() - distinct).expect("contagem")
    };
    assert_eq!(before, independent(&request));
    // Uma réplica deslocada em 1e-12 (abaixo da antiga resolução de nove casas) vira condição própria.
    let center = request
        .dataset
        .observations
        .iter()
        .position(|o| {
            request
                .dataset
                .observations
                .iter()
                .filter(|other| other.factors == o.factors)
                .count()
                > 1
        })
        .expect("réplica");
    if let Some(Some(FactorValue::Number(x))) =
        request.dataset.observations[center].factors.get_mut(0)
    {
        *x += 1e-12;
    }
    assert_eq!(pure_df(&request), before - 1);
    assert_eq!(pure_df(&request), independent(&request));
    // Zero com sinal continua sendo a mesma condição.
    let mut signed = request.clone();
    for o in &mut signed.dataset.observations {
        for v in &mut o.factors {
            if let Some(FactorValue::Number(x)) = v
                && *x == 0.0
            {
                *x = -0.0;
            }
        }
    }
    assert_eq!(pure_df(&signed), pure_df(&request));
}

#[test]
fn invalid_requests_are_refused_with_explicit_diagnostics() {
    let (mut request, _, _) =
        request_of(&root().join("response_surface/001-ccd-rotacional-2-fatores"));
    let refused = |r: &SurfaceRequest, code: &str| {
        let err = analyze(r).expect_err(code);
        let text = format!("{err:?}");
        assert!(text.contains(code), "{code} ∉ {text}");
    };
    request.alpha = 1.0;
    refused(&request, "surface.invalid_alpha");
    request.alpha = 0.05;
    request.terms = vec![TermSpec::Power {
        factor_id: id("f1"),
        degree: 3,
    }];
    refused(&request, "surface.unsupported_term");
    request.terms = Vec::new();
    request.factors[0].high = request.factors[0].low;
    refused(&request, "surface.invalid_levels");
    request.factors.clear();
    refused(&request, "surface.too_few_factors");
}
