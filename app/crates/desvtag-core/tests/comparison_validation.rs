//! Validação de `one_way_comparison` (ANOVA de um fator, Tukey/Tukey–Kramer, letras, diagnósticos
//! e séries de gráfico): `validation/cases/one_way_comparison/`.
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::{Path, PathBuf};

use desvtag_core::comparisons::{OneWayRequest, OneWayResult, compare_one_way};
use desvtag_core::descriptive::Stat;
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use serde_json::Value;

fn cases_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases/one_way_comparison")
}

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

struct Case {
    name: String,
    request: OneWayRequest,
    expected: Value,
    empty_cells: usize,
}

fn load(dir: &Path) -> Case {
    let name = dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("?")
        .to_string();
    let read = |file: &str| -> Value {
        serde_json::from_str(&fs::read_to_string(dir.join(file)).expect(file)).expect("json")
    };
    let (config, expected) = (read("config.json"), read("expected.json"));
    let levels: Vec<String> = config["levels"]
        .as_array()
        .map(|l| {
            l.iter()
                .map(|v| v.as_str().unwrap_or_default().to_string())
                .collect()
        })
        .unwrap_or_default();
    let text = fs::read_to_string(dir.join("input.csv")).expect("input.csv");
    let mut empty_cells = 0;
    let observations = text
        .lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(i, line)| {
            let (level, response) = line.rsplit_once(',').expect("duas colunas");
            let response = response.trim();
            if response.is_empty() {
                empty_cells += 1;
            }
            Observation {
                id: id(&format!("o{}", i + 1)),
                unit_id: None,
                factors: vec![Some(FactorValue::Text(level.to_string()))],
                responses: vec![if response.is_empty() {
                    None
                } else {
                    Some(response.parse().expect("número"))
                }],
            }
        })
        .collect();
    let dataset = Dataset {
        factors: vec![Factor {
            id: id("treatment"),
            name: "treatment".into(),
            kind: FactorKind::Categorical,
            unit: None,
            levels,
        }],
        responses: vec![Response {
            id: id("y"),
            name: "y".into(),
            unit: None,
        }],
        observations,
    };
    Case {
        name,
        request: OneWayRequest {
            dataset,
            response_id: id("y"),
            factor_id: id("treatment"),
            alpha: config["alpha"].as_f64().expect("alpha"),
        },
        expected,
        empty_cells,
    }
}

fn num(v: &Value) -> f64 {
    v.as_f64()
        .unwrap_or_else(|| v.as_str().expect("texto").parse().expect("f64"))
}

fn value(stat: Stat) -> f64 {
    stat.value().expect("estatística definida")
}

fn lre(got: f64, want: f64) -> f64 {
    let err = ((got - want) / want).abs();
    if err <= 1e-15 {
        15.0
    } else {
        (-err.log10()).min(15.0)
    }
}

fn cases(filter: &str) -> Vec<Case> {
    let mut dirs: Vec<_> = fs::read_dir(cases_dir())
        .expect("casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| {
            p.join("expected.json").exists()
                && p.to_string_lossy().replace('\\', "/").contains(filter)
        })
        .collect();
    dirs.sort();
    dirs.iter().map(|d| load(d)).collect()
}

#[test]
fn nist_anova_against_exact_reference() {
    let all = cases("-nist-");
    assert!(
        all.len() >= 11,
        "esperava os 11 conjuntos NIST, achei {}",
        all.len()
    );
    for case in all {
        let result =
            compare_one_way(&case.request).unwrap_or_else(|e| panic!("{}: {e}", case.name));
        let exact = &case.expected["exactOnBinary64Inputs"];
        let measured = [
            (
                "ssBetween",
                lre(
                    value(result.anova.between.sum_squares),
                    num(&exact["ssBetween"]),
                ),
            ),
            (
                "ssWithin",
                lre(
                    value(result.anova.within.sum_squares),
                    num(&exact["ssWithin"]),
                ),
            ),
            ("f", lre(value(result.anova.f), num(&exact["f"]))),
            (
                "rSquared",
                lre(
                    value(result.effect_sizes.eta_squared),
                    num(&exact["rSquared"]),
                ),
            ),
            (
                "residualSd",
                lre(
                    value(result.anova.within.mean_square).sqrt(),
                    num(&exact["residualSd"]),
                ),
            ),
        ];
        println!(
            "{}: {}",
            case.name,
            measured
                .iter()
                .map(|(k, v)| format!("{k} {v:.1}"))
                .collect::<Vec<_>>()
                .join(" · ")
        );
        let min = &case.expected["tolerances"]["minLre"];
        for (key, got) in measured {
            let need = min[key]
                .as_f64()
                .unwrap_or_else(|| panic!("{}: falta a exigência de {key}", case.name));
            assert!(
                got >= need,
                "{}: {key} com {got:.1} dígitos corretos, exigido {need}",
                case.name
            );
        }
        assert_eq!(
            u64::from(result.anova.between.df),
            exact["dfBetween"].as_u64().expect("gl")
        );
        assert_eq!(
            u64::from(result.anova.within.df),
            exact["dfWithin"].as_u64().expect("gl")
        );
    }
}

fn close(case: &str, what: &str, got: f64, want: f64, tol: &Value, scale: f64) {
    let allowed = tol["relative"].as_f64().expect("rel") * want.abs()
        + tol["absoluteScale"].as_f64().expect("abs") * scale;
    assert!(
        (got - want).abs() <= allowed,
        "{case}: {what}: obtido {got:e}, esperado {want:e} (±{allowed:e})"
    );
}

fn check_applied(case: &Case, result: &OneWayResult) {
    let (name, want, tol) = (
        case.name.as_str(),
        &case.expected,
        &case.expected["tolerances"],
    );
    let means: Vec<f64> = want["means"]
        .as_array()
        .expect("médias")
        .iter()
        .map(num)
        .collect();
    let scale = means.iter().fold(1.0_f64, |a, b| a.max(b.abs()));
    assert_eq!(result.excluded.len(), case.empty_cells, "{name}: excluídas");
    assert_eq!(result.groups.len(), means.len(), "{name}: grupos");
    for (i, g) in result.groups.iter().enumerate() {
        assert_eq!(
            g.label,
            want["levels"][i].as_str().expect("nível"),
            "{name}: ordem dos grupos"
        );
        assert_eq!(
            u64::from(g.n),
            want["sizes"][i].as_u64().expect("n"),
            "{name}: n"
        );
        close(name, "média", value(g.mean), means[i], tol, scale);
        match (g.sd, &want["sds"][i]) {
            (Stat::Defined { value }, v) if !v.is_null() => {
                close(name, "dp", value, num(v), tol, scale)
            }
            (Stat::Undefined { .. }, v) if v.is_null() => {}
            other => panic!("{name}: dp inconsistente {other:?}"),
        }
        close(
            name,
            "IC inf",
            value(g.ci_lower),
            num(&want["ciPooled"][i][0]),
            tol,
            scale,
        );
        close(
            name,
            "IC sup",
            value(g.ci_upper),
            num(&want["ciPooled"][i][1]),
            tol,
            scale,
        );
        let b = g.boxplot.as_ref().expect("boxplot");
        let wb = &want["boxplots"][i];
        for (what, got, key) in [
            ("mín", b.min, "min"),
            ("q1", b.q1, "q1"),
            ("mediana", b.median, "median"),
            ("q3", b.q3, "q3"),
            ("máx", b.max, "max"),
            ("bigode inf", b.whisker_low, "whiskerLow"),
            ("bigode sup", b.whisker_high, "whiskerHigh"),
        ] {
            close(name, what, got, num(&wb[key]), tol, scale);
        }
        let mut out: Vec<f64> = b.outliers.iter().map(|o| o.value).collect();
        out.sort_by(f64::total_cmp);
        let want_out: Vec<f64> = wb["outliers"]
            .as_array()
            .expect("lista")
            .iter()
            .map(num)
            .collect();
        assert_eq!(out, want_out, "{name}: pontos distantes");
    }
    let a = &want["anova"];
    close(
        name,
        "SQ entre",
        value(result.anova.between.sum_squares),
        num(&a["ssBetween"]),
        tol,
        num(&a["ssTotal"]),
    );
    close(
        name,
        "SQ dentro",
        value(result.anova.within.sum_squares),
        num(&a["ssWithin"]),
        tol,
        num(&a["ssTotal"]),
    );
    close(name, "F", value(result.anova.f), num(&a["f"]), tol, 1.0);
    close(
        name,
        "p",
        value(result.anova.p_value),
        num(&a["p"]),
        tol,
        1.0,
    );
    let e = &want["effect"];
    close(
        name,
        "η²",
        value(result.effect_sizes.eta_squared),
        num(&e["etaSquared"]),
        tol,
        1.0,
    );
    close(
        name,
        "ω²",
        value(result.effect_sizes.omega_squared),
        num(&e["omegaSquared"]),
        tol,
        1.0,
    );
    close(
        name,
        "CV",
        value(result.effect_sizes.cv_percent),
        num(&e["cvPercent"]),
        tol,
        1.0,
    );

    let bf = &result.diagnostics.brown_forsythe;
    close(
        name,
        "BF F",
        value(bf.f),
        num(&want["brownForsythe"]["f"]),
        tol,
        1.0,
    );
    close(
        name,
        "BF p",
        value(bf.p_value),
        num(&want["brownForsythe"]["p"]),
        tol,
        1.0,
    );

    let std: Vec<Option<f64>> = result
        .diagnostics
        .residuals
        .iter()
        .map(|r| r.standardized.value())
        .collect();
    let want_std = want["standardizedResiduals"].as_array().expect("resíduos");
    assert_eq!(std.len(), want_std.len(), "{name}: resíduos");
    for (got, w) in std.iter().zip(want_std) {
        match (got, w.is_null()) {
            (Some(g), false) => close(name, "resíduo padronizado", *g, num(w), tol, 1.0),
            (None, true) => {}
            other => panic!("{name}: resíduo padronizado inconsistente {other:?}"),
        }
    }
    let want_qq = want["qq"].as_array().expect("qq");
    assert_eq!(result.diagnostics.qq.len(), want_qq.len(), "{name}: qq");
    for (got, w) in result.diagnostics.qq.iter().zip(want_qq) {
        close(
            name,
            "qq teórico",
            got.theoretical,
            num(&w["theoretical"]),
            tol,
            1.0,
        );
        close(name, "qq amostral", got.sample, num(&w["sample"]), tol, 1.0);
    }

    let tukey = result.tukey.as_ref().expect("Tukey");
    let wt = &want["tukey"];
    assert_eq!(
        format!("{:?}", tukey.variant).to_lowercase(),
        wt["variant"].as_str().expect("variante").to_lowercase(),
        "{name}: variante"
    );
    close(
        name,
        "q crítico",
        value(tukey.critical_value),
        num(&wt["criticalValue"]),
        tol,
        1.0,
    );
    let p_abs = tol["pAbsolute"].as_f64().expect("p abs");
    for (c, w) in tukey
        .comparisons
        .iter()
        .zip(wt["pairs"].as_array().expect("pares"))
    {
        assert_eq!(
            (u64::from(c.group_a), u64::from(c.group_b)),
            (w["a"].as_u64().expect("a"), w["b"].as_u64().expect("b"))
        );
        close(
            name,
            "diferença",
            value(c.difference),
            num(&w["difference"]),
            tol,
            scale,
        );
        close(
            name,
            "EP",
            value(c.std_error),
            num(&w["stdError"]),
            tol,
            scale,
        );
        close(name, "q", value(c.q_statistic), num(&w["q"]), tol, 1.0);
        let dp = (value(c.p_adjusted) - num(&w["pAdjusted"])).abs();
        assert!(
            dp <= p_abs,
            "{name}: p ajustado ({},{}) difere em {dp:e}",
            c.group_a,
            c.group_b
        );
        close(
            name,
            "IC simultâneo inf",
            value(c.ci_lower),
            num(&w["ciLower"]),
            tol,
            scale,
        );
        close(
            name,
            "IC simultâneo sup",
            value(c.ci_upper),
            num(&w["ciUpper"]),
            tol,
            scale,
        );
        assert_eq!(
            c.significant,
            Some(w["significant"].as_bool().expect("bool")),
            "{name}: significância"
        );
    }
    let letters = result.letters.as_ref().expect("letras");
    let want_letters: Vec<&str> = want["letters"]
        .as_array()
        .expect("letras")
        .iter()
        .map(|v| v.as_str().unwrap_or_default())
        .collect();
    assert_eq!(letters.letters, want_letters, "{name}: letras");
}

#[test]
fn applied_cases_match_scipy_numpy_and_cliques() {
    let all = cases("one_way_comparison/1");
    assert!(
        all.len() >= 4,
        "esperava os 4 casos aplicados, achei {}",
        all.len()
    );
    for case in all {
        let result =
            compare_one_way(&case.request).unwrap_or_else(|e| panic!("{}: {e}", case.name));
        check_applied(&case, &result);
        println!(
            "{}: ok, letras {:?}",
            case.name,
            result.letters.as_ref().map(|l| l.letters.clone())
        );
    }
}
