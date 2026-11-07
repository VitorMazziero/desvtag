//! Contagem de ensaios das telas «Methodology» do Protimiza (ET14-T02, PD-05).
//!
//! As fórmulas vêm das capturas `03`, `04` e `05` fornecidas pelo usuário (quatro fatores, uma
//! repetição genuína, três pontos centrais): CCRD `r·(2^k + 2·k) + cp = 27`, FCD o mesmo, e a opção
//! rotulada «CCD» `r·2^k + cp = 19`, ou seja, **fatorial completo de dois níveis com pontos
//! centrais**: apesar do rótulo, não há pontos axiais. O aplicativo reproduz as três contagens
//! com os planejamentos que já tem (composto central rotacional, face centrada e fatorial com
//! centros).
#![allow(clippy::expect_used)]

use desvtag_core::designs::count_runs;
use desvtag_core::designs::spec::{AxialKind, DesignFactor, DesignKind, DesignSpec};
use desvtag_core::domain::StableId;

fn spec(kind: DesignKind, k: usize, replicates: u32, center_points: u32) -> DesignSpec {
    DesignSpec {
        kind,
        factors: (0..k)
            .map(|i| DesignFactor {
                id: StableId::new(format!("f{}", i + 1)).expect("id"),
                name: format!("F{}", i + 1),
                low: -1.0,
                high: 1.0,
                unit: None,
            })
            .collect(),
        replicates,
        center_points,
        randomize: false,
        seed: 1,
    }
}

fn composite(axial: AxialKind) -> DesignKind {
    DesignKind::CentralComposite {
        axial,
        inscribed: false,
        generators: Vec::new(),
    }
}

#[test]
fn the_three_counts_of_the_captures_are_reproduced() {
    let total = |s: &DesignSpec| count_runs(s).expect("contagem").total;
    // Capturas: k = 4, r = 1, cp = 3.
    assert_eq!(total(&spec(composite(AxialKind::Rotatable), 4, 1, 3)), 27); // 1·(2⁴ + 2·4) + 3
    assert_eq!(
        total(&spec(composite(AxialKind::FaceCentered), 4, 1, 3)),
        27
    );
    assert_eq!(total(&spec(DesignKind::FullFactorial, 4, 1, 3)), 19); // 1·2⁴ + 3, «CCD» do serviço
}

#[test]
fn the_formulas_hold_for_other_sizes_and_repetitions() {
    for k in 2..=5_usize {
        for r in 1..=3_u32 {
            for cp in [0_u32, 1, 3, 5] {
                let cube = 1_u32 << k;
                let axial = 2 * u32::try_from(k).expect("k");
                let rotatable =
                    count_runs(&spec(composite(AxialKind::Rotatable), k, r, cp)).expect("contagem");
                assert_eq!(
                    rotatable.total,
                    r * (cube + axial) + cp,
                    "CCRD k={k} r={r} cp={cp}"
                );
                let face = count_runs(&spec(composite(AxialKind::FaceCentered), k, r, cp))
                    .expect("contagem");
                assert_eq!(
                    face.total,
                    r * (cube + axial) + cp,
                    "FCD k={k} r={r} cp={cp}"
                );
                let factorial =
                    count_runs(&spec(DesignKind::FullFactorial, k, r, cp)).expect("contagem");
                assert_eq!(
                    factorial.total,
                    r * cube + cp,
                    "fatorial k={k} r={r} cp={cp}"
                );
                assert_eq!(
                    factorial.axial_runs, 0,
                    "o «CCD» do serviço não tem pontos axiais"
                );
            }
        }
    }
}

/// Captura `10`: matriz codificada 2⁴ em ordem padrão (x₁ varia mais rápido) e três linhas
/// centrais ao final, 19 ensaios.
#[test]
fn the_non_randomized_matrix_equals_the_one_shown_in_the_capture() {
    let design = desvtag_core::designs::generate(&spec(DesignKind::FullFactorial, 4, 1, 3))
        .expect("planejamento");
    assert_eq!(design.runs.len(), 19);
    for (i, run) in design.runs.iter().take(16).enumerate() {
        for (j, value) in run.coded.iter().enumerate() {
            let want = if (i >> j) & 1 == 1 { 1.0 } else { -1.0 };
            assert!(
                (value - want).abs() < 1e-12,
                "linha {} fator {}",
                i + 1,
                j + 1
            );
        }
    }
    for run in design.runs.iter().skip(16) {
        assert!(run.coded.iter().all(|v| v.abs() < 1e-12));
    }
}
