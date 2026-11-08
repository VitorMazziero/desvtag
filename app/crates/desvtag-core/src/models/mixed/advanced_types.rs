//! Contratos aditivos da versão científica 2 das medidas repetidas.
use crate::{
    descriptive::Stat,
    domain::StableId,
    models::terms::{CategoricalCoding, TermSpec},
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Estrutura marginal dentro de cada unidade.
pub enum MixedCovariance {
    /// Intercepto aleatório + erros independentes.
    CompoundSymmetry,
    /// Intercepto aleatório + erros AR(1).
    Ar1,
    /// Matriz marginal completa, sem componente aleatório redundante.
    Unstructured,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Papel do tempo nos efeitos fixos, independente da covariância.
pub enum MixedTimeEffect {
    /// Tempo não entra nos efeitos fixos.
    #[default]
    None,
    /// Inclinação linear por índice temporal.
    Numeric,
    /// Média própria por ocasião.
    Categorical,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Ajuste da família de diferenças de médias marginais.
pub enum MixedAdjustment {
    /// Bonferroni para p e intervalos simultâneos.
    #[default]
    Bonferroni,
    /// Holm para p; IC Bonferroni identificado separadamente.
    Holm,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Valor de referência de uma covariável.
pub struct MixedReference {
    /// Fator.
    pub factor_id: StableId,
    /// Valor explicitamente escolhido.
    pub value: f64,
}
/// Rótulo humano de um índice temporal, sem alterar suas distâncias.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedTimeLabel {
    /// Índice utilizado pelo motor.
    pub index: f64,
    /// Rótulo original da ocasião.
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Configuração científica avançada (ausente no percurso v1).
pub struct AdvancedMixedSpec {
    /// Estrutura pedida, sem substituição automática.
    pub covariance: MixedCovariance,
    /// Índices/ocasiões na ordem de todas as observações da solicitação; ausências explícitas.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub times: Option<Vec<Option<f64>>>,
    /// Rótulos opcionais dos índices temporais explícitos.
    #[serde(default)]
    pub time_labels: Vec<MixedTimeLabel>,
    /// Efeito fixo adicional do tempo.
    #[serde(default)]
    pub time_effect: MixedTimeEffect,
    /// Fatores categóricos cujas EMM devem ser comparadas; vazio desativa EMM.
    #[serde(default)]
    pub marginal_factors: Vec<StableId>,
    /// Família de comparações separada para cada fator.
    #[serde(default)]
    pub adjustment: MixedAdjustment,
    /// Covariáveis sem referência explícita usam a média dos casos usados.
    #[serde(default)]
    pub references: Vec<MixedReference>,
    /// Incluir família de médias marginais do tempo categórico derivado.
    #[serde(default)]
    pub marginal_time: bool,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Parâmetro identificável da covariância.
pub struct MixedCovarianceParameter {
    /// Nome estável (unitVariance, residualVariance, rho).
    pub name: String,
    /// Estimativa.
    pub value: f64,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Teste conjunto das colunas de um termo, condicionado aos demais.
pub struct MixedTermTest {
    /// Termo e hipótese exata na codificação registrada.
    pub term: TermSpec,
    /// Colunas com coeficientes simultaneamente zero.
    pub columns: Vec<String>,
    /// Graus de liberdade do numerador.
    pub numerator_df: u32,
    /// F calculado.
    pub f_value: Stat,
    /// Graus de liberdade Fai–Cornelius.
    pub denominator_df: Stat,
    /// Valor-p superior.
    pub p_value: Stat,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Inferência de uma função linear do modelo.
pub struct MixedEstimate {
    /// Estimativa.
    pub estimate: f64,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Graus de liberdade de Satterthwaite.
    pub df: Stat,
    /// Limite inferior.
    pub ci_lower: Stat,
    /// Limite superior.
    pub ci_upper: Stat,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Média marginal estimada em um nível.
pub struct MixedMarginalMean {
    /// Fator da família.
    pub factor_id: StableId,
    /// Nível.
    pub level: String,
    /// Resultado.
    pub inference: MixedEstimate,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Diferença de EMM: primeiro menos segundo.
pub struct MixedMarginalComparison {
    /// Fator da família.
    pub factor_id: StableId,
    /// Primeiro nível.
    pub first: String,
    /// Segundo nível.
    pub second: String,
    /// Diferença com IC simultâneo Bonferroni.
    pub inference: MixedEstimate,
    /// Valor-p bilateral sem ajuste.
    pub p_value: Stat,
    /// Valor-p ajustado.
    pub adjusted_p_value: Stat,
    /// Número de diferenças na família.
    pub family_size: u32,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Ponto individual histórico, calculado no motor.
pub struct MixedProfilePoint {
    /// Observação original.
    pub observation_id: StableId,
    /// Unidade científica (rótulo conservado no projeto).
    pub unit: String,
    /// Ocasião; ausente quando não foi informada em CS.
    pub time: Option<f64>,
    /// Resposta observada.
    pub observed: f64,
    /// Predição populacional X beta.
    pub population: f64,
    /// Predição condicional ao intercepto da unidade; não aplicável em UN.
    pub conditional: Stat,
    /// Resíduo em relação à predição populacional.
    pub residual: f64,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Perfil por ocasião: mesmas condições observadas, sem imputação nem EMM implícita.
pub struct MixedMeanProfile {
    /// Ocasião.
    pub time: f64,
    /// Observações.
    pub n: u32,
    /// Unidades distintas.
    pub units: u32,
    /// Média observada.
    pub observed_mean: f64,
    /// Média modelada e IC da média, não de uma nova observação.
    pub inference: MixedEstimate,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Grade de referência efetivamente usada.
pub struct MixedReferenceGrid {
    /// Referências das covariáveis.
    pub numeric: Vec<MixedReference>,
    /// Níveis categóricos com pesos iguais.
    pub categorical: Vec<MixedReferenceLevels>,
    /// Quantas células existem na grade completa.
    pub cells: u32,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Níveis igualmente ponderados de um fator.
pub struct MixedReferenceLevels {
    /// Identificador.
    pub factor_id: StableId,
    /// Níveis usados na ordem da codificação.
    pub levels: Vec<String>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Saídas adicionais que identificam a formulação v2.
pub struct AdvancedMixedResult {
    /// Estrutura realmente ajustada.
    pub covariance: MixedCovariance,
    /// Efeito fixo temporal.
    pub time_effect: MixedTimeEffect,
    /// Codificação da hipótese, sem rótulo genérico de ANOVA tipo III.
    pub coding: CategoricalCoding,
    /// Identificador do fator temporal derivado, se presente.
    pub time_factor_id: Option<StableId>,
    /// Parâmetros de covariância identificáveis.
    pub parameters: Vec<MixedCovarianceParameter>,
    /// Ocasiões na ordem da matriz UN e dos perfis.
    pub occasions: Vec<f64>,
    /// Rótulos históricos das ocasiões, se informados.
    pub time_labels: Vec<MixedTimeLabel>,
    /// Matriz UN marginal plana, ou vazia nas estruturas parametrizadas CS/AR1.
    pub covariance_matrix: Vec<f64>,
    /// Covariância dos coeficientes, por linha.
    pub fixed_covariance: Vec<f64>,
    /// Log-verossimilhança restrita, incluindo constante (n-p)log(2 pi).
    pub reml_log_likelihood: f64,
    /// Iterações do início convergente selecionado.
    pub iterations: u32,
    /// Norma máxima do gradiente na parametrização transformada.
    pub gradient_norm: f64,
    /// Informação observada positiva definida para inferência.
    pub inference_available: bool,
    /// Testes conjuntos por termo.
    pub term_tests: Vec<MixedTermTest>,
    /// Referência efetiva, também quando não se pede EMM.
    pub reference_grid: MixedReferenceGrid,
    /// EMM por fator pedido.
    pub marginal_means: Vec<MixedMarginalMean>,
    /// Diferenças dentro de cada família.
    pub comparisons: Vec<MixedMarginalComparison>,
    /// Ajuste dos valores-p (IC simultâneos sempre Bonferroni).
    pub adjustment: MixedAdjustment,
    /// Pontos individuais sem exclusões/imputações adicionais.
    pub profiles: Vec<MixedProfilePoint>,
    /// Perfis agregados nas condições observadas.
    pub mean_profiles: Vec<MixedMeanProfile>,
}
