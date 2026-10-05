export type FlowText = {
  id: string;
  text: string;
  color: string;
  line: number;
};

export type FlowTextOptions = {
  fontSize: number;
  fontColors: string[];
  flowAreas: number[];
  windowHeight: number;
  windowWidth: number;
  testMode: boolean;
  wsUrl: string;
  flowDurationMs: number;
};

export const FLOW_ANIMATION_DURATION_MS = 10_000;

const DEFAULT_FONT_COLORS = ["red", "blue", "green", "yellow", "purple", "pink"];
const DEFAULT_FLOW_AREAS = [0, 10, 20, 30, 40, 50, 60, 70, 80];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Accept both the bolide2 protocol and the original comment payloads. */
export const extractCommentText = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;

  const bodyText = isRecord(payload.body) ? payload.body.text : undefined;
  if (payload.type === "comment.created") {
    return typeof bodyText === "string" ? bodyText : null;
  }
  if (typeof payload.comment === "string") return payload.comment;
  if (isRecord(payload.comment) && typeof payload.comment.text === "string") {
    return payload.comment.text;
  }
  return typeof bodyText === "string" ? bodyText : null;
};

export const parseCommentMessage = (data: unknown): string | null => {
  if (typeof data !== "string") return null;
  try {
    return extractCommentText(JSON.parse(data));
  } catch {
    return null;
  }
};

const positiveNumber = (value: string | null, fallback: number): number => {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseFontColors = (value: string | null): string[] => {
  if (!value?.trim()) return [];
  if (value.trim().startsWith("[")) {
    try {
      const colors: unknown = JSON.parse(value);
      return Array.isArray(colors)
        ? colors
            .filter((color): color is string => typeof color === "string")
            .map((color) => color.trim())
            .filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }
  return value.split(",").map((color) => color.trim()).filter(Boolean);
};

export const parseFlowTextOptions = (
  searchParams: Pick<URLSearchParams, "get">,
): FlowTextOptions => {
  const colors = parseFontColors(searchParams.get("fontColors"));
  const areas = (searchParams.get("flowAreas") ?? "")
    .split(",")
    .filter((area) => area.trim().length > 0)
    .map(Number)
    .filter((area) => Number.isFinite(area) && area >= 0 && area <= 100);
  const wsUrl = searchParams.get("wsUrl")?.trim() ?? "";
  const duration = Number(searchParams.get("flowDurationSeconds"));
  let validWsUrl = "";
  try {
    const url = new URL(wsUrl);
    if ((url.protocol === "ws:" || url.protocol === "wss:") && !url.hash) {
      validWsUrl = wsUrl;
    }
  } catch {
    // A missing or invalid URL leaves the preview disconnected.
  }

  return {
    fontSize: positiveNumber(searchParams.get("fontSize"), 100),
    fontColors: colors.length ? colors : [...DEFAULT_FONT_COLORS],
    flowAreas: areas.length ? [...new Set(areas)] : [...DEFAULT_FLOW_AREAS],
    windowHeight: positiveNumber(
      searchParams.get("windowHeight") ?? searchParams.get("windowHight"),
      1000,
    ),
    windowWidth: positiveNumber(searchParams.get("windowWidth"), 1000),
    testMode: searchParams.get("testMode") === "true",
    wsUrl: validWsUrl,
    flowDurationMs: Number.isFinite(duration) && duration >= 3 && duration <= 30
      ? duration * 1000
      : FLOW_ANIMATION_DURATION_MS,
  };
};

const randomIndex = (length: number, randomValue: number): number =>
  Number.isFinite(randomValue)
    ? Math.min(length - 1, Math.max(0, Math.floor(randomValue * length)))
    : 0;

export const selectFlowColor = (
  fontColors: readonly string[],
  randomValue: number,
): string => {
  const colors = fontColors.length ? fontColors : DEFAULT_FONT_COLORS;
  return colors[randomIndex(colors.length, randomValue)];
};

export const selectFlowLine = (
  flowAreas: readonly number[],
  activeTexts: readonly Pick<FlowText, "line">[],
  randomValue: number,
  lineIndex?: number,
): number => {
  const areas = flowAreas.length ? flowAreas : DEFAULT_FLOW_AREAS;
  if (
    lineIndex !== undefined &&
    Number.isInteger(lineIndex) &&
    lineIndex >= 0 &&
    lineIndex < areas.length
  ) {
    return areas[lineIndex];
  }

  const occupiedLines = new Set(activeTexts.map((flowText) => flowText.line));
  const unusedLines = areas.filter((area) => !occupiedLines.has(area));
  const candidates = unusedLines.length ? unusedLines : areas;
  return candidates[randomIndex(candidates.length, randomValue)];
};
