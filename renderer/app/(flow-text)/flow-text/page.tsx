"use client";

import { memo, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseCommentMessage,
  parseFlowTextOptions,
  selectFlowColor,
  selectFlowLine,
  type FlowText,
} from "@/lib/flow-text";

const FlowTextPage = () => {
  const searchParams = useSearchParams();
  const options = useMemo(() => parseFlowTextOptions(searchParams), [searchParams]);
  const [flowTexts, setFlowTexts] = useState<FlowText[]>([]);
  const removeFlowText = useCallback((id: string) => {
    setFlowTexts((previous) => previous.filter((flowText) => flowText.id !== id));
  }, []);

  useEffect(() => {
    if (!options.testMode) return;
    setFlowTexts(
      options.flowAreas.map((line, index) => ({
        id: crypto.randomUUID(),
        text: `TEST${index}`,
        color: selectFlowColor(options.fontColors, Math.random()),
        line,
      })),
    );

    const timeout = window.setTimeout(() => {
      window.ipc.send("back-to-setting", null);
    }, options.flowDurationMs);
    return () => window.clearTimeout(timeout);
  }, [options]);

  useEffect(() => {
    if (!options.wsUrl) return;
    const ws = new WebSocket(options.wsUrl);
    ws.onmessage = (event) => {
      const commentText = parseCommentMessage(event.data);
      if (!commentText) return;

      const id = crypto.randomUUID();
      const color = selectFlowColor(options.fontColors, Math.random());
      const randomLine = Math.random();
      setFlowTexts((previous) => [
        ...previous,
        {
          id,
          text: commentText,
          color,
          line: selectFlowLine(options.flowAreas, previous, randomLine),
        },
      ]);
    };

    return () => {
      ws.onmessage = null;
      ws.close();
    };
  }, [options]);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        whiteSpace: "nowrap",
        height: `${Math.max(0, options.windowHeight - 50)}px`,
        width: "100%",
      }}
    >
      {flowTexts.map((flowText) => (
        <AnimationText
          flowText={flowText}
          fontSize={options.fontSize}
          durationMs={options.flowDurationMs}
          onComplete={removeFlowText}
          key={flowText.id}
        />
      ))}
      <style>{`
        @keyframes flow-text {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-${options.windowWidth}px - 100%));
          }
        }
      `}</style>
    </div>
  );
};

export default function FlowTextRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FlowTextPage />
    </Suspense>
  );
}

type AnimationTextProps = {
  flowText: FlowText;
  fontSize: number;
  durationMs: number;
  onComplete: (id: string) => void;
};

const AnimationText = memo(function AnimationText({
  flowText,
  fontSize,
  durationMs,
  onComplete,
}: AnimationTextProps) {
  return (
    <div
      onAnimationEnd={() => onComplete(flowText.id)}
      style={{
        position: "absolute",
        left: "100%",
        top: `${flowText.line}%`,
        animation: `flow-text ${durationMs}ms linear forwards`,
        fontSize: `${fontSize}px`,
        color: flowText.color,
        fontWeight: "bold",
      }}
    >
      {flowText.text}
    </div>
  );
});
