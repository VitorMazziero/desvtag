"""Prepare an observation-only copy of the preserved core, without altering the ZIP/product."""
from pathlib import Path
import hashlib
import json
import os
import re
import shutil
import tempfile
import tomllib
import zipfile

root = Path(__file__).resolve().parents[2]
archive = Path(os.environ["TEMP"]) / "enzitag-before-performance-20261104.zip"
directory = Path(tempfile.mkdtemp(prefix="enzitag-et24-metrics-baseline-"))
prefix = "app/crates/optima-core/src/"
originals = {}
with zipfile.ZipFile(archive) as package:
    for name in package.namelist():
        if not name.startswith(prefix) or not name.endswith(".rs"):
            continue
        path = (directory / "src" / name[len(prefix):]).resolve()
        assert path.is_relative_to(directory)
        data = package.read(name)
        originals[name] = hashlib.sha256(data).hexdigest()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

workspace = tomllib.loads((root / "app/Cargo.toml").read_text(encoding="utf-8"))["workspace"]
manifest = "[workspace]\n[package]\nname = \"desvtag-core\"\n"
for key, value in workspace["package"].items():
    manifest += key + " = " + json.dumps(value) + "\n"
manifest += '\n[features]\nvalidation-metrics = []\n[dependencies]\n'
for key in ["serde", "ts-rs"]:
    options = workspace["dependencies"][key]
    manifest += key + " = { " + ", ".join(k + " = " + json.dumps(v) for k, v in options.items()) + " }\n"
options = workspace["dependencies"]["serde_json"]
manifest += '\n[dev-dependencies]\nserde_json = { ' + ", ".join(k + " = " + json.dumps(v) for k, v in options.items()) + ' }\n'
manifest += '\n[profile.release]\nopt-level = 3\nlto = true\ncodegen-units = 1\n'
(directory / "Cargo.toml").write_text(manifest, encoding="utf-8")
shutil.copyfile(root / "app/Cargo.lock", directory / "Cargo.lock")
shutil.copyfile(root / "app/crates/desvtag-core/src/validation_metrics.rs", directory / "src/validation_metrics.rs")
(directory / "examples").mkdir()
shutil.copyfile(root / "app/crates/desvtag-core/examples/et24_metrics.rs", directory / "examples/et24_metrics.rs")

lib = directory / "src/lib.rs"
text = lib.read_text(encoding="utf-8")
text = text.replace("pub mod comparisons;", '''macro_rules! record_work {
    ($label:literal, $amount:expr) => {
        #[cfg(feature = "validation-metrics")]
        crate::validation_metrics::record($label, $amount);
    };
}
#[cfg(feature = "validation-metrics")]
pub mod validation_metrics;
pub mod comparisons;''', 1)
lib.write_text(text, encoding="utf-8")

changes = {}
def read(file):
    path = directory / "src" / file
    if path not in changes:
        changes[path] = path.read_text(encoding="utf-8")
    return path, changes[path]

def hook(file, function, label):
    path, text = read(file)
    matches = list(re.finditer(r"\bfn " + re.escape(function) + r"\s*\(", text))
    assert len(matches) == 1, (file, function, len(matches))
    position = text.index("{", matches[0].end()) + 1
    changes[path] = text[:position] + '\n    record_work!("' + label + '", 1);' + text[position:]

def insert(file, marker, added):
    path, text = read(file)
    assert text.count(marker) == 1, (file, marker)
    changes[path] = text.replace(marker, added + "\n" + marker, 1)

for parameters in [
    ("models/nonlinear/optimizer.rs", "starts", "nonlinear.start_preparations"),
    ("models/nonlinear/optimizer.rs", "levenberg_marquardt", "nonlinear.lm_runs"),
    ("models/nonlinear/model.rs", "predict", "nonlinear.predict_calls"),
    ("models/nonlinear/model.rs", "gradient", "nonlinear.gradient_calls"),
    ("models/nonlinear/model.rs", "jacobian", "nonlinear.jacobian_allocations"),
    ("models/nonlinear/profile.rs", "constrained", "profile.constrained_calls"),
    ("models/mixed/estimation.rs", "evaluate", "mixed.prepare_calls"),
    ("models/mixed/estimation.rs", "evaluate", "mixed.evaluate_calls"),
    ("models/mixed/linalg.rs", "inverse", "mixed.information_inversions"),
    ("power/advanced.rs", "evaluation", "power.evaluate_calls"),
    ("power/advanced.rs", "half_width", "power.half_width_calls"),
    ("power/t_test.rs", "power", "power.evaluate_calls"),
    ("power/t_test.rs", "half_width", "power.half_width_calls"),
    ("power/anova.rs", "power", "power.evaluate_calls"),
]:
    hook(*parameters)

path, text = read("models/nonlinear/optimizer.rs")
marker = "for iteration in 0..MAX_ITERATIONS {"
assert text.count(marker) == 1
changes[path] = text.replace(marker, marker + '\n record_work!("nonlinear.lm_iterations", 1);')
path, text = read("models/mixed/estimation.rs")
marker = "for group in &data.groups {"
assert text.count(marker) == 1
changes[path] = text.replace(marker, marker + '\n record_work!("mixed.covariance_blocks", 1);')
insert("power/advanced.rs", "let q = f64::from(numerator_df);", 'record_work!("power.tail_calls", 1);')
insert("power/advanced.rs", "let power = 1.0 - noncentral::nct_cdf", 'record_work!("power.tail_calls", if request.two_sided { 2 } else { 1 });')
insert("power/t_test.rs", "let upper = 1.0 - noncentral::nct_cdf", 'record_work!("power.tail_calls", if two_sided { 2 } else { 1 });')
insert("power/anova.rs", "let power = noncentral::ncf_sf", 'record_work!("power.tail_calls", 1);')
insert("power/simulation.rs", "    summary(options, rejections)", 'record_work!("power.simulation_studies", u64::from(options.replications));')
insert("models/nonlinear/optimizer.rs", "let r: Vec<f64> = request", 'record_work!("nonlinear.solver_buffer_sets", 1);')
for path, text in changes.items():
    path.write_text(text, encoding="utf-8")

evidence = root / ".local/validation/et24/performance-work-counts"
evidence.mkdir(parents=True, exist_ok=True)
(evidence / "baseline-preparation.json").write_text(json.dumps({
    "directory": str(directory), "archive": str(archive),
    "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
    "originalSourceHashes": originals,
    "change": "Observation macro/hooks, metrics module, example and standalone manifest only; formulas and control flow preserved. Instrumented timings are not performance qualification.",
}, indent=2), encoding="utf-8")
print(directory)
