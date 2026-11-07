//! ANOVA multifatorial com blocos, médias marginais e contrastes contra o statsmodels e o SciPy
//! (`validation/cases/factorial_anova/factorial.json`, gerado por `make_factorial_cases.py`):
//! somas de quadrados dos tipos I, II e III (com delineamento desbalanceado), médias marginais,
//! comparações (Tukey–Kramer, Holm, Bonferroni, nenhum) e contrastes.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::descriptive::Stat;
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use desvtag_core::models::factorial_anova::{
    ContrastRequest, FactorialRequest, MarginalRequest, PairwiseAdjustment, SumOfSquaresType,
    analyze,
};
use serde_json::Value;

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn load() -> Vec<Value> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/factorial_anova/factorial.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    v["cases"].as_array().expect("casos").clone()
}

fn dataset(case: &Value) -> Dataset {
    let names = ["A", "B", "Bloco"];
    let factors = names
        .iter()
        .map(|n| Factor {
            id: id(n),
            name: (*n).into(),
            kind: FactorKind::Categorical,
            unit: None,
            levels: case["levels"][n]
                .as_array()
                .expect("níveis")
                .iter()
                .map(|l| l.as_str().expect("texto").to_string())
                .collect(),
        })
        .collect();
    let observations = case["rows"]
        .as_array()
        .expect("linhas")
        .iter()
        .enumerate()
        .map(|(i, r)| Observation {
            id: id(&format!("o{}", i + 1)),
            unit_id: None,
            factors: names
                .iter()
                .map(|n| Some(FactorValue::Text(r[n].as_str().expect("texto").to_string())))
                .collect(),
            responses: vec![Some(r["y"].as_f64().expect("y"))],
        })
        .collect();
    Dataset {
        factors,
        responses: vec![Response {
            id: id("y"),
            name: "y".into(),
            unit: None,
        }],
        observations,
    }
}

fn val(s: &Stat) -> f64 {
    s.value().expect("definida")
}

fn near(got: f64, want: f64, rel: f64, abs: f64, what: &str) {
    assert!(
        (got - want).abs() <= abs + rel * want.abs(),
        "{what}: obtido {got:e}, esperado {want:e}"
    );
}

fn ids(v: &Value) -> Vec<StableId> {
    v.as_array()
        .expect("lista")
        .iter()
        .map(|x| id(x.as_str().expect("texto")))
        .collect()
}

#[test]
fn anova_marginal_means_and_contrasts_match_statsmodels() {
    let cases = load();
    assert!(cases.len() >= 6);
    for case in cases {
        let name = case["id"].as_str().expect("id").to_string();
        let ss_type = match case["ss_type"].as_str().expect("tipo") {
            "typeI" => SumOfSquaresType::TypeI,
            "typeII" => SumOfSquaresType::TypeII,
            _ => SumOfSquaresType::TypeIII,
        };
        let marginals = case["marginals"]
            .as_array()
            .expect("marginais")
            .iter()
            .map(|m| MarginalRequest {
                factors: ids(&m["factors"]),
                adjustment: match m["adjustment"].as_str().expect("ajuste") {
                    "tukey" => PairwiseAdjustment::Tukey,
                    "none" => PairwiseAdjustment::None,
                    "bonferroni" => PairwiseAdjustment::Bonferroni,
                    _ => PairwiseAdjustment::Holm,
                },
            })
            .collect();
        let contrasts = case["contrasts"]
            .as_array()
            .expect("contrastes")
            .iter()
            .map(|c| ContrastRequest {
                name: c["name"].as_str().expect("nome").into(),
                factors: ids(&c["factors"]),
                coefficients: c["coefficients"]
                    .as_array()
                    .expect("coeficientes")
                    .iter()
                    .map(|x| x.as_f64().expect("número"))
                    .collect(),
            })
            .collect();
        let result = analyze(&FactorialRequest {
            dataset: dataset(&case),
            response_id: id("y"),
            factor_ids: vec![id("A"), id("B")],
            block_id: case["with_block"]
                .as_bool()
                .expect("bloco")
                .then(|| id("Bloco")),
            interaction_order: 2,
            ss_type,
            alpha: case["alpha"].as_f64().expect("alpha"),
            marginals,
            contrasts,
        })
        .unwrap_or_else(|e| panic!("{name}: {e:?}"));
        let want = &case["expected"];
        let terms = want["terms"].as_array().expect("termos");
        assert_eq!(result.terms.len(), terms.len(), "{name}: termos");
        for (got, w) in result.terms.iter().zip(terms) {
            let t = w["term"].as_str().expect("termo");
            assert_eq!(got.term, t, "{name}: nome do termo");
            assert_eq!(
                u64::from(got.df),
                w["df"].as_u64().expect("df"),
                "{name} {t}: gl"
            );
            near(
                val(&got.sum_squares),
                w["ss"].as_f64().expect("ss"),
                1e-9,
                1e-10,
                &format!("{name} {t} SQ"),
            );
            near(
                val(&got.f_value),
                w["f"].as_f64().expect("f"),
                1e-8,
                1e-10,
                &format!("{name} {t} F"),
            );
            near(
                val(&got.p_value),
                w["p"].as_f64().expect("p"),
                1e-6,
                1e-12,
                &format!("{name} {t} p"),
            );
        }
        let r = &want["residual"];
        assert_eq!(
            u64::from(result.residual.df),
            r["df"].as_u64().expect("df"),
            "{name}: gl do resíduo"
        );
        near(
            val(&result.residual.sum_squares),
            r["ss"].as_f64().expect("ss"),
            1e-9,
            1e-10,
            &format!("{name} SQR"),
        );
        near(
            val(&result.residual.mean_square),
            r["ms"].as_f64().expect("ms"),
            1e-9,
            1e-10,
            &format!("{name} QMR"),
        );
        near(
            val(&result.r_squared),
            want["r2"].as_f64().expect("r2"),
            1e-9,
            1e-10,
            &format!("{name} R²"),
        );
        near(
            val(&result.adjusted_r_squared),
            want["adj_r2"].as_f64().expect("adj"),
            1e-9,
            1e-10,
            &format!("{name} R² aj."),
        );
        assert_eq!(u64::from(result.n), want["n"].as_u64().expect("n"));

        for (got, w) in result
            .marginals
            .iter()
            .zip(case["marginals"].as_array().expect("marginais"))
        {
            for (c, wc) in got
                .cells
                .iter()
                .zip(w["cells"].as_array().expect("células"))
            {
                near(
                    val(&c.estimate),
                    wc["estimate"].as_f64().expect("est"),
                    1e-9,
                    1e-10,
                    &format!("{name} média marginal"),
                );
                near(
                    val(&c.std_error),
                    wc["std_error"].as_f64().expect("se"),
                    1e-9,
                    1e-10,
                    &format!("{name} EP marginal"),
                );
            }
            let pairs = w["pairs"].as_array().expect("pares");
            assert_eq!(got.pairs.len(), pairs.len(), "{name}: pares marginais");
            for (p, wp) in got.pairs.iter().zip(pairs) {
                near(
                    val(&p.difference),
                    wp["difference"].as_f64().expect("dif"),
                    1e-9,
                    1e-10,
                    &format!("{name} diferença marginal"),
                );
                near(
                    val(&p.std_error),
                    wp["std_error"].as_f64().expect("se"),
                    1e-9,
                    1e-10,
                    &format!("{name} EP da diferença"),
                );
                near(
                    val(&p.t_value),
                    wp["t"].as_f64().expect("t"),
                    1e-8,
                    1e-10,
                    &format!("{name} t marginal"),
                );
                near(
                    val(&p.p_value),
                    wp["p_raw"].as_f64().expect("p"),
                    1e-6,
                    1e-12,
                    &format!("{name} p marginal"),
                );
                near(
                    val(&p.p_adjusted),
                    wp["p_adjusted"].as_f64().expect("pa"),
                    1e-6,
                    1e-8,
                    &format!("{name} p ajustado marginal"),
                );
            }
        }
        for (got, w) in result
            .contrasts
            .iter()
            .zip(case["contrasts"].as_array().expect("contrastes"))
        {
            near(
                val(&got.estimate),
                w["estimate"].as_f64().expect("est"),
                1e-9,
                1e-10,
                &format!("{name} contraste"),
            );
            near(
                val(&got.std_error),
                w["std_error"].as_f64().expect("se"),
                1e-9,
                1e-10,
                &format!("{name} EP do contraste"),
            );
            near(
                val(&got.t_value),
                w["t"].as_f64().expect("t"),
                1e-8,
                1e-10,
                &format!("{name} t do contraste"),
            );
            near(
                val(&got.p_value),
                w["p_raw"].as_f64().expect("p"),
                1e-6,
                1e-12,
                &format!("{name} p do contraste"),
            );
            near(
                val(&got.p_adjusted),
                w["p_adjusted"].as_f64().expect("pa"),
                1e-6,
                1e-12,
                &format!("{name} p ajustado do contraste"),
            );
            let ci = w["ci"].as_array().expect("ic");
            near(
                val(&got.ci_lower),
                ci[0].as_f64().expect("lo"),
                1e-8,
                1e-10,
                &format!("{name} IC inferior"),
            );
            near(
                val(&got.ci_upper),
                ci[1].as_f64().expect("hi"),
                1e-8,
                1e-10,
                &format!("{name} IC superior"),
            );
        }
    }
}
