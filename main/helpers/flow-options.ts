import type { FlowTextOption } from "../../interface/app";
import flowSettings from "../../interface/flow-settings.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeFlowTextOption = (value: unknown): FlowTextOption => {
  if (!isRecord(value)) {
    throw new Error("表示設定を確認してください。");
  }

  const { fontSize, fontColors, flowAreas, testMode, wsUrl, flowDurationSeconds } = value;
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize) || fontSize <= 0) {
    throw new Error("フォントサイズには 0 より大きい数値を入力してください。");
  }
  if (
    !Array.isArray(fontColors) ||
    fontColors.length === 0 ||
    fontColors.length > flowSettings.maxItems ||
    !fontColors.every(
      (color: unknown) =>
        typeof color === "string" &&
        color.trim().length > 0 &&
        color.length <= 256 &&
        !/[\u0000-\u001f\u007f;{}]/.test(color)
    )
  ) {
    throw new Error("フォントカラーを 1 色以上設定してください。");
  }
  if (
    !Array.isArray(flowAreas) ||
    flowAreas.length === 0 ||
    flowAreas.length > flowSettings.maxItems ||
    !flowAreas.every(
      (area: unknown) =>
        typeof area === "number" &&
        Number.isFinite(area) &&
        area >= 0 &&
        area <= 100
    )
  ) {
    throw new Error("表示位置には 0〜100 の数値を 1 つ以上設定してください。");
  }
  if (typeof testMode !== "boolean") {
    throw new Error("テストモードの設定を確認してください。");
  }
  if (flowDurationSeconds !== undefined && (
    typeof flowDurationSeconds !== "number" || !Number.isFinite(flowDurationSeconds) ||
    flowDurationSeconds < 3 || flowDurationSeconds > 30
  )) {
    throw new Error("表示速度には 3〜30 秒の数値を入力してください。");
  }
  if (wsUrl !== undefined && typeof wsUrl !== "string") {
    throw new Error("WebSocket URL を確認してください。");
  }

  const normalizedUrl = wsUrl?.trim() ?? "";
  if (!normalizedUrl && !testMode) {
    throw new Error("WebSocket URL を入力してください。");
  }
  if (normalizedUrl) {
    let url: URL;
    try {
      url = new URL(normalizedUrl);
    } catch {
      throw new Error("有効な WebSocket URL を入力してください。");
    }
    if (
      (url.protocol !== "ws:" && url.protocol !== "wss:") ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.href.includes("#")
    ) {
      throw new Error("WebSocket URL は ws:// または wss:// で指定してください。");
    }
  }

  return {
    fontSize,
    fontColors: fontColors.map((color: string) => color.trim()),
    flowAreas: [...flowAreas],
    testMode,
    flowDurationSeconds: typeof flowDurationSeconds === "number" ? flowDurationSeconds : 10,
    ...(normalizedUrl ? { wsUrl: normalizedUrl } : {}),
  };
};
