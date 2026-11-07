import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConfirmationComparison, ConfirmationObservation } from "../../services/engine";
import { StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";

/** A response is displayed only for the exact observations that produced it. */
export function useConfirmationComparisons(observations: ConfirmationObservation[]) {
  const { client } = useEngine();
  const { t } = useTranslation();
  const key = JSON.stringify(observations);
  const [computed, setComputed] = useState<{ key: string; values: ConfirmationComparison[] }>();
  const [failure, setFailure] = useState<{ key: string; messages: string[] }>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: key is the complete serialized request.
  useEffect(() => {
    let live = true;
    setFailure(undefined);
    if (!observations.length) {
      setComputed({ key, values: [] });
      return;
    }
    client
      .request({ type: "confirmationCompare", observations }, { channel: "confirmation-compare" })
      .then((response) => {
        if (!live) return;
        if (
          response.outcome.status === "ok" &&
          response.outcome.result.type === "confirmationCompare"
        )
          setComputed({ key, values: response.outcome.result.comparisons });
        else if (response.outcome.status === "error")
          setFailure({ key, messages: engineErrorMessages(t, response.outcome.error) });
      })
      .catch((error: unknown) => {
        if (live && !(error instanceof StaleResponseError))
          setFailure({ key, messages: [t("engine.unavailable", { ns: "diagnostics" })] });
      });
    return () => {
      live = false;
    };
  }, [client, key, t]);
  return {
    comparisons: computed?.key === key ? computed.values : null,
    error: failure?.key === key ? failure.messages : null,
  };
}
