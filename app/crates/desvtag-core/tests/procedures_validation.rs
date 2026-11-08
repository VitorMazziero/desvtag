//! Procedimentos de comparação múltipla contra referências independentes
//! (`validation/cases/multiple_comparison_procedures/`, gerados por `make_procedure_cases.py` com
//! SciPy, statsmodels e scikit-posthocs): Welch/Games–Howell, Bonferroni, Holm, Dunnett e
//! Kruskal–Wallis/Dunn.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::comparisons::procedures::{Adjustment, Procedure, ProcedureRequest, compare};
use desvtag_core::descriptive::Stat;
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use serde_json::Value;

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn cases() -> Vec<Value> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/multiple_comparison_procedures/procedures.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    v["cases"].as_array().expect("casos").clone()
}

fn dataset(case: &Value) -> Dataset {
    let levels: Vec<String> = case["levels"]
        .as_array()
        .expect("níveis")
        .iter()
        .map(|l| l.as_str().expect("texto").to_string())
        .collect();
    let mut observations = Vec::new();
    for level in &levels {
        for v in case["groups"][level].as_array().expect("grupo") {
            observations.push(Observation {
                id: id(&format!("o{}", observations.len() + 1)),
                unit_id: None,
                factors: vec![Some(FactorValue::Text(level.clone()))],
                responses: vec![Some(v.as_f64().expect("número"))],
            });
        }
    }
    Dataset {
        factors: vec![Factor {
            id: id("g"),
            name: "g".into(),
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
    }
}

fn procedure(case: &Value) -> Procedure {
    let p = &case["procedure"];
    match p["type"].as_str().expect("tipo") {
        "gamesHowell" => Procedure::GamesHowell,
        "bonferroni" => Procedure::Bonferroni,
        "holm" => Procedure::Holm,
        "dunnett" => Procedure::Dunnett {
            control: p["control"].as_str().expect("controle").to_string(),
        },
        _ => Procedure::KruskalDunn {
            adjustment: if p["adjustment"] == "holm" {
                Adjustment::Holm
            } else {
                Adjustment::Bonferroni
            },
        },
    }
}

fn val(s: &Stat) -> f64 {
    s.value().expect("estatística definida")
}

fn near(got: f64, want: f64, rel: f64, abs: f64, what: &str) {
    assert!(
        (got - want).abs() <= abs + rel * want.abs(),
        "{what}: obtido {got:e}, esperado {want:e}"
    );
}

#[test]
fn every_procedure_matches_its_independent_reference() {
    let all = cases();
    assert!(all.len() >= 6);
    for case in all {
        let name = case["id"].as_str().expect("id").to_string();
        let result = compare(&ProcedureRequest {
            dataset: dataset(&case),
            response_id: id("y"),
            factor_id: id("g"),
            alpha: case["alpha"].as_f64().expect("alpha"),
            procedure: procedure(&case),
        })
        .unwrap_or_else(|e| panic!("{name}: {e:?}"));
        let want = &case["expected"];
        let (gt, wg) = (&result.global_test, &want["global"]);
        near(
            val(&gt.statistic),
            wg["statistic"].as_f64().expect("estatística"),
            1e-9,
            0.0,
            &format!("{name} estatística global"),
        );
        near(
            val(&gt.p_value),
            wg["p"].as_f64().expect("p"),
            1e-7,
            1e-12,
            &format!("{name} p global"),
        );
        near(
            val(&gt.df1),
            wg["df1"].as_f64().expect("df1"),
            1e-12,
            0.0,
            &format!("{name} gl1"),
        );
        let pairs = want["pairs"].as_array().expect("pares");
        assert_eq!(result.pairs.len(), pairs.len(), "{name}: número de pares");
        let exact_dunnett = name.starts_with("dunnett");
        for (got, w) in result.pairs.iter().zip(pairs) {
            assert_eq!(
                [got.group_a as u64, got.group_b as u64],
                [w["a"].as_u64().expect("a"), w["b"].as_u64().expect("b")],
                "{name}: índices"
            );
            near(
                val(&got.difference),
                w["difference"].as_f64().expect("dif"),
                1e-10,
                1e-12,
                &format!("{name} diferença"),
            );
            near(
                val(&got.std_error),
                w["std_error"].as_f64().expect("se"),
                1e-10,
                1e-12,
                &format!("{name} erro-padrão"),
            );
            near(
                val(&got.statistic),
                w["statistic"].as_f64().expect("estatística"),
                1e-10,
                1e-12,
                &format!("{name} estatística do par"),
            );
            let p_ref = if w.get("p_adjusted").is_some() {
                w["p_adjusted"].as_f64()
            } else {
                w["p"].as_f64()
            }
            .expect("p");
            // Dunnett: referência exata por integração dupla (dblquad, ~1e-9); demais: SciPy/statsmodels.
            let tolerance = if exact_dunnett { 2e-7 } else { 1e-8 };
            near(
                val(&got.p_adjusted),
                p_ref,
                1e-6,
                tolerance,
                &format!("{name} p ajustado"),
            );
            if let Some(ci) = w.get("ci") {
                let ci = ci.as_array().expect("ic");
                let t = if exact_dunnett { 2e-6 } else { 1e-8 };
                near(
                    val(&got.ci_lower),
                    ci[0].as_f64().expect("lo"),
                    1e-7,
                    t,
                    &format!("{name} limite inferior"),
                );
                near(
                    val(&got.ci_upper),
                    ci[1].as_f64().expect("hi"),
                    1e-7,
                    t,
                    &format!("{name} limite superior"),
                );
            }
        }
        if let Some(cv) = want.get("mean_ranks") {
            for (g, w) in result.groups.iter().zip(cv.as_array().expect("postos")) {
                near(
                    val(&g.mean_rank),
                    w.as_f64().expect("posto"),
                    1e-12,
                    1e-12,
                    &format!("{name} posto médio"),
                );
            }
        }
        assert_eq!(result.letters.is_some(), !exact_dunnett, "{name}: letras");
    }
}

#[test]
fn games_howell_refuses_groups_without_variance() {
    let case = &cases()[0];
    let mut ds = dataset(case);
    // Um grupo de tamanho 1 não tem variância.
    ds.observations
        .retain(|o| !matches!(&o.factors[0], Some(FactorValue::Text(t)) if t == "A"));
    ds.observations.push(Observation {
        id: id("solo"),
        unit_id: None,
        factors: vec![Some(FactorValue::Text("A".into()))],
        responses: vec![Some(1.0)],
    });
    let err = compare(&ProcedureRequest {
        dataset: ds,
        response_id: id("y"),
        factor_id: id("g"),
        alpha: 0.05,
        procedure: Procedure::GamesHowell,
    })
    .err();
    assert!(err.is_some());
}
