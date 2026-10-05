import { useState, useEffect } from "react";
import type { FlowTextOption } from "../../interface/app";
import { isWebSocketUrl, validateWebSocketConnection } from "../lib/connection";

const VALIDATION_DEBOUNCE_MS = 350;

export type ConnectionStatus = "idle" | "checking" | "connected" | "failed";

export function useWebSocketConnectionStatus(option: FlowTextOption, retryKey = 0): ConnectionStatus {
  const [result, setResult] = useState<{ url: string; isValid: boolean } | null>(null);
  const url = option.wsUrl ?? "";

  useEffect(() => {
    setResult(null);
    if (!isWebSocketUrl(url)) return;

    let active = true;
    let cancelValidation: (() => void) | undefined;
    const debounce = setTimeout(() => {
      cancelValidation = validateWebSocketConnection(url, (isValid) => {
        if (active) setResult({ url, isValid });
      });
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(debounce);
      cancelValidation?.();
    };
  }, [url, retryKey]);

  if (!isWebSocketUrl(url)) return "idle";
  if (result?.url !== url) return "checking";
  return result.isValid ? "connected" : "failed";
}

export function useWebSocketValidation(option: FlowTextOption) {
  return useWebSocketConnectionStatus(option) === "connected";
}
