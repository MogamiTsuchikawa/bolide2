import { useState, useEffect } from "react";
import { FlowTextOption } from "@/../interface/app";

export function useWebSocketValidation(option: FlowTextOption) {
  const [isValidWsUrl, setIsValidWsUrl] = useState(false);

  useEffect(() => {
    const validateWsUrl = async () => {
      if (!option.wsUrl) {
        setIsValidWsUrl(false);
        return;
      }

      try {
        const ws = new WebSocket(option.wsUrl);
        ws.onopen = () => {
          setIsValidWsUrl(true);
          ws.close();
        };
        ws.onerror = () => {
          setIsValidWsUrl(false);
        };
      } catch (error) {
        setIsValidWsUrl(false);
      }
    };

    validateWsUrl();
  }, [option.wsUrl]);

  return isValidWsUrl;
}
