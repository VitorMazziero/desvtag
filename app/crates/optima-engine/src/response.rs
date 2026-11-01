//! Respostas do motor à interface.

use std::collections::BTreeMap;

use optima_core::comparisons::OneWayResult;
use optima_core::comparisons::procedures::ProcedureResult;
use optima_core::descriptive::DescriptiveResult;
use optima_core::designs::analysis::DesignAnalysisResult;
use optima_core::designs::completely_randomized::GeneratedCrd;
use optima_core::designs::recommend::DesignOptions;
use optima_core::designs::spec::{GeneratedDesign, RunCount};
use optima_core::distributions::DistributionResult;
use optima_core::models::LinearFit;
use optima_core::optimization::{Evaluation, OptimizationResult};
use optima_core::registry::Capabilities;
use optima_core::surface::{SurfaceGrid, SurfaceResult};
use optima_core::validation::Issue;
use optima_project::ProjectDocument;
use optima_project::xlsx::SheetData;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Código de erro do protocolo (a interface localiza a mensagem).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ErrorCode {
    /// O texto recebido não é uma solicitação válida.
    InvalidRequest,
    /// A versão do protocolo do cliente difere da do motor.
    UnsupportedProtocolVersion,
    /// Os dados ou a configuração não permitem o cálculo; veja `issues`.
    InvalidInput,
    /// O arquivo de projeto não pôde ser lido ou escrito; veja `issues`.
    InvalidProject,
    /// O arquivo importado não pôde ser lido; veja `issues`.
    InvalidImport,
}

/// Erro codificado, com parâmetros para a mensagem localizada.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineError {
    /// Código estável.
    pub code: ErrorCode,
    /// Parâmetros (por exemplo, versões esperada e recebida).
    pub params: BTreeMap<String, String>,
    /// Diagnósticos que bloqueiam o cálculo (`invalidInput`); vazio nos demais erros.
    pub issues: Vec<Issue>,
}

/// Resultado de `engine.info`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineInfo {
    /// Versão do motor (igual à do aplicativo).
    pub engine_version: String,
    /// Versão do protocolo.
    pub protocol_version: u32,
    /// Versão do esquema do projeto.
    pub project_schema_version: u32,
    /// Capacidades.
    pub capabilities: Capabilities,
}

/// Resultado de uma operação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum OperationResult {
    /// Resultado de `engine.info`.
    EngineInfo(EngineInfo),
    /// Resultado de `descriptive.summarize`.
    DescriptiveSummarize(DescriptiveResult),
    /// Opções de planejamento.
    DesignRecommend(DesignOptions),
    /// Contagem de ensaios.
    DesignCount(RunCount),
    /// Planejamento gerado.
    DesignGenerate(Box<GeneratedDesign>),
    /// DIC gerado.
    DesignCrdGenerate(Box<GeneratedCrd>),
    /// Análise do planejamento.
    DesignAnalyze(Box<DesignAnalysisResult>),
    /// Análise da superfície de resposta.
    SurfaceAnalyze(Box<SurfaceResult>),
    /// Malha da superfície.
    SurfaceGrid(Box<SurfaceGrid>),
    /// Arquivo XLSX escrito (`export.xlsx`).
    ExportXlsx(ProjectEncodeResult),
    /// Resultado da otimização.
    OptimizationRun(Box<OptimizationResult>),
    /// Previsões em condições dadas.
    OptimizationEvaluate(Box<Evaluation>),
    /// Malha de desejabilidade.
    OptimizationGrid(Box<SurfaceGrid>),
    /// Resultado da comparação de tratamentos de um fator.
    ComparisonOneWay(Box<OneWayResult>),
    /// Resultado de um procedimento de comparação múltipla.
    ComparisonProcedure(Box<ProcedureResult>),
    /// Valores de uma função de distribuição.
    DistributionEvaluate(DistributionResult),
    /// Ajuste de modelo linear.
    ModelFitLinear(Box<LinearFit>),
    /// Resultado de `project.encode`.
    ProjectEncode(ProjectEncodeResult),
    /// Resultado de `project.decode`.
    ProjectDecode(ProjectDecodeResult),
    /// Resultado de `import.xlsx`.
    ImportXlsx(SheetData),
}

/// Bytes `.enzitag` produzidos.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProjectEncodeResult {
    /// Conteúdo do arquivo em base64.
    pub bytes_base64: String,
    /// Tamanho em bytes.
    pub size: u64,
    /// SHA-256 hexadecimal do arquivo inteiro.
    pub sha256: String,
}

/// Projeto lido.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProjectDecodeResult {
    /// Documento no esquema atual.
    pub document: ProjectDocument,
    /// Versão de esquema de origem, se houve migração.
    pub migrated_from: Option<u32>,
    /// Avisos que não impediram a abertura.
    pub warnings: Vec<Issue>,
}

/// Sucesso ou falha.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "status", rename_all = "camelCase")]
#[ts(export)]
pub enum Outcome {
    /// Operação concluída.
    Ok {
        /// Resultado.
        result: OperationResult,
    },
    /// Operação recusada ou falha.
    Error {
        /// Erro codificado.
        error: EngineError,
    },
}

/// Resposta: sempre carrega a versão do protocolo do motor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineResponse {
    /// Versão do protocolo do motor.
    pub protocol_version: u32,
    /// Identificador da tarefa da solicitação; `null` se ela não pôde ser lida.
    pub task_id: Option<String>,
    /// Desfecho.
    pub outcome: Outcome,
}
