import { useState, useEffect } from "react";
import type { FlowTextOption } from "../../interface/app";
import { isWebSocketUrl, validateWebSocketConnection } from "../lib/connection";

const VALIDATION_DEBOUNCE_MS = 350;

export function useWebSocketValidation(option: FlowTextOption) {
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
  }, [url]);

  return result?.url === url && result.isValid;
}
