//! Medição de tempo do motor em conjuntos de tamanhos crescentes (ET10-T04). Não é um teste de
//! correção: `#[ignore]`, executado sob demanda em modo `release`:
//!
//! ```text
//! cargo test --release -p optima-engine --test performance -- --ignored --nocapture
//! ```
//!
//! Imprime uma tabela Markdown com a mediana de 3 execuções de cada operação pelo transporte JSON
//! (o mesmo caminho do Tauri e do WebAssembly).
#![allow(
    clippy::expect_used,
    clippy::panic,
    clippy::print_stdout,
    clippy::indexing_slicing,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation
)]

use std::time::Instant;

use optima_engine::handle_json;
use serde_json::{Value, json};

/// Gerador congruencial determinístico (apenas para dados sintéticos).
struct Lcg(u64);
impl Lcg {
    fn next(&mut self) -> f64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        ((self.0 >> 11) as f64) / ((1_u64 << 53) as f64)
    }
    fn noise(&mut self) -> f64 {
        // soma de 6 uniformes ≈ normal
        (0..6).map(|_| self.next()).sum::<f64>() - 3.0
    }
}

fn call(operation: Value) -> Value {
    let text = handle_json(
        &json!({"protocolVersion": 1, "taskId": "p", "operation": operation}).to_string(),
    );
    serde_json::from_str(&text).expect("json")
}

fn median_ms(mut run: impl FnMut()) -> f64 {
    let mut times: Vec<f64> = (0..3)
        .map(|_| {
            let start = Instant::now();
            run();
            start.elapsed().as_secs_f64() * 1000.0
        })
        .collect();
    times.sort_by(|a, b| a.partial_cmp(b).expect("ordem"));
    times[1]
}

fn one_way(groups: usize, reps: usize) -> Value {
    let mut rng = Lcg(7);
    let levels: Vec<String> = (0..groups).map(|g| format!("G{g}")).collect();
    let mut observations = Vec::new();
    for (g, level) in levels.iter().enumerate() {
        for r in 0..reps {
            observations.push(json!({
                "id": format!("o{}", observations.len() + 1), "unitId": null,
                "factors": [level], "responses": [10.0 + g as f64 * 0.3 + rng.noise() + r as f64 * 0.0]
            }));
        }
    }
    json!({
        "type": "comparisonOneWay",
        "dataset": {
            "factors": [{"id": "t", "name": "t", "kind": "categorical", "unit": null, "levels": levels}],
            "responses": [{"id": "y", "name": "y", "unit": null}],
            "observations": observations
        },
        "responseId": "y", "factorId": "t", "alpha": 0.05
    })
}

fn factors(k: usize) -> Vec<Value> {
    (0..k)
        .map(|i| json!({"id": format!("f{}", i + 1), "name": format!("F{}", i + 1), "low": 10.0, "high": 30.0, "unit": null}))
        .collect()
}

fn ccd_runs(k: usize, centers: u32) -> Vec<Vec<f64>> {
    let spec = json!({
        "type": "designGenerate",
        "kind": {"type": "centralComposite", "axial": {"type": "rotatable"}, "inscribed": false, "generators": []},
        "factors": factors(k), "replicates": 1, "centerPoints": centers, "randomize": false, "seed": 1
    });
    let response = call(spec);
    response["outcome"]["result"]["runs"]
        .as_array()
        .unwrap_or_else(|| panic!("planejamento: {response}"))
        .iter()
        .map(|r| {
            r["real"]
                .as_array()
                .expect("real")
                .iter()
                .map(|v| v.as_f64().expect("num"))
                .collect()
        })
        .collect()
}

fn terms(k: usize) -> Vec<Value> {
    let mut out = Vec::new();
    for i in 0..k {
        out.push(json!({"type": "main", "factorId": format!("f{}", i + 1)}));
    }
    for i in 0..k {
        out.push(json!({"type": "power", "factorId": format!("f{}", i + 1), "degree": 2}));
    }
    for i in 0..k {
        for j in (i + 1)..k {
            out.push(json!({"type": "interaction", "factorIds": [format!("f{}", i + 1), format!("f{}", j + 1)]}));
        }
    }
    out
}

fn surface_dataset(k: usize, centers: u32, responses: usize) -> (Value, usize) {
    let runs = ccd_runs(k, centers);
    let mut rng = Lcg(11);
    let observations: Vec<Value> = runs
        .iter()
        .enumerate()
        .map(|(i, x)| {
            let z: Vec<f64> = x.iter().map(|v| (v - 20.0) / 10.0).collect();
            let ys: Vec<f64> = (0..responses)
                .map(|r| {
                    let sign = if r == 0 { 1.0 } else { -1.0 };
                    50.0 + sign * z.iter().map(|v| 3.0 * v - 2.0 * v * v).sum::<f64>()
                        + 0.2 * rng.noise()
                })
                .collect();
            json!({"id": format!("o{}", i + 1), "unitId": null, "factors": x, "responses": ys})
        })
        .collect();
    let dataset = json!({
        "factors": (0..k).map(|i| json!({"id": format!("f{}", i + 1), "name": format!("F{}", i + 1), "kind": "numeric", "unit": null, "levels": []})).collect::<Vec<_>>(),
        "responses": (0..responses).map(|r| json!({"id": format!("r{}", r + 1), "name": format!("R{}", r + 1), "unit": null})).collect::<Vec<_>>(),
        "observations": observations
    });
    (dataset, runs.len())
}

#[test]
#[ignore = "medição sob demanda (ET10-T04)"]
fn measure_operations() {
    println!("| Operação | Tamanho | Mediana (ms) |");
    println!("|---|---|---:|");
    for (groups, reps) in [(4, 5), (12, 10), (40, 30), (100, 30)] {
        let request = one_way(groups, reps);
        let ms = median_ms(|| {
            let r = call(request.clone());
            assert_eq!(r["outcome"]["status"], "ok", "{r}");
        });
        println!(
            "| ANOVA + Tukey + letras | {groups} grupos × {reps} repetições ({} obs.) | {ms:.1} |",
            groups * reps
        );
    }
    for k in 2..=5 {
        let (dataset, n) = surface_dataset(k, 5, 1);
        let request = json!({
            "type": "surfaceAnalyze", "dataset": dataset, "responseId": "r1",
            "factors": factors(k), "terms": terms(k), "alpha": 0.05
        });
        let ms = median_ms(|| {
            let r = call(request.clone());
            assert_eq!(r["outcome"]["status"], "ok", "{r}");
        });
        println!("| Superfície de segunda ordem | {k} fatores ({n} ensaios) | {ms:.1} |");
    }
    for k in 2..=5 {
        for starts in [40_u32, 200] {
            let (dataset, n) = surface_dataset(k, 5, 2);
            let request = json!({
                "type": "optimizationRun",
                "dataset": dataset,
                "factors": factors(k),
                "setup": {
                    "responses": [
                        {"responseId": "r1", "terms": terms(k), "goal": {"type": "maximize", "low": 40.0, "target": 80.0, "shape": 1.0}, "importance": 1.0},
                        {"responseId": "r2", "terms": terms(k), "goal": {"type": "minimize", "target": 20.0, "high": 60.0, "shape": 1.0}, "importance": 1.0}
                    ],
                    "limits": [],
                    "domain": {"type": "region"},
                    "search": {"starts": starts, "seed": 1, "maxCandidates": 5, "clusterTolerance": 0.05},
                    "alpha": 0.05
                }
            });
            let ms = median_ms(|| {
                let r = call(request.clone());
                assert_eq!(r["outcome"]["status"], "ok", "{r}");
            });
            println!(
                "| Otimização, 2 respostas | {k} fatores ({n} ensaios), {starts} inícios | {ms:.1} |"
            );
        }
    }
}

/// Quanto do tempo da comparação é o valor-p de Tukey (distribuição da amplitude studentizada).
#[test]
#[ignore = "medição sob demanda (ET10-T04)"]
fn measure_studentized_range_share() {
    use optima_core::distributions::studentized_range::sf;
    println!("| Valor-p de Tukey isolado | Mediana por valor (ms) |");
    println!("|---|---:|");
    for (k, df) in [
        (4_usize, 16.0_f64),
        (12, 108.0),
        (40, 1160.0),
        (100, 2900.0),
    ] {
        let ms = median_ms(|| {
            for q in [2.0, 3.0, 4.0, 5.0, 6.0] {
                sf(q, k, df).expect("sf");
            }
        }) / 5.0;
        println!("| k = {k}, g.l. = {df} | {ms:.2} |");
    }
}
