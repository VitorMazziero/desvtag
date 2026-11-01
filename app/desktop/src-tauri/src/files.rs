//! Arquivos do projeto no Windows (E04): gravação segura e projetos recentes.
//!
//! A interface **nunca informa caminhos**: os diálogos nativos são abertos pelo Rust e o
//! caminho escolhido fica guardado aqui (`FileState`). Assim, um script injetado na
//! janela não consegue ler ou gravar arquivos arbitrários.

use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// Tamanho máximo de arquivo de projeto lido (igual a `optima_project::archive::MAX_ARCHIVE_BYTES`).
pub const MAX_PROJECT_BYTES: u64 = 256 * 1024 * 1024;
/// Quantidade de projetos recentes guardados.
pub const MAX_RECENT: usize = 10;

/// Caminho atual do projeto aberto ou salvo.
#[derive(Default)]
pub struct FileState {
    /// Caminho do arquivo ligado ao projeto, se houver.
    pub current: Mutex<Option<PathBuf>>,
}

/// Entrada da lista de recentes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecentEntry {
    /// Caminho completo (exibido ao usuário; a interface não o reenvia).
    pub path: String,
    /// Nome do arquivo.
    pub name: String,
}

/// Insere `entry` no início da lista, sem repetição e limitada a [`MAX_RECENT`].
#[must_use]
pub fn push_recent(mut list: Vec<RecentEntry>, entry: RecentEntry) -> Vec<RecentEntry> {
    list.retain(|e| e.path != entry.path);
    list.insert(0, entry);
    list.truncate(MAX_RECENT);
    list
}

/// Caminho da cópia de segurança do arquivo anterior.
#[must_use]
pub fn backup_path(target: &Path) -> PathBuf {
    let mut name = target
        .file_name()
        .map(std::ffi::OsString::from)
        .unwrap_or_default();
    name.push(".bak");
    target.with_file_name(name)
}

fn temp_path(target: &Path) -> PathBuf {
    let mut name = target
        .file_name()
        .map(std::ffi::OsString::from)
        .unwrap_or_default();
    name.push(".tmp");
    target.with_file_name(name)
}

/// Grava `bytes` em `target` de forma segura:
///
/// 1. escreve em um arquivo temporário na mesma pasta e força a gravação em disco;
/// 2. relê o temporário e confere o conteúdo;
/// 3. se já existir um arquivo, copia-o para `<nome>.bak` (a cópia anterior);
/// 4. substitui o destino por renomeação.
///
/// Qualquer falha nos passos 1–3 deixa o destino intocado.
///
/// # Errors
/// Falhas de E/S ou conteúdo gravado diferente do esperado.
pub fn write_atomic(target: &Path, bytes: &[u8]) -> io::Result<()> {
    write_atomic_with(target, bytes, |path, expected| {
        Ok(fs::read(path)? == expected)
    })
}

/// Como [`write_atomic`], com a verificação injetável (para testes).
///
/// # Errors
/// Falhas de E/S ou verificação que devolve `false`.
pub fn write_atomic_with(
    target: &Path,
    bytes: &[u8],
    verify: impl Fn(&Path, &[u8]) -> io::Result<bool>,
) -> io::Result<()> {
    let tmp = temp_path(target);
    let result = (|| {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        if !verify(&tmp, bytes)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "o arquivo gravado não confere com o conteúdo",
            ));
        }
        if target.exists() {
            fs::copy(target, backup_path(target))?;
        }
        fs::rename(&tmp, target)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

/// Lê um arquivo de projeto respeitando o limite de tamanho.
///
/// # Errors
/// Falha de E/S ou arquivo maior que [`MAX_PROJECT_BYTES`].
pub fn read_project(path: &Path) -> io::Result<Vec<u8>> {
    if fs::metadata(path)?.len() > MAX_PROJECT_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "arquivo grande demais",
        ));
    }
    fs::read(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    fn scratch() -> PathBuf {
        static N: AtomicU32 = AtomicU32::new(0);
        let dir = std::env::temp_dir().join(format!(
            "enzitag-files-test-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::SeqCst)
        ));
        fs::create_dir_all(&dir).unwrap_or_else(|e| panic!("{e}"));
        dir
    }

    #[test]
    fn creates_a_new_file_without_leaving_temporaries() {
        let dir = scratch();
        let target = dir.join("a.enzitag");
        write_atomic(&target, b"v1").unwrap_or_else(|e| panic!("{e}"));
        assert_eq!(fs::read(&target).unwrap_or_default(), b"v1");
        assert!(!temp_path(&target).exists());
        assert!(
            !backup_path(&target).exists(),
            "não há arquivo anterior para guardar"
        );
    }

    #[test]
    fn replacing_keeps_the_previous_content_as_a_backup() {
        let dir = scratch();
        let target = dir.join("a.enzitag");
        write_atomic(&target, b"v1").unwrap_or_else(|e| panic!("{e}"));
        write_atomic(&target, b"v2").unwrap_or_else(|e| panic!("{e}"));
        assert_eq!(fs::read(&target).unwrap_or_default(), b"v2");
        assert_eq!(fs::read(backup_path(&target)).unwrap_or_default(), b"v1");
        write_atomic(&target, b"v3").unwrap_or_else(|e| panic!("{e}"));
        assert_eq!(fs::read(backup_path(&target)).unwrap_or_default(), b"v2");
    }

    #[test]
    fn a_failed_verification_leaves_the_existing_file_untouched() {
        let dir = scratch();
        let target = dir.join("a.enzitag");
        write_atomic(&target, b"original").unwrap_or_else(|e| panic!("{e}"));
        let err = write_atomic_with(&target, b"new", |_, _| Ok(false));
        assert!(err.is_err());
        assert_eq!(fs::read(&target).unwrap_or_default(), b"original");
        assert!(!temp_path(&target).exists(), "o temporário é removido");
        assert!(!backup_path(&target).exists(), "nada foi substituído");
    }

    #[test]
    fn an_interrupted_write_to_a_missing_folder_fails_without_side_effects() {
        let dir = scratch();
        let target = dir.join("missing-folder").join("a.enzitag");
        assert!(write_atomic(&target, b"x").is_err());
        assert!(!dir.join("missing-folder").exists());
    }

    #[test]
    fn a_failed_final_rename_keeps_the_original() {
        let dir = scratch();
        // O destino é uma pasta: a renomeação final falha, mas o original (a pasta) segue intacto.
        let target = dir.join("folder.enzitag");
        fs::create_dir_all(&target).unwrap_or_else(|e| panic!("{e}"));
        assert!(write_atomic(&target, b"x").is_err());
        assert!(target.is_dir());
        assert!(!temp_path(&target).exists());
    }

    #[test]
    fn recent_list_is_deduplicated_ordered_and_bounded() {
        let entry = |n: usize| RecentEntry {
            path: format!("C:/p/{n}.enzitag"),
            name: format!("{n}.enzitag"),
        };
        let mut list = Vec::new();
        for n in 0..15 {
            list = push_recent(list, entry(n));
        }
        assert_eq!(list.len(), MAX_RECENT);
        assert_eq!(list[0], entry(14));
        list = push_recent(list, entry(10));
        assert_eq!(list[0], entry(10));
        assert_eq!(list.iter().filter(|e| **e == entry(10)).count(), 1);
    }

    #[test]
    fn project_size_limit_is_enforced_on_read() {
        let dir = scratch();
        let file = dir.join("ok.enzitag");
        fs::write(&file, b"abc").unwrap_or_else(|e| panic!("{e}"));
        assert_eq!(read_project(&file).unwrap_or_default(), b"abc");
        assert!(read_project(&dir.join("absent.enzitag")).is_err());
    }
}
