//! Integridade: resumo SHA-256 e verificação contra o manifesto.

use sha2::{Digest, Sha256};

use crate::experiment::hex;
use crate::manifest::Manifest;

/// SHA-256 hexadecimal de `bytes`.
#[must_use]
pub fn sha256_hex(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

/// O conteúdo de `path` confere com o resumo e o tamanho registrados no manifesto?
#[must_use]
pub fn matches_manifest(manifest: &Manifest, path: &str, content: &[u8]) -> bool {
    manifest
        .files
        .iter()
        .find(|f| f.path == path)
        .is_some_and(|f| f.size == content.len() as u64 && f.sha256 == sha256_hex(content))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::manifest::ManifestFile;

    #[test]
    fn sha256_matches_the_standard_test_vectors() {
        // FIPS 180-4 / NIST: "abc" e entrada vazia.
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn verification_checks_hash_size_and_path() {
        let content = b"hello";
        let manifest = Manifest {
            format: "enzitag".into(),
            container_version: 1,
            schema_version: 1,
            app_version: "0".into(),
            files: vec![ManifestFile {
                path: "project.json".into(),
                sha256: sha256_hex(content),
                size: 5,
            }],
        };
        assert!(matches_manifest(&manifest, "project.json", content));
        assert!(!matches_manifest(&manifest, "project.json", b"hellO"));
        assert!(!matches_manifest(&manifest, "other.json", content));
    }
}
