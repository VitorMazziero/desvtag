//! Documento do projeto EnziTAG Optima (P01–P03) e leitura de planilhas.
//!
//! - [`document`], [`experiment`], [`revision`], [`analysis`]: o documento com vários
//!   experimentos, revisões imutáveis dos dados e análises vinculadas.
//! - [`archive`], [`manifest`], [`integrity`], [`migrations`]: o formato `.enzitag`
//!   (ZIP com manifesto e SHA-256) em bytes, com limites de leitura e migrações.
//! - [`xlsx`]: leitura de **valores armazenados** de planilhas XLSX para texto
//!   (fórmulas nunca são executadas).
//!
//! Este pacote nunca abre arquivos do sistema: recebe e devolve bytes.

pub mod analysis;
pub mod archive;
pub mod comment;
pub mod confirmation;
pub mod document;
pub mod experiment;
pub mod figure_style;
pub mod integrity;
pub mod manifest;
pub mod migrations;
pub mod revision;
pub mod xlsx;
pub mod xlsx_writer;

pub use analysis::{AnalysisOptions, AnalysisRecord, AnalysisResult};
pub use comment::{Comment, CommentReply, CommentTarget, CommentTargetKind};
pub use confirmation::{ConfirmationPlan, ConfirmationPrediction, ExperimentOrigin};
pub use document::{EntryPath, Experiment, ProjectDocument, SCHEMA_VERSION};
pub use experiment::{ExperimentData, FactorSpec, ResponseSpec, RowRecord};
pub use figure_style::{FigureAnnotation, FigureStyle};
pub use revision::{Revision, RevisionReason};
