//! Deterministic work observation for existing JSON operations; no scientific formulas here.
#[cfg(feature = "validation-metrics")]
fn main() -> Result<(), Box<dyn std::error::Error>> {
    use desvtag_core::{models, power, validation_metrics};
    use serde_json::{Value, json};
    let path = std::env::args()
        .nth(1)
        .ok_or("Expected operation-list JSON path")?;
    let cases: Vec<Value> = serde_json::from_slice(&std::fs::read(path)?)?;
    let mut observations = Vec::new();
    for case in cases {
        let operation = &case["operation"];
        let (result, counts) = validation_metrics::observe(|| -> Result<Value, String> {
            match operation["type"].as_str() {
                Some("modelNonlinear") => {
                    let request =
                        serde_json::from_value(operation.clone()).map_err(|e| e.to_string())?;
                    let result = models::nonlinear::fit(&request).map_err(|e| format!("{e:?}"))?;
                    serde_json::to_value(result).map_err(|e| e.to_string())
                }
                Some("modelMixed") => {
                    let request =
                        serde_json::from_value(operation.clone()).map_err(|e| e.to_string())?;
                    let result = models::mixed::fit(&request).map_err(|e| format!("{e:?}"))?;
                    serde_json::to_value(result).map_err(|e| e.to_string())
                }
                Some("powerAnalyze") => {
                    let request =
                        serde_json::from_value(operation.clone()).map_err(|e| e.to_string())?;
                    let result = power::analyze(&request).map_err(|e| format!("{e:?}"))?;
                    serde_json::to_value(result).map_err(|e| e.to_string())
                }
                _ => Err("Observation supports only scientific ET24 operations".into()),
            }
        });
        observations.push(json!({ "name": case["name"], "counts": counts,
            "result": result.as_ref().ok(), "error": result.as_ref().err() }));
        eprintln!("Observed {}", case["name"]);
    }
    println!("{}", serde_json::to_string_pretty(&observations)?);
    Ok(())
}

#[cfg(not(feature = "validation-metrics"))]
fn main() {
    eprintln!("Enable --features validation-metrics for this observation-only executable.");
    std::process::exit(2);
}
