//! Otimização por desejabilidade contra referências independentes
//! (`validation/cases/desirability_optimization/`): busca exaustiva em malha densa, previsões e
//! intervalos do NumPy/SciPy e desejabilidades de Derringer e Suich.
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    clippy::print_stdout
)]

use std::fs;
use std::path::{Path, PathBuf};

use optima_core::designs::spec::DesignFactor;
use optima_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use optima_core::models::TermSpec;
use optima_core::optimization::optimize::OptimizationStatus;
use optima_core::optimization::{
    DomainSpec, EvaluateRequest, FactorBounds, Goal, OptimizationGridRequest, OptimizationRequest,
    OptimizationSetup, ResponseGoal, ResponseLimit, SearchOptions, desirability_grid,
    evaluate_points, optimize,
};
use serde_json::Value;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/desirability_optimization")
}

fn read(path: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
}

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn term_of(code: &str) -> TermSpec {
    let ids: Vec<StableId> = code
        .chars()
        .map(|c| id(&format!("f{}", c as usize - 'A' as usize + 1)))
        .collect();
    match ids.len() {
        1 => TermSpec::Main {
            factor_id: ids[0].clone(),
        },
        _ if ids[0] == ids[1] => TermSpec::Power {
            factor_id: ids[0].clone(),
            degree: 2,
        },
        _ => TermSpec::Interaction { factor_ids: ids },
    }
}

fn request_of(dir: &Path) -> (OptimizationRequest, Value, Value) {
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
    let responses_json = config["responses"].as_array().expect("respostas");
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
                responses: cells[k..].iter().map(|v| Some(*v)).collect(),
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
        responses: (0..responses_json.len())
            .map(|i| Response {
                id: id(&format!("r{}", i + 1)),
                name: format!("R{}", i + 1),
                unit: None,
            })
            .collect(),
        observations,
    };
    let setup = OptimizationSetup {
        responses: responses_json
            .iter()
            .map(|r| ResponseGoal {
                response_id: id(r["id"].as_str().expect("id")),
                terms: r["terms"]
                    .as_array()
                    .expect("termos")
                    .iter()
                    .map(|t| term_of(t.as_str().expect("t")))
                    .collect(),
                goal: serde_json::from_value::<Goal>(r["goal"].clone()).expect("objetivo"),
                importance: r["importance"].as_f64().expect("importância"),
            })
            .collect(),
        limits: responses_json
            .iter()
            .filter(|r| !r["limit"]["min"].is_null() || !r["limit"]["max"].is_null())
            .map(|r| ResponseLimit {
                response_id: id(r["id"].as_str().expect("id")),
                min: r["limit"]["min"].as_f64(),
                max: r["limit"]["max"].as_f64(),
            })
            .collect(),
        domain: DomainSpec::Region,
        search: SearchOptions {
            starts: u32::try_from(config["starts"].as_u64().expect("inícios")).expect("u32"),
            seed: config["seed"].as_u64().expect("semente"),
            max_candidates: 5,
            cluster_tolerance: 0.05,
        },
        alpha: config["alpha"].as_f64().expect("alpha"),
    };
    (
        OptimizationRequest {
            dataset,
            factors,
            setup,
        },
        config,
        expected,
    )
}

fn dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<_> = fs::read_dir(root())
        .expect("casos")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.join("expected.json").exists())
        .collect();
    dirs.sort();
    dirs
}

fn close(case: &str, what: &str, got: f64, want: f64, rel: f64, abs: f64) {
    let allowed = rel * want.abs() + abs;
    assert!(
        (got - want).abs() <= allowed,
        "{case}: {what}: obtido {got:e}, esperado {want:e} (±{allowed:e})"
    );
}

#[test]
fn search_is_at_least_as_good_as_the_exhaustive_grid_and_statuses_match() {
    let all = dirs();
    assert!(all.len() >= 6, "esperava 6 casos, achei {}", all.len());
    for dir in all {
        let name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let (request, _, expected) = request_of(&dir);
        let want = &expected["reference"];
        let result = optimize(&request).expect(&name);
        let status = match result.status {
            OptimizationStatus::Found => "found",
            OptimizationStatus::OnlyZeroDesirability => "onlyZeroDesirability",
            OptimizationStatus::Infeasible => "infeasible",
        };
        assert_eq!(status, want["status"].as_str().expect("status"), "{name}");
        // Nenhum candidato viola restrições além da tolerância registrada.
        for c in &result.candidates {
            assert!(
                c.violation <= result.convergence.feasibility_tolerance,
                "{name}: violação {}",
                c.violation
            );
        }
        if status != "found" {
            if status == "infeasible" {
                assert!(
                    result.candidates.is_empty(),
                    "{name}: região inviável sem candidatos"
                );
            }
            continue;
        }
        let best = &result.candidates[0];
        let grid_d = want["bestD"].as_f64().expect("D");
        println!(
            "{name}: motor D = {:.6}, malha D = {grid_d:.6}, inícios = {}, ótimos distintos = {}, melhor com {} inícios, coded = {:?}",
            best.global_desirability,
            result.convergence.starts,
            result.convergence.distinct_optima,
            result.convergence.best_solution_starts,
            best.coded
        );
        assert!(
            best.global_desirability >= grid_d - 1e-9,
            "{name}: motor {} < malha {grid_d}",
            best.global_desirability
        );
        assert!(
            best.global_desirability <= grid_d + 5e-3,
            "{name}: motor {} ≫ malha {grid_d}",
            best.global_desirability
        );
        if want["locationCheck"].as_bool().expect("flag") {
            let target: Vec<f64> = want["bestCoded"]
                .as_array()
                .expect("coded")
                .iter()
                .map(|v| v.as_f64().expect("v"))
                .collect();
            let distance = best
                .coded
                .iter()
                .zip(&target)
                .map(|(a, b)| (a - b).powi(2))
                .sum::<f64>()
                .sqrt();
            assert!(
                distance <= 0.05,
                "{name}: ótimo em {:?}, malha {target:?}",
                best.coded
            );
        }
        // Candidatos ordenados.
        assert!(
            result
                .candidates
                .windows(2)
                .all(|w| w[0].global_desirability >= w[1].global_desirability - 1e-12),
            "{name}"
        );
        assert!(
            result
                .facts
                .iter()
                .any(|f| f.key == "optimization.no_global_claim")
        );
    }
}

#[test]
fn predictions_intervals_and_desirabilities_match_numpy_at_probe_points() {
    for dir in dirs() {
        let name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let (request, _, expected) = request_of(&dir);
        let probes = expected["reference"]["probes"].as_array().expect("sondas");
        let levels: Vec<(f64, f64)> = request
            .factors
            .iter()
            .map(|f| ((f.low + f.high) / 2.0, (f.high - f.low) / 2.0))
            .collect();
        let points: Vec<Vec<f64>> = probes
            .iter()
            .map(|p| {
                p["coded"]
                    .as_array()
                    .expect("coded")
                    .iter()
                    .zip(&levels)
                    .map(|(c, (centre, half))| centre + c.as_f64().expect("v") * half)
                    .collect()
            })
            .collect();
        let evaluation = evaluate_points(&EvaluateRequest {
            optimization: request.clone(),
            points,
        })
        .expect(&name);
        for (got, want) in evaluation.points.iter().zip(probes) {
            close(
                &name,
                "D global",
                got.global_desirability,
                want["global"].as_f64().expect("D"),
                1e-9,
                1e-9,
            );
            assert_eq!(
                got.extrapolated,
                want["extrapolated"].as_bool().expect("b"),
                "{name}: extrapolação em {:?}",
                got.coded
            );
            for (p, w) in got
                .predictions
                .iter()
                .zip(want["responses"].as_array().expect("r"))
            {
                let v = |s: optima_core::descriptive::Stat| s.value().expect("definida");
                close(
                    &name,
                    "previsto",
                    v(p.prediction.fitted),
                    w["fitted"].as_f64().expect("v"),
                    1e-8,
                    1e-9,
                );
                close(
                    &name,
                    "IC média inf",
                    v(p.prediction.mean_lower),
                    w["meanLower"].as_f64().expect("v"),
                    1e-8,
                    1e-9,
                );
                close(
                    &name,
                    "IC média sup",
                    v(p.prediction.mean_upper),
                    w["meanUpper"].as_f64().expect("v"),
                    1e-8,
                    1e-9,
                );
                close(
                    &name,
                    "IP inf",
                    v(p.prediction.prediction_lower),
                    w["predLower"].as_f64().expect("v"),
                    1e-8,
                    1e-9,
                );
                close(
                    &name,
                    "IP sup",
                    v(p.prediction.prediction_upper),
                    w["predUpper"].as_f64().expect("v"),
                    1e-8,
                    1e-9,
                );
                close(
                    &name,
                    "d individual",
                    p.desirability,
                    w["desirability"].as_f64().expect("v"),
                    1e-9,
                    1e-9,
                );
            }
        }
    }
}

#[test]
fn the_same_seed_gives_the_same_candidates_and_other_seeds_agree_on_the_optimum() {
    let (mut request, _, _) = request_of(&root().join("002-duas-respostas-conflito"));
    let first = optimize(&request).expect("busca");
    let second = optimize(&request).expect("busca");
    assert_eq!(
        first.candidates, second.candidates,
        "mesma semente, mesmos candidatos"
    );
    assert_eq!(first.convergence, second.convergence);
    request.setup.search.seed = 777;
    request.setup.search.starts = 80;
    let other = optimize(&request).expect("busca");
    let (a, b) = (&first.candidates[0], &other.candidates[0]);
    assert!((a.global_desirability - b.global_desirability).abs() < 1e-6);
    let distance = a
        .coded
        .iter()
        .zip(&b.coded)
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f64>()
        .sqrt();
    assert!(
        distance < 1e-3,
        "outras sementes encontram o mesmo ótimo: {distance}"
    );
    // Compromissos: cada resposta isolada é pelo menos tão desejável quanto no candidato.
    for t in &first.trade_offs {
        assert!(t.best_alone.is_some());
    }
    for p in &first.candidates[0].predictions {
        assert!(p.loss_vs_best_alone.expect("perda") >= 0.0);
    }
}

#[test]
fn extended_domains_flag_extrapolation_and_invalid_setups_are_refused() {
    let (mut request, _, _) = request_of(&root().join("004-otimo-na-fronteira"));
    let region = optimize(&request).expect("região");
    assert!(
        region.candidates.iter().all(|c| !c.extrapolated),
        "domínio padrão não extrapola"
    );
    // Extensão explícita do primeiro fator: o ótimo anda para fora da região e é marcado.
    request.setup.domain = DomainSpec::Extended {
        bounds: vec![FactorBounds {
            factor_id: id("f1"),
            min: -5.0,
            max: 20.0,
        }],
    };
    let extended = optimize(&request).expect("estendido");
    assert!(extended.extended);
    assert!(
        extended.candidates[0].extrapolated,
        "candidato fora da região é marcado"
    );
    assert!(extended.candidates[0].global_desirability >= region.candidates[0].global_desirability);
    assert!(
        extended
            .facts
            .iter()
            .any(|f| f.key == "optimization.extrapolated")
    );

    let refused = |r: &OptimizationRequest, code: &str| {
        let text = format!("{:?}", optimize(r).expect_err(code));
        assert!(text.contains(code), "{code} ∉ {text}");
    };
    let mut bad = request.clone();
    bad.setup.domain = DomainSpec::Region;
    bad.setup.responses[0].goal = Goal::Maximize {
        low: 5.0,
        target: 5.0,
        shape: 1.0,
    };
    refused(&bad, "optimization.invalid_goal");
    let mut bad = request.clone();
    bad.setup.responses.clear();
    refused(&bad, "optimization.no_responses");
    let mut bad = request.clone();
    bad.setup.search.starts = 0;
    refused(&bad, "optimization.invalid_search");
    let mut bad = request;
    bad.setup.alpha = 1.0;
    refused(&bad, "optimization.invalid_alpha");
}

#[test]
fn desirability_grid_matches_the_evaluation_and_marks_extrapolation() {
    let (request, _, _) = request_of(&root().join("002-duas-respostas-conflito"));
    let grid = desirability_grid(&OptimizationGridRequest {
        optimization: request.clone(),
        x_factor: id("f1"),
        y_factor: id("f2"),
        fixed: Vec::new(),
        steps: 9,
    })
    .expect("malha");
    assert_eq!((grid.x.len(), grid.y.len()), (9, 9));
    assert_eq!(grid.fixed.len(), 1);
    // Cada nó concorda com a avaliação direta (desejabilidade global ou zero se violar limite).
    let centre_z = (request.factors[2].low + request.factors[2].high) / 2.0;
    let mut checked = 0;
    for (iy, row) in grid.z.iter().enumerate() {
        for (ix, cell) in row.iter().enumerate() {
            let e = evaluate_points(&EvaluateRequest {
                optimization: request.clone(),
                points: vec![vec![grid.x[ix], grid.y[iy], centre_z]],
            })
            .expect("avaliação");
            let p = &e.points[0];
            let want = if p.violation > 0.0 {
                0.0
            } else {
                p.global_desirability
            };
            let got = cell.value().expect("definida");
            assert!((got - want).abs() < 1e-12, "[{iy}][{ix}]: {got} ≠ {want}");
            assert_eq!(grid.extrapolated[iy][ix], p.extrapolated);
            checked += 1;
        }
    }
    assert_eq!(checked, 81);
    assert!(grid.z_max.expect("max") > 0.0);
}
