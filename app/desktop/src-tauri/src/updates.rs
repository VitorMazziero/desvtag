//! Canais de atualização (ET20): `experimental` (todas as versões publicadas) e `stable` (só
//! versões ≥ 1.0.0 sem sufixo). Cada canal tem o seu manifesto assinado; o instalador continua
//! sendo verificado com a chave pública do aplicativo, igual nos dois canais.

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

const REPOSITORY: &str = "VitorMazziero/enzitag-optima";

/// Canal escolhido nas preferências.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Channel {
    /// Todas as versões publicadas (a série 0.x só existe neste canal).
    Experimental,
    /// Somente versões estáveis (a partir da 1.0.0).
    Stable,
}

impl Channel {
    fn release_tag(self) -> &'static str {
        match self {
            Self::Experimental => "channel-experimental",
            Self::Stable => "channel-stable",
        }
    }
}

/// Endereço do manifesto do canal: um arquivo `latest.json` num release fixo do canal, que o fluxo
/// `channels.yml` atualiza depois de cada publicação.
pub fn endpoint(channel: Channel) -> String {
    format!(
        "https://github.com/{REPOSITORY}/releases/download/{}/latest.json",
        channel.release_tag()
    )
}

/// Atualização disponível, como a interface a mostra.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    notes: String,
}

async fn find(
    app: &AppHandle,
    channel: Channel,
) -> Result<Option<tauri_plugin_updater::Update>, String> {
    let url: tauri::Url = endpoint(channel).parse().map_err(|e| format!("{e}"))?;
    let updater = app
        .updater_builder()
        .endpoints(vec![url])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;
    updater.check().await.map_err(|e| e.to_string())
}

/// Procura uma atualização no canal.
#[tauri::command]
pub async fn update_check(app: AppHandle, channel: Channel) -> Result<Option<UpdateInfo>, String> {
    Ok(find(&app, channel).await?.map(|u| UpdateInfo {
        version: u.version.clone(),
        notes: u.body.clone().unwrap_or_default(),
    }))
}

/// Baixa e instala a atualização do canal; a assinatura é conferida antes de instalar.
#[tauri::command]
pub async fn update_install(app: AppHandle, channel: Channel) -> Result<(), String> {
    let Some(update) = find(&app, channel).await? else {
        return Ok(());
    };
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_channel_has_its_own_https_manifest() {
        let experimental = endpoint(Channel::Experimental);
        let stable = endpoint(Channel::Stable);
        assert_ne!(experimental, stable);
        for url in [&experimental, &stable] {
            assert!(url.starts_with("https://github.com/VitorMazziero/enzitag-optima/"));
            assert!(url.ends_with("/latest.json"));
            assert!(url.parse::<tauri::Url>().is_ok());
        }
        assert!(experimental.contains("channel-experimental"));
        assert!(stable.contains("channel-stable"));
    }

    #[test]
    fn channel_names_match_the_interface_values() {
        assert_eq!(
            serde_json::from_str::<Channel>("\"experimental\"").ok(),
            Some(Channel::Experimental)
        );
        assert_eq!(
            serde_json::from_str::<Channel>("\"stable\"").ok(),
            Some(Channel::Stable)
        );
        assert!(serde_json::from_str::<Channel>("\"beta\"").is_err());
    }
}
