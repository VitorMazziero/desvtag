//! Matrizes e análise de planejamentos de dois níveis contra referências independentes
//! (`validation/cases/two_level_design/` e `two_level_design_analysis/`).
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::descriptive::Stat;
use desvtag_core::designs::analysis::{DesignAnalysisRequest, analyze};
use desvtag_core::designs::randomization::permutation;
use desvtag_core::designs::spec::{DesignKind, DesignSpec, PointType};
use desvtag_core::designs::{count_runs, generate};
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use desvtag_core::models::TermSpec;
use serde_json::Value;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases")
}

fn read(path: &std::path::Path) -> Value {
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
}

fn num(v: &Value) -> f64 {
    v.as_f64()
        .unwrap_or_else(|| v.as_str().expect("texto").parse().expect("f64"))
}

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

#[test]
fn permutations_equal_the_independent_pcg32_implementation() {
    let v = read(&root().join("two_level_design/permutations.json"));
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 25);
    for c in cases {
        let n = usize::try_from(c["n"].as_u64().expect("n")).expect("usize");
        let seed = c["seed"].as_u64().expect("semente");
        let want: Vec<usize> = c["permutation"]
            .as_array()
            .expect("permutação")
            .iter()
            .map(|x| usize::try_from(x.as_u64().expect("índice")).expect("usize"))
            .collect();
        assert_eq!(permutation(n, seed), want, "n={n} semente={seed}");
    }
}

fn spec_of(case: &Value) -> DesignSpec {
    let k = usize::try_from(case["k"].as_u64().expect("k")).expect("usize");
    let kind = match case["kind"].as_str().expect("tipo") {
        "full" => DesignKind::FullFactorial,
        "fractional" => DesignKind::Fractional {
            generators: case["gens"]
                .as_array()
                .expect("geradores")
                .iter()
                .map(|g| g.as_str().expect("texto").to_string())
                .collect(),
        },
        _ => DesignKind::PlackettBurman {
            runs: u32::try_from(case["runs"].as_u64().expect("ensaios")).expect("u32"),
        },
    };
    DesignSpec {
        kind,
        factors: (0..k)
            .map(|i| desvtag_core::designs::spec::DesignFactor {
                id: id(&format!("f{}", i + 1)),
                name: format!("F{}", i + 1),
                low: 10.0 * (i as f64 + 1.0),
                high: 10.0 * (i as f64 + 1.0) + 8.0,
                unit: None,
            })
            .collect(),
        replicates: u32::try_from(case["replicates"].as_u64().expect("réplicas")).expect("u32"),
        center_points: u32::try_from(case["centers"].as_u64().expect("centrais")).expect("u32"),
        randomize: case["randomize"].as_bool().expect("bool"),
        seed: case["seed"].as_u64().expect("semente"),
    }
}

#[test]
fn generated_designs_equal_the_independent_enumeration() {
    let v = read(&root().join("two_level_design/designs.json"));
    for case in v["cases"].as_array().expect("casos") {
        let spec = spec_of(case);
        let design = generate(&spec).unwrap_or_else(|e| panic!("{e}"));
        let want = case["runsList"].as_array().expect("lista");
        assert_eq!(design.runs.len(), want.len());
        assert_eq!(
            count_runs(&spec).expect("contagem").total as usize,
            want.len()
        );
        for (run, w) in design.runs.iter().zip(want) {
            assert_eq!(u64::from(run.run), w["run"].as_u64().expect("run"));
            assert_eq!(
                u64::from(run.standard_order),
                w["standardOrder"].as_u64().expect("padrão")
            );
            assert_eq!(
                u64::from(run.replicate),
                w["replicate"].as_u64().expect("réplica")
            );
            assert_eq!(
                run.point == PointType::Center,
                w["point"].as_str() == Some("center")
            );
            let coded: Vec<f64> = w["coded"]
                .as_array()
                .expect("codificado")
                .iter()
                .map(num)
                .collect();
            assert_eq!(run.coded, coded, "execução {}", run.run);
            // Reversibilidade da codificação: reais nos extremos e no centro.
            for (j, f) in spec.factors.iter().enumerate() {
                let expected = if coded[j] == -1.0 {
                    f.low
                } else if coded[j] == 1.0 {
                    f.high
                } else {
                    0.5 * (f.low + f.high)
                };
                assert!((run.real[j] - expected).abs() < 1e-12);
            }
        }
    }
}

#[test]
fn fractional_relation_resolution_and_aliases_equal_brute_force() {
    let v = read(&root().join("two_level_design/fractional.json"));
    for case in v["cases"].as_array().expect("casos") {
        let k = usize::try_from(case["k"].as_u64().expect("k")).expect("usize");
        let gens: Vec<String> = case["generators"]
            .as_array()
            .expect("g")
            .iter()
            .map(|g| g.as_str().expect("t").to_string())
            .collect();
        let spec = DesignSpec {
            kind: DesignKind::Fractional {
                generators: gens.clone(),
            },
            factors: (0..k)
                .map(|i| desvtag_core::designs::spec::DesignFactor {
                    id: id(&format!("f{}", i + 1)),
                    name: format!("F{}", i + 1),
                    low: 0.0,
                    high: 1.0,
                    unit: None,
                })
                .collect(),
            replicates: 1,
            center_points: 0,
            randomize: false,
            seed: 1,
        };
        let design = generate(&spec).unwrap_or_else(|e| panic!("{gens:?}: {e}"));
        assert_eq!(
            design.resolution.map(u64::from),
            case["resolution"].as_u64(),
            "{gens:?}"
        );
        let want_relation: Vec<&str> = case["definingRelation"]
            .as_array()
            .expect("relação")
            .iter()
            .map(|r| r.as_str().expect("t"))
            .collect();
        assert_eq!(
            design
                .defining_relation
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            want_relation,
            "{gens:?}"
        );
        let want = case["aliases"].as_object().expect("confundimento");
        assert_eq!(design.aliases.len(), want.len());
        for row in &design.aliases {
            let mut got = row.aliases.clone();
            got.sort();
            let mut expected: Vec<String> = want[&row.effect]
                .as_array()
                .expect("lista")
                .iter()
                .map(|a| a.as_str().expect("t").to_string())
                .collect();
            expected.sort();
            assert_eq!(got, expected, "{gens:?} efeito {}", row.effect);
        }
    }
}

#[test]
fn counts_are_available_before_generating_and_limits_are_enforced() {
    let mut spec = spec_of(
        &serde_json::json!({"kind": "full", "k": 4, "runs": 0, "replicates": 3, "centers": 5, "randomize": true, "seed": 1, "gens": []}),
    );
    let c = count_runs(&spec).expect("contagem");
    assert_eq!(
        (c.base_runs, c.factorial_runs, c.center_runs, c.total),
        (16, 48, 5, 53)
    );
    spec.replicates = 400;
    assert!(count_runs(&spec).is_err(), "acima do limite de ensaios");
    spec.replicates = 1;
    spec.factors.truncate(1);
    assert!(count_runs(&spec).is_err(), "menos de dois fatores");
}

fn dataset_and_request(dir: &std::path::Path) -> (DesignAnalysisRequest, Value) {
    let config = read(&dir.join("config.json"));
    let expected = read(&dir.join("expected.json"));
    let spec: DesignSpec = serde_json::from_value(config["spec"].clone()).expect("spec");
    let text = fs::read_to_string(dir.join("input.csv")).expect("input.csv");
    let mut lines = text.lines();
    let header: Vec<&str> = lines.next().expect("cabeçalho").split(',').collect();
    let k = spec.factors.len();
    let factors = (0..k)
        .map(|i| Factor {
            id: id(&format!("f{}", i + 1)),
            name: header[i].to_string(),
            kind: FactorKind::Numeric,
            unit: None,
            levels: vec![],
        })
        .collect();
    let observations = lines
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
    let terms = config["terms"]
        .as_array()
        .expect("termos")
        .iter()
        .map(|t| {
            let ids: Vec<StableId> = t
                .as_str()
                .expect("t")
                .chars()
                .map(|c| id(&format!("f{}", c as usize - 'A' as usize + 1)))
                .collect();
            if ids.len() == 1 {
                TermSpec::Main {
                    factor_id: ids[0].clone(),
                }
            } else {
                TermSpec::Interaction { factor_ids: ids }
            }
        })
        .collect();
    let request = DesignAnalysisRequest {
        dataset: Dataset {
            factors,
            responses: vec![Response {
                id: id("y"),
                name: "y".into(),
                unit: None,
            }],
            observations,
        },
        response_id: id("y"),
        spec,
        terms,
        alpha: config["alpha"].as_f64().expect("alpha"),
        include_curvature: config["includeCurvature"].as_bool().expect("bool"),
    };
    (request, expected)
}

fn close(case: &str, what: &str, got: f64, want: f64, tol: &Value, scale: f64) {
    let allowed = tol["relative"].as_f64().expect("rel") * want.abs()
        + tol["absoluteScale"].as_f64().expect("abs") * scale;
    assert!(
        (got - want).abs() <= allowed,
        "{case}: {what}: obtido {got:e}, esperado {want:e} (±{allowed:e})"
    );
}

fn val(s: Stat) -> f64 {
    s.value().expect("definida")
}

#[test]
fn analysis_cases_match_numpy_scipy_and_lenth() {
    let mut dirs: Vec<_> = fs::read_dir(root().join("two_level_design_analysis"))
        .expect("casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.join("expected.json").exists())
        .collect();
    dirs.sort();
    assert!(dirs.len() >= 5, "esperava 5 casos, achei {}", dirs.len());
    for dir in dirs {
        let name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let (request, expected) = dataset_and_request(&dir);
        let want = &expected["reference"];
        let tol = &expected["tolerances"];
        let r = analyze(&request).unwrap_or_else(|e| panic!("{name}: {e}"));
        assert_eq!(
            u64::from(r.fit.rank),
            want["rank"].as_u64().expect("posto"),
            "{name}: posto"
        );
        assert_eq!(
            u64::from(r.fit.df_residual),
            want["dfResidual"].as_u64().expect("gl"),
            "{name}: gl residual"
        );
        let scale = want["fitted"]
            .as_array()
            .expect("ajustados")
            .iter()
            .map(|v| num(v).abs())
            .fold(1.0_f64, f64::max);
        for (o, w) in r
            .fit
            .observations
            .iter()
            .zip(want["fitted"].as_array().expect("ajustados"))
        {
            close(&name, "ajustado", o.fitted, num(w), tol, scale);
        }
        if !want["estimable"].as_bool().expect("bool") {
            // Termos confundidos: o motor não os apresenta como estimados.
            let undefined = r
                .effects
                .iter()
                .filter(|e| e.effect.value().is_none())
                .count() as u64;
            assert_eq!(
                undefined,
                want["aliasedColumns"].as_u64().expect("colunas"),
                "{name}: termos não estimáveis"
            );
            assert!(r.issues.iter().any(
                |i| i.code == "design.not_estimable_terms" || i.code == "model.rank_deficient"
            ));
            assert!(
                r.effects.iter().any(|e| !e.aliased_with.is_empty()),
                "{name}: confundimento informado"
            );
            continue;
        }
        let coefficients = want["coefficients"].as_array().expect("coeficientes");
        // Intercepto, termos e (se houver) curvatura.
        close(
            &name,
            "intercepto",
            val(r.intercept),
            num(&coefficients[0]["coefficient"]),
            tol,
            scale,
        );
        for (i, e) in r.effects.iter().enumerate() {
            let w = &coefficients[i + 1];
            close(
                &name,
                &format!("{} coeficiente", e.label),
                val(e.coefficient),
                num(&w["coefficient"]),
                tol,
                scale,
            );
            close(
                &name,
                &format!("{} efeito", e.label),
                val(e.effect),
                num(&w["effect"]),
                tol,
                scale,
            );
            if !w["stdError"].is_null() {
                close(
                    &name,
                    &format!("{} EP", e.label),
                    val(e.std_error),
                    num(&w["stdError"]),
                    tol,
                    scale,
                );
                close(
                    &name,
                    &format!("{} t", e.label),
                    val(e.t_value),
                    num(&w["t"]),
                    tol,
                    1.0,
                );
                close(
                    &name,
                    &format!("{} p", e.label),
                    val(e.p_value),
                    num(&w["p"]),
                    tol,
                    1.0,
                );
                close(
                    &name,
                    &format!("{} IC inf", e.label),
                    val(e.ci_lower),
                    num(&w["ciLower"]),
                    tol,
                    scale,
                );
                close(
                    &name,
                    &format!("{} IC sup", e.label),
                    val(e.ci_upper),
                    num(&w["ciUpper"]),
                    tol,
                    scale,
                );
            } else {
                assert!(
                    e.std_error.value().is_none() && e.p_value.value().is_none(),
                    "{name}: sem gl residual, sem p"
                );
            }
        }
        match (
            &r.curvature,
            want["labels"].as_array().expect("rótulos").last(),
        ) {
            (Some(c), Some(last)) if last == "curvature" => {
                let w = coefficients.last().expect("curvatura");
                close(
                    &name,
                    "curvatura",
                    val(c.difference),
                    num(&w["coefficient"]),
                    tol,
                    scale,
                );
                close(&name, "curvatura t", val(c.t_value), num(&w["t"]), tol, 1.0);
                close(&name, "curvatura p", val(c.p_value), num(&w["p"]), tol, 1.0);
                if !want["classicalCurvatureT"].is_null() {
                    close(
                        &name,
                        "curvatura clássica",
                        val(c.t_value),
                        num(&want["classicalCurvatureT"]),
                        tol,
                        1.0,
                    );
                }
            }
            (None, Some(last)) => assert_ne!(last, "curvature", "{name}: curvatura esperada"),
            other => panic!("{name}: curvatura inconsistente {other:?}"),
        }
        if !want["anova"].is_null() {
            let a = &want["anova"];
            close(
                &name,
                "SQ modelo",
                val(r.anova.model.sum_squares),
                num(&a["ssModel"]),
                tol,
                scale * scale,
            );
            close(
                &name,
                "SQE",
                val(r.anova.residual.sum_squares),
                num(&a["ssResidual"]),
                tol,
                scale * scale,
            );
            close(
                &name,
                "R²",
                val(r.anova.r_squared),
                num(&a["rSquared"]),
                tol,
                1.0,
            );
            if !a["f"].is_null() {
                close(&name, "F", val(r.anova.f), num(&a["f"]), tol, 1.0);
                close(
                    &name,
                    "p do F",
                    val(r.anova.p_value),
                    num(&a["p"]),
                    tol,
                    1.0,
                );
            }
        }
        match (&r.lenth, want["lenth"].is_null()) {
            (Some(l), false) => {
                let w = &want["lenth"];
                close(&name, "PSE", l.pse, num(&w["pse"]), tol, 1.0);
                close(&name, "gl de Lenth", l.df, num(&w["df"]), tol, 1.0);
                close(
                    &name,
                    "ME",
                    l.margin_of_error,
                    num(&w["marginOfError"]),
                    tol,
                    1.0,
                );
                close(
                    &name,
                    "SME",
                    l.simultaneous_margin,
                    num(&w["simultaneousMargin"]),
                    tol,
                    1.0,
                );
            }
            (None, true) => {}
            other => panic!("{name}: Lenth inconsistente {:?}", other.0.is_some()),
        }
        match (&r.lack_of_fit, want["lackOfFit"].is_null()) {
            (Some(l), false) => {
                let w = &want["lackOfFit"];
                assert_eq!(
                    u64::from(l.df_pure_error),
                    w["dfPureError"].as_u64().expect("gl")
                );
                assert_eq!(
                    u64::from(l.df_lack_of_fit),
                    w["dfLackOfFit"].as_u64().expect("gl")
                );
                close(
                    &name,
                    "SQ erro puro",
                    l.ss_pure_error,
                    num(&w["ssPureError"]),
                    tol,
                    scale * scale,
                );
                if !w["f"].is_null() {
                    close(
                        &name,
                        "F da falta de ajuste",
                        val(l.f),
                        num(&w["f"]),
                        tol,
                        1.0,
                    );
                    close(
                        &name,
                        "p da falta de ajuste",
                        val(l.p_value),
                        num(&w["p"]),
                        tol,
                        1.0,
                    );
                }
            }
            (None, true) => {}
            other => panic!(
                "{name}: falta de ajuste inconsistente {:?}",
                other.0.is_some()
            ),
        }
        for (m, w) in r
            .main_effects
            .iter()
            .zip(want["mainEffects"].as_array().expect("principais"))
        {
            close(
                &name,
                "média nível baixo",
                val(m.low_mean),
                num(&w["low"]),
                tol,
                scale,
            );
            close(
                &name,
                "média nível alto",
                val(m.high_mean),
                num(&w["high"]),
                tol,
                scale,
            );
            match (m.center_mean, w["center"].is_null()) {
                (Some(c), false) => close(&name, "média central", c, num(&w["center"]), tol, scale),
                (None, true) => {}
                other => panic!("{name}: média central inconsistente {other:?}"),
            }
        }
        // Pareto: ordem decrescente e referência de acordo com os graus de liberdade.
        assert!(
            r.pareto.bars.windows(2).all(|w| w[0].value >= w[1].value),
            "{name}: Pareto ordenado"
        );
        if r.fit.df_residual > 0 {
            close(
                &name,
                "t crítico",
                r.pareto.reference.expect("t crítico"),
                num(&want["tCritical"]),
                tol,
                1.0,
            );
        } else {
            assert_eq!(r.fit.df_residual, 0);
            assert!(
                r.facts.iter().any(|f| f.key == "design.lenth_only"),
                "{name}: Lenth rotulado como único indicativo"
            );
            assert!(r.facts.iter().any(|f| f.key == "design.saturated"));
        }
        println!(
            "{name}: ok ({} termos, gl residual {})",
            r.effects.len(),
            r.fit.df_residual
        );
    }
}

#[test]
fn json_round_trip_of_specs_and_results_is_lossless() {
    let v = read(&root().join("two_level_design/designs.json"));
    let spec = spec_of(&v["cases"][3]);
    let design = generate(&spec).expect("planejamento");
    let json = serde_json::to_string(&design).expect("serializa");
    let back: desvtag_core::designs::spec::GeneratedDesign =
        serde_json::from_str(&json).expect("lê");
    assert_eq!(back, design);
}
