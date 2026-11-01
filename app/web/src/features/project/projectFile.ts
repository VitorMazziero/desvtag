// Codificação e leitura do `.enzitag` pelo motor (o Rust é o único dono do formato).
import type { TFunction } from "i18next";
import type {
  EngineClient,
  Issue,
  ProjectDecodeResult,
  ProjectDocument,
} from "../../services/engine";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import { base64ToBytes, bytesToBase64 } from "../../services/storage";

export type FileResult<T> = { ok: true; value: T } | { ok: false; messages: string[] };

export async function encodeDocument(
  client: EngineClient,
  document: ProjectDocument,
  t: TFunction,
): Promise<FileResult<Uint8Array>> {
  try {
    const response = await client.request(
      { type: "projectEncode", document },
      { channel: "project-file" },
    );
    if (response.outcome.status === "ok" && response.outcome.result.type === "projectEncode") {
      return { ok: true, value: base64ToBytes(response.outcome.result.bytesBase64) };
    }
    if (response.outcome.status === "error")
      return { ok: false, messages: engineErrorMessages(t, response.outcome.error) };
  } catch {
    // cai na mensagem genérica
  }
  return { ok: false, messages: [t("engine.unavailable", { ns: "diagnostics" })] };
}

export interface DecodedProject {
  decoded: ProjectDecodeResult;
  warnings: string[];
}

export async function decodeBytes(
  client: EngineClient,
  bytes: Uint8Array,
  t: TFunction,
): Promise<FileResult<DecodedProject>> {
  try {
    const response = await client.request(
      { type: "projectDecode", bytesBase64: bytesToBase64(bytes) },
      { channel: "project-file" },
    );
    if (response.outcome.status === "ok" && response.outcome.result.type === "projectDecode") {
      const { type: _type, ...decoded } = response.outcome.result;
      return {
        ok: true,
        value: { decoded, warnings: decoded.warnings.map((w: Issue) => issueMessage(t, w)) },
      };
    }
    if (response.outcome.status === "error")
      return { ok: false, messages: engineErrorMessages(t, response.outcome.error) };
  } catch {
    // cai na mensagem genérica
  }
  return { ok: false, messages: [t("engine.unavailable", { ns: "diagnostics" })] };
}
