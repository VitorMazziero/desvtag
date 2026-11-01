//! Solicitações da interface ao motor.

use optima_core::comparisons::OneWayRequest;
use optima_core::comparisons::procedures::ProcedureRequest;
use optima_core::descriptive::DescriptiveRequest;
use optima_core::designs::analysis::DesignAnalysisRequest;
use optima_core::designs::completely_randomized::CrdSpec;
use optima_core::designs::spec::DesignSpec;
use optima_core::distributions::DistributionRequest;
use optima_core::models::LinearModelRequest;
use optima_core::models::factorial_anova::FactorialRequest;
use optima_core::optimization::{EvaluateRequest, OptimizationGridRequest, OptimizationRequest};
use optima_core::surface::{GridRequest, SurfaceRequest};
use optima_project::ProjectDocument;
use optima_project::xlsx_writer::ExportWorkbook;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Versão do protocolo interface↔motor. Independente da versão do aplicativo
/// e do esquema do projeto (DT-0002). Incrementar em mudança incompatível.
pub const PROTOCOL_VERSION: u32 = 1;

/// Operação solicitada. Cada etapa acrescenta suas variantes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum Operation {
    /// Versões e capacidades do motor (`engine.info`).
    EngineInfo,
    /// Resumo descritivo de uma resposta, geral e por grupo (`descriptive.summarize`).
    DescriptiveSummarize(DescriptiveRequest),
    /// Opções de planejamento para um número de fatores e um orçamento de ensaios (`design.recommend`).
    DesignRecommend(DesignRecommendRequest),
    /// Conta os ensaios de um planejamento de dois níveis sem gerá-lo (`design.count`).
    DesignCount(DesignSpec),
    /// Gera um planejamento de dois níveis (`design.generate`).
    DesignGenerate(DesignSpec),
    /// Gera um delineamento inteiramente casualizado de um fator categórico (`design.crdGenerate`).
    DesignCrdGenerate(CrdSpec),
    /// Analisa um planejamento de dois níveis: efeitos, curvatura, Lenth e gráficos (`design.analyze`).
    DesignAnalyze(Box<DesignAnalysisRequest>),
    /// Analisa uma superfície de resposta de segunda ordem (`surface.analyze`).
    SurfaceAnalyze(Box<SurfaceRequest>),
    /// Malha de predições e curvas de nível da superfície (`surface.grid`).
    SurfaceGrid(Box<GridRequest>),
    /// Escreve tabelas como arquivo XLSX (`export.xlsx`).
    ExportXlsx(ExportWorkbook),
    /// Otimização por desejabilidade de uma ou várias respostas (`optimization.run`).
    OptimizationRun(Box<OptimizationRequest>),
    /// Previsões e desejabilidade em condições dadas (`optimization.evaluate`).
    OptimizationEvaluate(Box<EvaluateRequest>),
    /// Desejabilidade global sobre dois fatores (`optimization.grid`).
    OptimizationGrid(Box<OptimizationGridRequest>),
    /// Comparação de tratamentos de um fator: ANOVA, Tukey, letras e diagnósticos (`comparison.oneWay`).
    ComparisonOneWay(OneWayRequest),
    /// Procedimentos de comparação múltipla: Games–Howell, Dunnett, Bonferroni, Holm e Kruskal–Wallis/Dunn (`comparison.procedure`).
    ComparisonProcedure(ProcedureRequest),
    /// ANOVA multifatorial com blocos, médias marginais e contrastes (`anova.factorial`).
    AnovaFactorial(Box<FactorialRequest>),
    /// Avaliação em lote de `cdf`, cauda superior e quantis (`distribution.evaluate`).
    DistributionEvaluate(DistributionRequest),
    /// Ajuste de modelo linear com ANOVA, intervalos e diagnósticos (`model.fitLinear`).
    ModelFitLinear(Box<LinearModelRequest>),
    /// Codifica um documento de projeto em bytes `.enzitag` (`project.encode`).
    ProjectEncode(ProjectEncodeRequest),
    /// Lê bytes `.enzitag` e devolve o documento no esquema atual (`project.decode`).
    ProjectDecode(BytesRequest),
    /// Lê os valores armazenados de uma planilha XLSX como texto (`import.xlsx`).
    ImportXlsx(ImportXlsxRequest),
}

/// Pedido de opções de planejamento.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignRecommendRequest {
    /// Número de fatores.
    pub factors: u32,
    /// Orçamento de ensaios do planejamento básico, se houver.
    pub max_runs: Option<u32>,
}

/// Pedido de codificação de projeto.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProjectEncodeRequest {
    /// Documento a codificar.
    pub document: ProjectDocument,
}

/// Pedido que carrega bytes (em base64, para trafegar em JSON).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BytesRequest {
    /// Conteúdo do arquivo em base64.
    pub bytes_base64: String,
}

/// Pedido de leitura de planilha.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ImportXlsxRequest {
    /// Conteúdo do arquivo em base64.
    pub bytes_base64: String,
    /// Planilha a ler; ausente: a primeira.
    pub sheet: Option<String>,
}

/// Solicitação com identificador de tarefa. A interface descarta respostas
/// cujo `task_id` não seja o mais recente da sua categoria.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineRequest {
    /// Versão do protocolo usada pelo cliente.
    pub protocol_version: u32,
    /// Identificador da tarefa, devolvido na resposta.
    pub task_id: String,
    /// Operação.
    pub operation: Operation,
}
