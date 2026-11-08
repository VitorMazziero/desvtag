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
    /// Letras digitadas pelo usuário, uma por grupo na ordem de exibição; substituem as calculadas
    /// na figura e são identificadas como manuais na legenda.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub manual_letters: Option<Vec<String>>,
    /// Anotações livres (texto em posição relativa da figura).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub annotations: Option<Vec<FigureAnnotation>>,
    /// Cor principal das séries (`#RRGGBB`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub primary_color: Option<String>,
    /// Fundo da figura exportada: `white` ou `transparent`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub background: Option<String>,
    /// Família da fonte: `sans`, `serif` ou `mono`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub font_family: Option<String>,
    /// Escala do PNG exportado (1, 2 ou 3).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub export_scale: Option<f64>,
    /// Exibir as linhas de grade (padrão: sim).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub show_grid: Option<bool>,
    /// Exibir a legenda (padrão: sim).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub show_legend: Option<bool>,
}

/// Número máximo de anotações por figura.
pub const MAX_ANNOTATIONS: usize = 20;
/// Número máximo de letras manuais e de caracteres por letra.
pub const MAX_MANUAL_LETTERS: usize = 100;
/// Caracteres por letra manual.
pub const MAX_LETTER_CHARS: usize = 8;

/// Anotação livre: texto e posição relativa (`0` = esquerda/topo, `1` = direita/base).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FigureAnnotation {
    /// Texto.
    pub text: String,
    /// Posição horizontal relativa, de 0 a 1.
    pub x: f64,
    /// Posição vertical relativa, de 0 a 1.
    pub y: f64,
}

fn is_hex_color(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value[1..].chars().all(|c| c.is_ascii_hexdigit())
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
            && self.manual_letters.as_ref().is_none_or(|l| {
                l.len() <= MAX_MANUAL_LETTERS
                    && l.iter().all(|x| x.chars().count() <= MAX_LETTER_CHARS)
            })
            && self.annotations.as_ref().is_none_or(|a| {
                a.len() <= MAX_ANNOTATIONS
                    && a.iter().all(|n| {
                        n.text.chars().count() <= MAX_TEXT
                            && (0.0..=1.0).contains(&n.x)
                            && (0.0..=1.0).contains(&n.y)
                    })
            })
            && self.primary_color.as_deref().is_none_or(is_hex_color)
            && self
                .background
                .as_deref()
                .is_none_or(|b| b == "white" || b == "transparent")
            && self
                .font_family
                .as_deref()
                .is_none_or(|f| ["sans", "serif", "mono"].contains(&f))
            && self
                .export_scale
                .is_none_or(|s| [1.0, 2.0, 3.0].contains(&s))
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
    fn validates_manual_letters_annotations_and_appearance() {
        let ok = FigureStyle {
            manual_letters: Some(vec!["a".into(), "ab".into()]),
            annotations: Some(vec![FigureAnnotation {
                text: "n = 5".into(),
                x: 0.5,
                y: 0.1,
            }]),
            primary_color: Some("#0072B2".into()),
            background: Some("transparent".into()),
            font_family: Some("serif".into()),
            export_scale: Some(2.0),
            ..FigureStyle::default()
        };
        assert!(ok.is_valid());
        let bad = |f: &dyn Fn(&mut FigureStyle)| {
            let mut s = ok.clone();
            f(&mut s);
            assert!(!s.is_valid());
        };
        bad(&|s| s.primary_color = Some("azul".into()));
        bad(&|s| s.background = Some("red".into()));
        bad(&|s| s.font_family = Some("comic".into()));
        bad(&|s| s.export_scale = Some(5.0));
        bad(&|s| {
            s.annotations = Some(vec![FigureAnnotation {
                text: "x".into(),
                x: 1.5,
                y: 0.0,
            }])
        });
        bad(&|s| s.manual_letters = Some(vec!["muitoslongos".into()]));
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
