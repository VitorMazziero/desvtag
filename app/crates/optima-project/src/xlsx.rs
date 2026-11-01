//! Leitura de planilhas XLSX para uma grade de **texto** (U05).
//!
//! Política explícita:
//! - Fórmulas **nunca são executadas**: lê-se somente o valor armazenado pelo programa
//!   que salvou a planilha. Fórmula sem valor armazenado vira célula vazia e é contada.
//! - Números viram o texto decimal mais curto que os reproduz (`1.5`, `10`); a
//!   interpretação como número ocorre depois, com as regras de entrada da interface.
//! - Datas e horas viram o número de série do Excel (texto) e são contadas, porque o
//!   aplicativo não as interpreta.
//! - Células com erro (`#DIV/0!` etc.) viram vazias e são contadas.
//! - Limite de células: protege a memória (`import.too_large`).

use std::io::Cursor;

use calamine::{Data, Reader, Xlsx, open_workbook_from_rs};
use optima_core::validation::{Issue, Severity};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Número máximo de células lidas de uma planilha.
pub const MAX_CELLS: usize = 2_000_000;

/// Conteúdo lido de uma planilha.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SheetData {
    /// Nomes de todas as planilhas do arquivo, na ordem do arquivo.
    pub sheets: Vec<String>,
    /// Planilha lida.
    pub selected: String,
    /// Linhas × colunas, em texto; células vazias são `""`.
    pub rows: Vec<Vec<String>>,
    /// Avisos (`import.*`) com contagens.
    pub warnings: Vec<Issue>,
}

fn error(code: &str) -> Vec<Issue> {
    vec![Issue::new(code, Severity::Error)]
}

/// Lê uma planilha de bytes XLSX. `sheet = None` escolhe a primeira.
///
/// # Errors
/// `import.not_xlsx`, `import.no_sheets`, `import.sheet_not_found`, `import.too_large`.
pub fn read_xlsx(bytes: &[u8], sheet: Option<&str>) -> Result<SheetData, Vec<Issue>> {
    let mut workbook: Xlsx<_> =
        open_workbook_from_rs(Cursor::new(bytes)).map_err(|_| error("import.not_xlsx"))?;
    let sheets = workbook.sheet_names();
    let selected = match sheet {
        Some(name) if sheets.iter().any(|s| s == name) => name.to_string(),
        Some(name) => {
            return Err(vec![
                Issue::new("import.sheet_not_found", Severity::Error).with_param("sheet", &name),
            ]);
        }
        None => sheets
            .first()
            .cloned()
            .ok_or_else(|| error("import.no_sheets"))?,
    };
    let range = workbook
        .worksheet_range(&selected)
        .map_err(|_| error("import.not_xlsx"))?;
    let (height, width) = range.get_size();
    if height.saturating_mul(width) > MAX_CELLS {
        return Err(vec![
            Issue::new("import.too_large", Severity::Error)
                .with_param("cells", &height.saturating_mul(width))
                .with_param("max", &MAX_CELLS),
        ]);
    }

    let (mut dates, mut errors) = (0_usize, 0_usize);
    let rows: Vec<Vec<String>> = range
        .rows()
        .map(|row| {
            row.iter()
                .map(|cell| match cell {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    Data::Bool(b) => b.to_string(),
                    Data::DateTime(d) => {
                        dates += 1;
                        d.as_f64().to_string()
                    }
                    Data::DateTimeIso(s) | Data::DurationIso(s) => {
                        dates += 1;
                        s.clone()
                    }
                    Data::Error(_) => {
                        errors += 1;
                        String::new()
                    }
                })
                .collect()
        })
        .collect();

    // Fórmulas: o valor armazenado já está em `rows`; contam-se as sem valor armazenado.
    let formulas_without_value = workbook
        .worksheet_formula(&selected)
        .map(|formulas| {
            let (start_row, start_col) = formulas.start().unwrap_or((0, 0));
            formulas
                .cells()
                .filter(|(_, _, formula)| !formula.is_empty())
                .filter(|(r, c, _)| {
                    let position = (start_row + *r as u32, start_col + *c as u32);
                    range
                        .get_value(position)
                        .is_none_or(|d| matches!(d, Data::Empty))
                })
                .count()
        })
        .unwrap_or(0);

    let mut warnings = Vec::new();
    if formulas_without_value > 0 {
        warnings.push(
            Issue::new("import.formula_without_value", Severity::Warning)
                .with_param("count", &formulas_without_value),
        );
    }
    if dates > 0 {
        warnings.push(
            Issue::new("import.dates_as_serial", Severity::Warning).with_param("count", &dates),
        );
    }
    if errors > 0 {
        warnings
            .push(Issue::new("import.error_cells", Severity::Warning).with_param("count", &errors));
    }
    Ok(SheetData {
        sheets,
        selected,
        rows,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_xlsx_bytes() {
        assert_eq!(
            read_xlsx(b"hello", None).err().map(|v| v[0].code.clone()),
            Some("import.not_xlsx".into())
        );
        assert_eq!(
            read_xlsx(&[], None).err().map(|v| v[0].code.clone()),
            Some("import.not_xlsx".into())
        );
    }
}
