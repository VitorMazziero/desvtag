//! Personalização gráfica por figura, guardada no projeto.
//!
//! Só apresentação: textos, destaque de letras e escala de fonte. Nenhum valor numérico do resultado
//! é alterado por estes campos. A chave de cada figura é estável (por exemplo `means`, `boxplot`,
//! `contour:A-B`); figuras sem entrada usam o padrão.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Máximo de caracteres aceitos em cada texto personalizado.
pub const MAX_TEXT: usize = 200;

/// Ajustes de uma figura. Campos ausentes mantêm o texto ou o comportamento padrão.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FigureStyle {
    /// Título da figura.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub title: Option<String>,
    /// Rótulo do eixo horizontal.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub x_label: Option<String>,
    /// Rótulo do eixo vertical.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub y_label: Option<String>,
    /// Exibir as letras de comparação (padrão: sim). Só altera a exibição: as comparações
    /// calculadas continuam na tabela de resultados.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub show_letters: Option<bool>,
    /// Escala de fonte desta figura (0,85, 1 ou 1,2); ausente: a preferência do dispositivo.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub font_scale: Option<f64>,
}

impl FigureStyle {
    /// Nenhum ajuste definido.
    #[must_use]
    pub fn is_default(&self) -> bool {
        self == &Self::default()
    }

    /// Todos os textos cabem em [`MAX_TEXT`] caracteres e a escala é uma das permitidas.
    #[must_use]
    pub fn is_valid(&self) -> bool {
        let short = |t: &Option<String>| t.as_ref().is_none_or(|s| s.chars().count() <= MAX_TEXT);
        short(&self.title)
            && short(&self.x_label)
            && short(&self.y_label)
            && self
                .font_scale
                .is_none_or(|s| [0.85, 1.0, 1.2].contains(&s))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_style_is_empty_and_serializes_to_nothing() {
        let style = FigureStyle::default();
        assert!(style.is_default());
        assert_eq!(serde_json::to_string(&style).unwrap_or_default(), "{}");
    }

    #[test]
    fn round_trips_only_the_fields_that_were_set() {
        let style = FigureStyle {
            title: Some("Atividade (U/mL)".to_string()),
            show_letters: Some(false),
            ..FigureStyle::default()
        };
        let json = serde_json::to_string(&style).unwrap_or_default();
        assert_eq!(json, r#"{"title":"Atividade (U/mL)","showLetters":false}"#);
        assert_eq!(serde_json::from_str::<FigureStyle>(&json).ok(), Some(style));
    }

    #[test]
    fn rejects_overlong_text_and_unknown_scales() {
        let long = FigureStyle {
            title: Some("x".repeat(MAX_TEXT + 1)),
            ..FigureStyle::default()
        };
        assert!(!long.is_valid());
        let scale = FigureStyle {
            font_scale: Some(3.0),
            ..FigureStyle::default()
        };
        assert!(!scale.is_valid());
        assert!(FigureStyle::default().is_valid());
    }
}
