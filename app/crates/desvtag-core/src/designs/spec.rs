//! Especificação e resultado de um planejamento de dois níveis.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::alias::AliasSet;
use crate::domain::StableId;
use crate::provenance::Provenance;
use crate::validation::Issue;

/// Número máximo de ensaios aceitos em um planejamento.
pub const MAX_RUNS: u32 = 5000;
/// Número máximo de fatores de um fatorial completo (`2¹² = 4096`).
pub const MAX_FULL_FACTORS: usize = 12;

/// Distância axial do composto central.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum AxialKind {
    /// Rotacional: `α = F^(1/4)`, com `F` os pontos da parte fatorial (DCCR/CCRD).
    Rotatable,
    /// Face centrada: `α = 1` (FCD).
    FaceCentered,
    /// `α` informado (`0 < α ≤ 10`): caso geral, que cobre as demais variantes.
    #[serde(rename_all = "camelCase")]
    Custom {
        /// Distância axial na escala codificada.
        alpha: f64,
    },
}

/// Tipo de planejamento.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum DesignKind {
    /// Fatorial completo `2ᵏ`.
    FullFactorial,
    /// Fracionário regular `2^(k−p)`, com um gerador por fator adicional (`"D=ABC"`).
    #[serde(rename_all = "camelCase")]
    Fractional {
        /// Geradores, na ordem dos fatores gerados.
        generators: Vec<String>,
    },
    /// Plackett–Burman com `runs` ensaios (8, 12, 16, 20, 24, 32, 44 ou 48).
    #[serde(rename_all = "camelCase")]
    PlackettBurman {
        /// Número de ensaios do planejamento básico.
        runs: u32,
    },
    /// Composto central: parte fatorial (completa ou fracionária), pontos axiais ±α e centrais.
    #[serde(rename_all = "camelCase")]
    CentralComposite {
        /// Distância axial.
        axial: AxialKind,
        /// Inscrito: os pontos **axiais** ficam nos níveis informados (±1) e a parte fatorial em
        /// ±1/α. Circunscrito (padrão): fatorial em ±1 e axiais em ±α.
        inscribed: bool,
        /// Geradores da parte fatorial fracionária (vazio = fatorial completo).
        generators: Vec<String>,
    },
    /// Box–Behnken (3 a 5 fatores): pares de fatores em ±1 com os demais no centro.
    BoxBehnken,
}

/// Fator de dois níveis.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignFactor {
    /// Identificador do fator no experimento.
    pub id: StableId,
    /// Nome digitado.
    pub name: String,
    /// Nível baixo (real).
    pub low: f64,
    /// Nível alto (real).
    pub high: f64,
    /// Unidade livre.
    pub unit: Option<String>,
}

/// Especificação do planejamento.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignSpec {
    /// Tipo.
    pub kind: DesignKind,
    /// Fatores, na ordem das colunas (`A`, `B`, …).
    pub factors: Vec<DesignFactor>,
    /// Repetições do planejamento básico (≥ 1); cada repetição é uma réplica experimental.
    pub replicates: u32,
    /// Pontos centrais (codificação 0), acrescentados ao final do planejamento básico.
    pub center_points: u32,
    /// Aleatorizar a ordem de execução.
    pub randomize: bool,
    /// Semente da aleatorização (registrada no resultado); inteiro de até 2⁵³ − 1 na interface.
    #[ts(type = "number")]
    pub seed: u64,
}

/// Contagem de ensaios, antes de gerar.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RunCount {
    /// Ensaios do planejamento básico (uma repetição).
    pub base_runs: u32,
    /// Ensaios fatoriais, com as repetições.
    pub factorial_runs: u32,
    /// Pontos axiais incluídos em `factorial_runs` (composto central; 0 nos demais).
    pub axial_runs: u32,
    /// Pontos centrais.
    pub center_runs: u32,
    /// Total.
    pub total: u32,
}

/// Tipo de ponto.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum PointType {
    /// Ponto do planejamento básico.
    Factorial,
    /// Ponto central.
    Center,
    /// Ponto axial (±α) do composto central.
    Axial,
}

/// Um ensaio.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignRun {
    /// Posição de execução (1-based). Sem aleatorização, igual à ordem padrão.
    pub run: u32,
    /// Posição na ordem padrão (1-based).
    pub standard_order: u32,
    /// Tipo de ponto.
    pub point: PointType,
    /// Repetição (1-based; 0 nos pontos centrais).
    pub replicate: u32,
    /// Valores codificados (−1, 0, +1) por fator.
    pub coded: Vec<f64>,
    /// Valores reais por fator.
    pub real: Vec<f64>,
}

/// Efeito e seus confundidos (fracionários).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AliasRow {
    /// Efeito (`A`, `AB`, …).
    pub effect: String,
    /// Efeitos confundidos com ele, com sinal (`+BCD`, `−CD`).
    pub aliases: Vec<String>,
}

/// Planejamento gerado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GeneratedDesign {
    /// Especificação usada.
    pub spec: DesignSpec,
    /// Contagem de ensaios.
    pub count: RunCount,
    /// Ensaios na ordem de execução.
    pub runs: Vec<DesignRun>,
    /// Relação definidora (`I = ABCD`), vazia nos fatoriais completos e em PB.
    pub defining_relation: Vec<String>,
    /// Resolução (fracionários e PB: III).
    pub resolution: Option<u32>,
    /// Confundimento de efeitos principais e de interações de dois fatores (fracionários).
    pub aliases: Vec<AliasRow>,
    /// Distância axial `α` (composto central).
    pub axial_distance: Option<f64>,
    /// Colunas fictícias do Plackett–Burman.
    pub dummy_columns: u32,
    /// Maior correlação absoluta entre um efeito principal e uma interação de dois fatores
    /// (Plackett–Burman; 0 nos fatoriais e 0 nos fracionários regulares sem confundimento parcial).
    pub max_main_vs_two_factor_correlation: f64,
    /// Algoritmo de aleatorização.
    pub randomization_algorithm: String,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

/// Efeito sem rótulo numérico: auxiliar para converter `AliasSet` em linhas.
#[must_use]
pub fn alias_rows(sets: &[AliasSet]) -> Vec<AliasRow> {
    sets.iter()
        .map(|s| AliasRow {
            effect: super::alias::effect_name(s.effect),
            aliases: s
                .aliases
                .iter()
                .map(|(mask, sign)| {
                    format!(
                        "{}{}",
                        if *sign < 0 { '−' } else { '+' },
                        super::alias::effect_name(*mask)
                    )
                })
                .collect(),
        })
        .collect()
}
