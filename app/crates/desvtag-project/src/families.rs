//! Optional, additive storage of the analysis families introduced in v0.3.
//! Inputs and results are immutable records; editable selections live beside them.
use std::collections::BTreeMap;

use desvtag_core::comparisons::paired::{PairedRequest, PairedResult};
use desvtag_core::domain::StableId;
use desvtag_core::models::mixed::{MixedModelRequest, MixedModelResult};
use desvtag_core::models::mixture::{MixtureAnalysis, MixtureAnalysisRequest};
use desvtag_core::models::nonlinear::{NonlinearRequest, NonlinearResult, SaturationModel};
use desvtag_core::power::{PowerRequest, PowerResult};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Result family selected for presentation. Absent in old documents.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum AnalysisFamily {
    /// Existing descriptive/comparison/design/surface result.
    Legacy,
    /// Scheffe mixture model.
    Mixture,
    /// Paired comparison or mixed model.
    Repeated,
    /// Nonlinear saturation model.
    Nonlinear,
    /// Prospective power, sample size or precision.
    Power,
}

/// Response being edited; model and alpha retain their existing experiment fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureSelection {
    /// Response, including an unresolved selection after deleting a variable.
    pub response_id: Option<StableId>,
    /// Editable real-fraction reference drafts; absent disables the Cox trace.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub cox_reference: Option<Vec<String>>,
    /// Optional mixture desirability goals, edited separately from saved results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub optimization: Option<MixtureOptimizationDraft>,
}

/// Editable goal kind, independent of its raw numeric drafts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum MixtureGoalKind {
    /// Increase the response.
    Maximize,
    /// Decrease the response.
    Minimize,
    /// Approach a target.
    Target,
    /// Remain in an interval.
    Range,
}

/// Raw fields retained even when an edited goal is invalid.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureResponseGoalDraft {
    /// Included response identity.
    pub response_id: StableId,
    /// Desired goal function.
    pub kind: MixtureGoalKind,
    /// Lower goal threshold.
    pub low: String,
    /// Target threshold.
    pub target: String,
    /// Upper goal threshold.
    pub high: String,
    /// Lower-side or one-sided shape exponent.
    pub shape_low: String,
    /// Upper-side target shape exponent.
    pub shape_high: String,
    /// Relative importance.
    pub importance: String,
    /// Optional mandatory lower response bound.
    pub min: String,
    /// Optional mandatory upper response bound.
    pub max: String,
}

/// Editable mixture optimization configuration; scientific requests keep parsed values separately.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureOptimizationDraft {
    /// Included responses and their raw goals.
    pub responses: Vec<MixtureResponseGoalDraft>,
    /// Requested local starts.
    pub starts: String,
    /// Deterministic seed.
    pub seed: String,
    /// Maximum returned candidates.
    pub max_candidates: String,
    /// Clustering distance in pseudocomponents.
    pub cluster_tolerance: String,
}

/// Exact numeric request and variable identities used for a mixture fit.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureInputSnapshot {
    /// Historical response.
    pub response_id: StableId,
    /// Historical components, in request order.
    pub component_ids: Vec<StableId>,
    /// Request accepted by the scientific engine.
    pub request: MixtureAnalysisRequest,
}

/// Procedure being edited in the dependent-observations panel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum RepeatedMethod {
    /// Two related conditions.
    Paired,
    /// Linear mixed model.
    Mixed,
}

/// Editable repeated-observations configuration; alpha is the experiment alpha.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RepeatedSelection {
    /// Procedure.
    pub method: RepeatedMethod,
    /// Response.
    pub response_id: Option<StableId>,
    /// None uses the grid's dedicated experimental-unit column.
    pub unit_source: Option<StableId>,
    /// Factor defining the paired conditions.
    pub pair_factor: Option<StableId>,
    /// None keeps the default fixed-factor selection.
    pub fixed: Option<Vec<StableId>>,
    /// Configuration v2; absent keeps legacy files and inference unchanged.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub advanced: Option<MixedAdvancedSelection>,
}

/// Pairing information retained without storing localized prose.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PairingSnapshot {
    /// Complete experimental units, in request order.
    pub units: Vec<String>,
    /// Units with a missing condition.
    pub incomplete: Vec<String>,
    /// Units with duplicate measurements in a condition.
    pub duplicated: Vec<String>,
    /// Observations with no usable experimental-unit identifier.
    pub without_unit: u32,
}

/// Exact request used for the saved dependent-observations result.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
#[ts(export)]
pub enum RepeatedInputSnapshot {
    /// Paired observations, after the explicit matching/exclusion step.
    Paired {
        /// Response.
        response_id: StableId,
        /// Factor defining the two conditions.
        factor_id: StableId,
        /// None uses the dedicated unit column.
        unit_source: Option<StableId>,
        /// Original unit labels; scientific identifiers remain distinct and stable.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        unit_labels: Option<BTreeMap<String, String>>,
        /// Pairing diagnostics.
        pairing: PairingSnapshot,
        /// Numeric scientific request.
        request: PairedRequest,
    },
    /// Mixed model with the experimental units already mapped into the dataset.
    Mixed {
        /// None uses the dedicated unit column.
        unit_source: Option<StableId>,
        /// Original unit labels; scientific identifiers remain distinct and stable.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        unit_labels: Option<BTreeMap<String, String>>,
        /// Numeric scientific request.
        request: MixedModelRequest,
    },
}

/// Saved result; its discriminant must match the input snapshot.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum RepeatedOutput {
    /// Paired t/Wilcoxon.
    Paired(Box<PairedResult>),
    /// Linear mixed model.
    Mixed(Box<MixedModelResult>),
}

/// Editable saturation configuration. Text fields preserve incomplete edits.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NonlinearSelection {
    /// Substrate factor.
    pub factor_id: Option<StableId>,
    /// Response.
    pub response_id: Option<StableId>,
    /// Saturation model.
    pub model: SaturationModel,
    /// None uses automatic starts; individual text fields may still be incomplete.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub initial: Option<Vec<String>>,
    /// None uses the default lower bounds; empty text means unspecified.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub lower: Option<Vec<String>>,
    /// None uses the default upper bounds; empty text means unspecified.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub upper: Option<Vec<String>>,
    /// Request Gaussian likelihood profiles; absent preserves old selections.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub profile: Option<bool>,
}

/// Exact saturation request plus historical variable identities.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NonlinearInputSnapshot {
    /// Substrate factor.
    pub factor_id: StableId,
    /// Response.
    pub response_id: StableId,
    /// Numeric scientific request, including the fitted points.
    pub request: NonlinearRequest,
}

/// Power design selected in the calculator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum PowerKind {
    /// One-way ANOVA.
    Anova,
    /// One-sample t.
    OneSampleT,
    /// Paired t.
    PairedT,
    /// Independent two-sample t.
    TwoSampleT,
    /// Joint fixed-design regression slope test.
    Regression,
    /// Planned contrast of independent group means.
    Contrast,
    /// One effect in a full two-level factorial.
    TwoLevel,
}

/// Quantity requested from the power calculator.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum PowerGoalKind {
    /// Power at a fixed sample size.
    PowerAt,
    /// Sample size for a target power.
    SampleSizeFor,
    /// Sample size for an interval half-width.
    PrecisionFor,
}

/// Raw editable assumptions, independent of the experiment's observations.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerSelection {
    /// Design.
    pub kind: PowerKind,
    /// Requested quantity.
    pub goal: PowerGoalKind,
    /// Expected group means, as entered.
    pub means: String,
    /// Expected difference, as entered.
    pub difference: String,
    /// Expected standard deviation, as entered.
    pub sigma: String,
    /// Significance level, as entered.
    pub alpha: String,
    /// Target power, as entered.
    pub target: String,
    /// Sample size, as entered.
    pub n: String,
    /// Half-width, as entered.
    pub half_width: String,
    /// Two-sided t test.
    pub two_sided: bool,
    /// Raw explicit-design assumptions, including incomplete edits.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub advanced: Option<PowerAdvancedSelection>,
    /// Raw simulation assumptions, independent of the successful request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub simulation: Option<PowerSimulationSelection>,
}

macro_rules! family_storage {
    ($state:ident, $record:ident, $selection:ty, $input:ty, $output:ty) => {
        /// Immutable successful calculation, bound to a historical data revision.
        #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
        #[serde(rename_all = "camelCase")]
        #[ts(export)]
        pub struct $record {
            /// Stable analysis identifier, also usable by review comments.
            pub id: StableId,
            /// Creation time in RFC 3339 form.
            pub created_at: String,
            /// Revision of the experiment at calculation time.
            pub revision_id: StableId,
            /// Versioned opaque input signature; never a rounded output.
            pub signature: String,
            /// Exact input accepted by the engine.
            pub input: $input,
            /// Scientific result including method/engine provenance.
            pub result: $output,
        }

        /// Current editable selection and immutable calculation history.
        #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
        #[serde(rename_all = "camelCase")]
        #[ts(export)]
        pub struct $state {
            /// Selection being edited; it may differ from the latest calculation.
            pub selection: $selection,
            /// Old records remain available to historical references and comments.
            #[serde(default)]
            pub records: Vec<$record>,
        }
    };
}

family_storage!(
    SavedMixture,
    MixtureRecord,
    MixtureSelection,
    MixtureInputSnapshot,
    MixtureAnalysis
);
family_storage!(
    SavedRepeated,
    RepeatedRecord,
    RepeatedSelection,
    RepeatedInputSnapshot,
    RepeatedOutput
);
family_storage!(
    SavedNonlinear,
    NonlinearRecord,
    NonlinearSelection,
    NonlinearInputSnapshot,
    NonlinearResult
);
family_storage!(
    SavedPower,
    PowerRecord,
    PowerSelection,
    PowerRequest,
    PowerResult
);

/// Raw editable advanced model options; no statistical calculation in the interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedAdvancedSelection {
    /// Covariance structure.
    pub covariance: desvtag_core::models::mixed::MixedCovariance,
    /// None uses the dedicated time column.
    pub time_source: Option<StableId>,
    /// Include time values for covariance, fixed effects and profiles.
    pub time_enabled: bool,
    /// Semicolon-separated explicit categorical occasion order; empty uses numeric indices.
    pub occasion_order: String,
    /// Time contribution to fixed effects.
    pub time_effect: desvtag_core::models::mixed::MixedTimeEffect,
    /// Coding of fixed categorical factors.
    pub coding: desvtag_core::models::terms::CategoricalCoding,
    /// Explicit fixed interactions.
    pub interactions: Vec<Vec<StableId>>,
    /// EMM factors.
    pub marginal_factors: Vec<StableId>,
    /// Include EMM for categorical time.
    pub marginal_time: bool,
    /// Adjustment per EMM family.
    pub adjustment: desvtag_core::models::mixed::MixedAdjustment,
    /// Raw reference values; empty selects Rust-computed means.
    pub references: Vec<MixedReferenceSelection>,
}
/// Incomplete text remains editable without falsifying a past result.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedReferenceSelection {
    /// Covariate.
    pub factor_id: StableId,
    /// Raw numeric input.
    pub value: String,
}

/// Editable fixed-design power fields. Only the selected design consumes its own fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerAdvancedSelection {
    /// Predictor rows separated by newlines; cells by semicolon or tab.
    pub predictors: String,
    /// Expected slopes separated by semicolons.
    pub coefficients: String,
    /// Contrast weights.
    pub weights: String,
    /// Integer group allocation.
    pub allocation: String,
    /// Number of two-level factors.
    pub factor_count: String,
    /// Semicolon-separated terms, with one-based factor numbers joined by *.
    pub terms: String,
    /// Expected effects, one per term.
    pub effects: String,
    /// Selected zero-based term index.
    pub target_term: String,
}
/// Raw Monte Carlo controls; malformed edits must survive recovery without replacing results.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerSimulationSelection {
    /// Seed as entered.
    pub seed: String,
    /// Number of simulated studies as entered.
    pub replications: String,
}
