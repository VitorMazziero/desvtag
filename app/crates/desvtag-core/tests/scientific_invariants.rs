//! Invariantes científicos transversais (ET28 T06, AU-Q03), exercidos pela API pública a partir das
//! requisições das referências já validadas: permutação das linhas, mudança afim das unidades da
//! resposta, reescala das unidades dos fatores, ajuste exato, quase singularidade e serialização
//! sem valores não finitos. Complementam as comparações com referências externas: aqui a verdade
//! é uma propriedade matemática, não um número de outro programa.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::designs::spec::DesignFactor;
use desvtag_core::domain::{FactorValue, StableId};
use desvtag_core::models::factorial_anova::{FactorialRequest, FactorialResult, analyze};
use desvtag_core::surface::model::{SurfaceRequest, analyze as surface_analyze};
use serde_json::Value;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../validation/cases")
}

fn estimability_requests() -> Vec<(String, FactorialRequest)> {
    let text =
        fs::read_to_string(root().join("factorial_anova/estimability.json")).expect("arquivo");
    let value: Value = serde_json::from_str(&text).expect("json");
    value["cases"]
        .as_array()
        .expect("casos")
        .iter()
        .map(|case| {
            (
                case["name"].as_str().expect("nome").to_string(),
                serde_json::from_value(case["request"].clone()).expect("requisição"),
            )
        })
        .collect()
}

/// Casos de posto completo com graus de liberdade residuais: as estatísticas dependem só dos dados.
fn identified(
    requests: Vec<(String, FactorialRequest)>,
) -> Vec<(String, FactorialRequest, FactorialResult)> {
    requests
        .into_iter()
        .filter_map(|(name, request)| {
            let result = analyze(&request).ok()?;
            let geometry = result.estimability.as_ref()?;
            (geometry.rank == geometry.parameters && result.residual.df > 0)
                .then_some((name, request, result))
        })
        .collect()
}

fn close(a: f64, b: f64, rel: f64, what: &str) {
    assert!(
        (a - b).abs() <= rel * (1.0 + a.abs().max(b.abs())),
        "{what}: {a} vs {b}"
    );
}

fn value(stat: &desvtag_core::descriptive::Stat) -> Option<f64> {
    stat.value()
}

fn compare_tables(a: &FactorialResult, b: &FactorialResult, scale_ss: f64, label: &str) {
    assert_eq!(a.terms.len(), b.terms.len(), "{label}");
    for (x, y) in a
        .terms
        .iter()
        .zip(&b.terms)
        .chain([(&a.residual, &b.residual)])
    {
        assert_eq!(x.df, y.df, "{label}: gl de {}", x.term);
        match (value(&x.sum_squares), value(&y.sum_squares)) {
            (Some(p), Some(q)) => {
                close(p * scale_ss, q, 1e-8, &format!("{label}: SQ de {}", x.term))
            }
            (None, None) => {}
            other => panic!(
                "{label}: SQ de {} definida só de um lado: {other:?}",
                x.term
            ),
        }
        // F e p são invariantes às unidades da resposta.
        for (p, q, what) in [(&x.f_value, &y.f_value, "F"), (&x.p_value, &y.p_value, "p")] {
            match (value(p), value(q)) {
                (Some(p), Some(q)) => close(p, q, 1e-7, &format!("{label}: {what} de {}", x.term)),
                (None, None) => {}
                other => panic!(
                    "{label}: {what} de {} definido só de um lado: {other:?}",
                    x.term
                ),
            }
        }
    }
    match (value(&a.r_squared), value(&b.r_squared)) {
        (Some(p), Some(q)) => close(p, q, 1e-9, &format!("{label}: R²")),
        other => panic!("{label}: R² {other:?}"),
    }
}

#[test]
fn row_order_does_not_change_the_anova_or_the_marginal_means() {
    let cases = identified(estimability_requests());
    assert!(cases.len() >= 3, "casos identificados para o invariante");
    for (name, request, base) in cases {
        let mut shuffled = request.clone();
        shuffled.dataset.observations.reverse();
        // Troca determinística adicional (pares), para não depender só da inversão.
        let n = shuffled.dataset.observations.len();
        for i in (0..n.saturating_sub(1)).step_by(2) {
            shuffled.dataset.observations.swap(i, i + 1);
        }
        let other = analyze(&shuffled).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        compare_tables(&base, &other, 1.0, &name);
        assert_eq!(base.marginals.len(), other.marginals.len(), "{name}");
        for (m, o) in base.marginals.iter().zip(&other.marginals) {
            assert_eq!(m.cells.len(), o.cells.len(), "{name}");
            for (c, d) in m.cells.iter().zip(&o.cells) {
                match (value(&c.estimate), value(&d.estimate)) {
                    (Some(p), Some(q)) => close(p, q, 1e-9, &format!("{name}: média marginal")),
                    (None, None) => {}
                    other => panic!("{name}: média marginal {other:?}"),
                }
            }
        }
    }
}

#[test]
fn an_affine_change_of_the_response_units_scales_estimates_and_keeps_f_p_and_r2() {
    for (name, request, base) in identified(estimability_requests()) {
        let (a, b) = (1000.0, 37.5);
        let mut scaled = request.clone();
        for observation in &mut scaled.dataset.observations {
            for y in observation.responses.iter_mut().flatten() {
                *y = a * *y + b;
            }
        }
        let other = analyze(&scaled).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        compare_tables(&base, &other, a * a, &name);
        for (m, o) in base.marginals.iter().zip(&other.marginals) {
            for (c, d) in m.cells.iter().zip(&o.cells) {
                if let (Some(p), Some(q)) = (value(&c.estimate), value(&d.estimate)) {
                    close(
                        a * p + b,
                        q,
                        1e-9,
                        &format!("{name}: média marginal na nova unidade"),
                    );
                }
            }
        }
        for (c, d) in base.contrasts.iter().zip(&other.contrasts) {
            if let (Some(p), Some(q)) = (value(&c.estimate), value(&d.estimate)) {
                // Contrastes somam zero: o deslocamento b se cancela, a escala não.
                close(a * p, q, 1e-9, &format!("{name}: contraste {}", c.name));
            }
            if let (Some(p), Some(q)) = (value(&c.p_value), value(&d.p_value)) {
                close(p, q, 1e-7, &format!("{name}: p do contraste {}", c.name));
            }
        }
    }
}

#[test]
fn an_exact_fit_is_explicit_and_every_result_serializes_without_non_finite_numbers() {
    for (name, request, _) in identified(estimability_requests()) {
        // Resposta exatamente igual à média da célula de cada observação: resíduo nulo.
        let mut exact = request.clone();
        let mut sums: std::collections::BTreeMap<String, (f64, f64)> =
            std::collections::BTreeMap::new();
        let key = |o: &desvtag_core::domain::Observation| format!("{:?}", o.factors);
        for o in &exact.dataset.observations {
            if let Some(Some(y)) = o.responses.first() {
                let e = sums.entry(key(o)).or_default();
                e.0 += y;
                e.1 += 1.0;
            }
        }
        for o in &mut exact.dataset.observations {
            let k = key(o);
            if let Some(entry) = sums.get(&k)
                && let Some(Some(y)) = o.responses.first_mut()
            {
                *y = entry.0 / entry.1;
            }
        }
        if let Ok(result) = analyze(&exact) {
            let json = serde_json::to_string(&result).expect("serialização");
            for bad in ["NaN", "Infinity", "inf"] {
                assert!(!json.contains(bad), "{name}: «{bad}» na serialização");
            }
            // Com resíduo nulo, F e p não podem ser números inventados: ou definidos ou indefinidos.
            let back: FactorialResult = serde_json::from_str(&json).expect("releitura");
            assert_eq!(back.terms.len(), result.terms.len(), "{name}");
            for term in &back.terms {
                if let Some(p) = value(&term.p_value) {
                    assert!((0.0..=1.0).contains(&p), "{name}: p fora de [0,1]");
                }
            }
        }
    }
}

#[test]
fn rescaling_the_factor_units_keeps_the_coded_surface_fit() {
    let dir = root().join("response_surface/001-ccd-rotacional-2-fatores");
    let config: Value =
        serde_json::from_str(&fs::read_to_string(dir.join("config.json")).expect("config"))
            .expect("json");
    let request = surface_request(&dir, &config, 1.0, 0.0);
    let base = surface_analyze(&request).expect("ajuste");
    // Mesmos pontos em outra unidade (x' = 25·x + 300): modelo codificado idêntico.
    let moved = surface_request(&dir, &config, 25.0, 300.0);
    let other = surface_analyze(&moved).expect("ajuste na outra unidade");
    close_stat(&base.anova.r_squared, &other.anova.r_squared, 1e-9, "R²");
    close_stat(
        &base.anova.p_value,
        &other.anova.p_value,
        1e-8,
        "p do modelo",
    );
    close_stat(
        &base.anova.residual.sum_squares,
        &other.anova.residual.sum_squares,
        1e-9,
        "SQ residual",
    );
    assert_eq!(base.terms.len(), other.terms.len());
    for (a, b) in base.terms.iter().zip(&other.terms) {
        // Coeficientes na escala codificada não dependem da unidade do fator.
        close_stat(
            &a.estimate,
            &b.estimate,
            1e-8,
            &format!("coeficiente {}", a.label),
        );
    }
}

fn close_stat(
    a: &desvtag_core::descriptive::Stat,
    b: &desvtag_core::descriptive::Stat,
    rel: f64,
    what: &str,
) {
    match (a.value(), b.value()) {
        (Some(p), Some(q)) => close(p, q, rel, what),
        (None, None) => {}
        other => panic!("{what}: definida só de um lado {other:?}"),
    }
}

/// Reconstrói a requisição de superfície da referência, com os fatores em outra unidade.
fn surface_request(
    dir: &std::path::Path,
    config: &Value,
    scale: f64,
    shift: f64,
) -> SurfaceRequest {
    let factors: Vec<DesignFactor> = config["factors"]
        .as_array()
        .expect("fatores")
        .iter()
        .map(|f| DesignFactor {
            id: StableId::new(f["id"].as_str().expect("id").to_string()).expect("id"),
            name: f["name"].as_str().expect("nome").to_string(),
            low: f["low"].as_f64().expect("baixo") * scale + shift,
            high: f["high"].as_f64().expect("alto") * scale + shift,
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
            desvtag_core::domain::Observation {
                id: StableId::new(format!("o{}", r + 1)).expect("id"),
                unit_id: None,
                factors: cells[..k]
                    .iter()
                    .map(|v| Some(FactorValue::Number(*v * scale + shift)))
                    .collect(),
                responses: vec![Some(cells[k])],
            }
        })
        .collect();
    let dataset = desvtag_core::domain::Dataset {
        factors: factors
            .iter()
            .map(|f| desvtag_core::domain::Factor {
                id: f.id.clone(),
                name: f.name.clone(),
                kind: desvtag_core::domain::FactorKind::Numeric,
                unit: None,
                levels: Vec::new(),
            })
            .collect(),
        responses: vec![desvtag_core::domain::Response {
            id: StableId::new("y".to_string()).expect("id"),
            name: "y".into(),
            unit: None,
        }],
        observations,
    };
    let reference: SurfaceRequest = {
        // Termos e α idênticos aos do teste de referência (não dependem da unidade dos fatores).
        let terms = config["terms"]
            .as_array()
            .expect("termos")
            .iter()
            .map(|t| term_of(t.as_str().expect("texto")))
            .collect();
        SurfaceRequest {
            block: None,
            dataset,
            response_id: StableId::new("y".to_string()).expect("id"),
            factors,
            terms,
            alpha: config["alpha"].as_f64().expect("alpha"),
        }
    };
    reference
}

fn term_of(code: &str) -> desvtag_core::models::TermSpec {
    use desvtag_core::models::TermSpec;
    let idx: Vec<StableId> = code
        .chars()
        .map(|c| StableId::new(format!("f{}", c as usize - 'A' as usize + 1)).expect("id"))
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
