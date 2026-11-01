//! C17 — otimização de uma ou várias respostas por desejabilidade (ET08).
//!
//! - [`objective`]: objetivos por resposta, limites obrigatórios, domínio, opções de busca e pedido;
//! - [`desirability`]: desejabilidade individual (Derringer e Suich) e global (média geométrica
//!   ponderada);
//! - [`constraints`]: modelos ajustados, domínio de busca e violações (limites das respostas e
//!   extrapolação oculta);
//! - [`search`]: hipercubo latino com semente + Nelder–Mead com projeção nos limites;
//! - [`candidates`]: agrupamento, ordenação e previsões com incerteza;
//! - [`optimize`]: orquestra o ajuste dos modelos, a busca e o relatório de convergência;
//! - [`grid`]: desejabilidade global sobre dois fatores (gráfico);
//! - [`evaluate`]: avaliação de condições dadas (proposta de confirmação).
//!
//! Especificações em `docs/metodos/desejabilidade.md` e `busca-otimizacao.md`. A busca é **local e
//! com vários inícios**: nada aqui afirma ótimo global.

pub mod candidates;
pub mod constraints;
pub mod desirability;
pub mod evaluate;
pub mod grid;
pub mod objective;
pub mod optimize;
pub mod search;

pub use evaluate::{EvaluateRequest, Evaluation, evaluate_points};
pub use grid::{OptimizationGridRequest, desirability_grid};
pub use objective::{
    DomainSpec, FactorBounds, Goal, OptimizationRequest, OptimizationSetup, ResponseGoal,
    ResponseLimit, SearchOptions,
};
pub use optimize::{OptimizationResult, optimize};
