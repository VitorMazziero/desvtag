//! Escrita de planilhas XLSX (OOXML mínimo) para exportar tabelas (U16, ET09).
//!
//! Política:
//! - números são gravados como **números** (representação decimal mais curta que os reproduz);
//!   células vazias (estados indefinidos) ficam vazias, nunca `0` nem `NaN`;
//! - texto é gravado como *inline string* — **nenhuma célula é fórmula**; texto que começa por `=`,
//!   `+`, `-`, `@`, tabulação ou retorno de carro recebe o estilo `quotePrefix`, de modo que o Excel e o
//!   LibreOffice o mantenham como texto mesmo se o usuário o editar;
//! - a primeira linha de cada planilha pode ser destacada em negrito;
//! - nomes de planilha seguem as regras do Excel (até 31 caracteres, sem `[]:*?/\`, únicos sem
//!   distinção de caixa).

use std::collections::HashSet;
use std::fmt::Write as _;
use std::io::{Cursor, Write};

use optima_core::validation::{Issue, Severity};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

/// Maior número de linhas de uma planilha do Excel.
pub const MAX_ROWS: usize = 1_048_576;
/// Maior número de colunas de uma planilha do Excel.
pub const MAX_COLUMNS: usize = 16_384;

/// Célula exportada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
#[ts(export)]
pub enum ExportCell {
    /// Número finito.
    Number(f64),
    /// Texto.
    Text(String),
    /// Célula vazia (por exemplo, resultado indefinido).
    Empty,
}

/// Planilha exportada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExportSheet {
    /// Nome (até 31 caracteres).
    pub name: String,
    /// Linhas; a primeira é o cabeçalho (em negrito).
    pub rows: Vec<Vec<ExportCell>>,
}

/// Pasta de trabalho exportada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExportWorkbook {
    /// Planilhas, na ordem.
    pub sheets: Vec<ExportSheet>,
}

fn error(code: &str) -> Vec<Issue> {
    vec![Issue::new(code, Severity::Error)]
}

fn column_name(mut index: usize) -> String {
    let mut name = String::new();
    loop {
        name.insert(0, char::from(b'A' + u8::try_from(index % 26).unwrap_or(0)));
        if index < 26 {
            break;
        }
        index = index / 26 - 1;
    }
    name
}

fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\t' | '\n' | '\r' => out.push(c),
            c if (c as u32) < 0x20 || c == '\u{FFFE}' || c == '\u{FFFF}' => {}
            c => out.push(c),
        }
    }
    out
}

/// Texto que um programa de planilhas poderia interpretar como fórmula.
#[must_use]
pub fn looks_like_formula(text: &str) -> bool {
    text.starts_with(['=', '+', '-', '@', '\t', '\r'])
}

fn valid_sheet_name(name: &str) -> bool {
    let count = name.chars().count();
    (1..=31).contains(&count)
        && !name.contains(['[', ']', ':', '*', '?', '/', '\\'])
        && !name.starts_with('\'')
        && !name.ends_with('\'')
}

/// Largura de cada coluna pelo conteúdo (cabeçalho e até 200 linhas), entre 8 e 50 caracteres.
fn columns_xml(sheet: &ExportSheet) -> String {
    let width = sheet.rows.iter().map(Vec::len).max().unwrap_or(0);
    if width == 0 {
        return String::new();
    }
    let mut xml = String::from("<cols>");
    for c in 0..width {
        let longest = sheet
            .rows
            .iter()
            .take(200)
            .filter_map(|row| row.get(c))
            .map(|cell| match cell {
                ExportCell::Empty => 0,
                ExportCell::Number(v) => v.to_string().chars().count().min(14),
                ExportCell::Text(t) => t.chars().count(),
            })
            .max()
            .unwrap_or(0);
        let chars = (longest + 2).clamp(8, 50);
        let _ = write!(
            xml,
            "<col min=\"{n}\" max=\"{n}\" width=\"{chars}\" customWidth=\"1\"/>",
            n = c + 1
        );
    }
    xml.push_str("</cols>");
    xml
}

fn sheet_xml(sheet: &ExportSheet) -> Result<String, Vec<Issue>> {
    if sheet.rows.len() > MAX_ROWS || sheet.rows.iter().any(|r| r.len() > MAX_COLUMNS) {
        return Err(error("export.too_large"));
    }
    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n\
         <worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">",
    );
    xml.push_str(&columns_xml(sheet));
    xml.push_str("<sheetData>");
    for (r, row) in sheet.rows.iter().enumerate() {
        let _ = write!(xml, "<row r=\"{}\">", r + 1);
        for (c, cell) in row.iter().enumerate() {
            let reference = format!("{}{}", column_name(c), r + 1);
            let header = if r == 0 { " s=\"1\"" } else { "" };
            match cell {
                ExportCell::Empty => {}
                ExportCell::Number(v) => {
                    if !v.is_finite() {
                        return Err(error("export.non_finite"));
                    }
                    let _ = write!(xml, "<c r=\"{reference}\"{header}><v>{v}</v></c>");
                }
                ExportCell::Text(t) => {
                    let style = if looks_like_formula(t) {
                        " s=\"2\""
                    } else {
                        header
                    };
                    let _ = write!(
                        xml,
                        "<c r=\"{reference}\" t=\"inlineStr\"{style}><is><t xml:space=\"preserve\">{}</t></is></c>",
                        escape(t)
                    );
                }
            }
        }
        xml.push_str("</row>");
    }
    xml.push_str("</sheetData></worksheet>");
    Ok(xml)
}

const CONTENT_TYPES_HEAD: &str = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n\
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">\
<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>\
<Default Extension=\"xml\" ContentType=\"application/xml\"/>\
<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>\
<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>";

const STYLES: &str = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n\
<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\
<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>\
<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills>\
<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\
<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>\
<cellXfs count=\"3\">\
<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>\
<xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/>\
<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" quotePrefix=\"1\"/>\
</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";

/// Escreve a pasta de trabalho como bytes XLSX.
///
/// # Errors
/// `export.no_sheets`, `export.invalid_sheet_name`, `export.duplicate_sheet_name`,
/// `export.too_large`, `export.non_finite`, `export.write_failed`.
pub fn write_xlsx(book: &ExportWorkbook) -> Result<Vec<u8>, Vec<Issue>> {
    if book.sheets.is_empty() {
        return Err(error("export.no_sheets"));
    }
    let mut seen = HashSet::new();
    for sheet in &book.sheets {
        if !valid_sheet_name(&sheet.name) {
            return Err(vec![
                Issue::new("export.invalid_sheet_name", Severity::Error)
                    .with_param("name", &sheet.name),
            ]);
        }
        if !seen.insert(sheet.name.to_lowercase()) {
            return Err(vec![
                Issue::new("export.duplicate_sheet_name", Severity::Error)
                    .with_param("name", &sheet.name),
            ]);
        }
    }
    fn failed<E>(_: E) -> Vec<Issue> {
        error("export.write_failed")
    }
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    // Carimbo, sistema de origem e permissões fixos: a mesma tabela gera os mesmos bytes em qualquer plataforma.
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .last_modified_time(zip::DateTime::default())
        .system(zip::System::Unix)
        .unix_permissions(0o644);
    let mut put = |name: &str, content: &str| -> Result<(), Vec<Issue>> {
        writer.start_file(name, options).map_err(failed)?;
        writer.write_all(content.as_bytes()).map_err(failed)?;
        Ok(())
    };

    let mut content_types = String::from(CONTENT_TYPES_HEAD);
    let mut workbook = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n\
         <workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" \
         xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>",
    );
    let mut rels = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n\
         <Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">",
    );
    for (i, sheet) in book.sheets.iter().enumerate() {
        let n = i + 1;
        let _ = write!(
            content_types,
            "<Override PartName=\"/xl/worksheets/sheet{n}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>"
        );
        let _ = write!(
            workbook,
            "<sheet name=\"{}\" sheetId=\"{n}\" r:id=\"rId{n}\"/>",
            escape(&sheet.name)
        );
        let _ = write!(
            rels,
            "<Relationship Id=\"rId{n}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{n}.xml\"/>"
        );
        put(&format!("xl/worksheets/sheet{n}.xml"), &sheet_xml(sheet)?)?;
    }
    let styles_id = book.sheets.len() + 1;
    let _ = write!(
        rels,
        "<Relationship Id=\"rId{styles_id}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>"
    );
    content_types.push_str("</Types>");
    workbook.push_str("</sheets></workbook>");
    put("[Content_Types].xml", &content_types)?;
    put(
        "_rels/.rels",
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n\
         <Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\
         <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>",
    )?;
    put("xl/workbook.xml", &workbook)?;
    put("xl/_rels/workbook.xml.rels", &rels)?;
    put("xl/styles.xml", STYLES)?;
    let cursor = writer.finish().map_err(failed)?;
    Ok(cursor.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::xlsx::read_xlsx;

    fn text(s: &str) -> ExportCell {
        ExportCell::Text(s.to_string())
    }

    #[test]
    fn column_widths_follow_the_content_within_limits() {
        let sheet = ExportSheet {
            name: "A".to_string(),
            rows: vec![
                vec![
                    text("a"),
                    text("a very long header that exceeds the maximum width of fifty characters"),
                ],
                vec![ExportCell::Number(1.0), ExportCell::Empty],
            ],
        };
        let xml = sheet_xml(&sheet).unwrap_or_default();
        assert!(xml.contains("<col min=\"1\" max=\"1\" width=\"8\" customWidth=\"1\"/>"));
        assert!(xml.contains("<col min=\"2\" max=\"2\" width=\"50\" customWidth=\"1\"/>"));
    }

    fn sample() -> ExportWorkbook {
        ExportWorkbook {
            sheets: vec![
                ExportSheet {
                    name: "Coeficientes".into(),
                    rows: vec![
                        vec![text("termo"), text("estimativa"), text("p")],
                        vec![
                            text("Temperatura²"),
                            ExportCell::Number(5.015_8),
                            ExportCell::Number(1.5e-7),
                        ],
                        vec![
                            text("ação & <b>"),
                            ExportCell::Number(-0.25),
                            ExportCell::Empty,
                        ],
                        vec![
                            text("=1+1"),
                            ExportCell::Number(1e21),
                            ExportCell::Number(0.1),
                        ],
                    ],
                },
                ExportSheet {
                    name: "Proveniência".into(),
                    rows: vec![vec![text("método"), text("response_surface")]],
                },
            ],
        }
    }

    #[test]
    fn round_trips_through_the_project_reader_keeping_text_numbers_and_empties() {
        let bytes = write_xlsx(&sample()).unwrap_or_default();
        let first = read_xlsx(&bytes, None).unwrap_or_else(|_| unreachable!());
        assert_eq!(first.sheets, ["Coeficientes", "Proveniência"]);
        assert_eq!(first.rows[0], ["termo", "estimativa", "p"]);
        assert_eq!(first.rows[1], ["Temperatura²", "5.0158", "0.00000015"]);
        assert_eq!(first.rows[2], ["ação & <b>", "-0.25", ""]);
        // Fórmula nunca executada: o texto continua `=1+1`.
        assert_eq!(first.rows[3][0], "=1+1");
        let second = read_xlsx(&bytes, Some("Proveniência")).unwrap_or_else(|_| unreachable!());
        assert_eq!(second.rows[0], ["método", "response_surface"]);
    }

    #[test]
    fn formula_like_text_gets_the_quote_prefix_style_and_numbers_stay_numbers() {
        let xml = sheet_xml(&sample().sheets[0]).unwrap_or_default();
        assert!(xml.contains("r=\"A4\" t=\"inlineStr\" s=\"2\""), "{xml}");
        assert!(xml.contains("<c r=\"B2\"><v>5.0158</v></c>"));
        assert!(
            xml.contains("r=\"A1\" t=\"inlineStr\" s=\"1\""),
            "cabeçalho em negrito"
        );
        for dangerous in ["=SUM(A1)", "+1", "-1", "@x", "\tx", "\rx"] {
            assert!(looks_like_formula(dangerous), "{dangerous:?}");
        }
        assert!(!looks_like_formula("texto normal"));
        assert!(!looks_like_formula(""));
    }

    #[test]
    fn column_names_follow_excel() {
        assert_eq!(
            [0, 1, 25, 26, 27, 51, 52, 701, 702].map(column_name),
            ["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]
        );
    }

    #[test]
    fn invalid_workbooks_are_refused() {
        let code = |book: &ExportWorkbook| write_xlsx(book).err().map(|i| i[0].code.clone());
        assert_eq!(
            code(&ExportWorkbook { sheets: vec![] }).as_deref(),
            Some("export.no_sheets")
        );
        let named = |name: &str| ExportWorkbook {
            sheets: vec![ExportSheet {
                name: name.into(),
                rows: vec![],
            }],
        };
        for bad in ["", "a/b", "x:y", "[z]", &"n".repeat(32), "'abc"] {
            assert_eq!(
                code(&named(bad)).as_deref(),
                Some("export.invalid_sheet_name"),
                "{bad:?}"
            );
        }
        let mut dup = sample();
        dup.sheets[1].name = "COEFICIENTES".into();
        assert_eq!(code(&dup).as_deref(), Some("export.duplicate_sheet_name"));
        let mut nan = sample();
        nan.sheets[0].rows[1][1] = ExportCell::Number(f64::NAN);
        assert_eq!(code(&nan).as_deref(), Some("export.non_finite"));
    }

    #[test]
    fn json_cells_are_numbers_text_or_null() {
        let cells: Vec<ExportCell> =
            serde_json::from_str(r#"[1.5, "a", null]"#).unwrap_or_default();
        assert_eq!(
            cells,
            [ExportCell::Number(1.5), text("a"), ExportCell::Empty]
        );
    }
}
