import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFlowTextOption } from "../main/helpers/flow-options";
import { restoreWindowState } from "../main/helpers/window-state";

const validOption = {
  fontSize: 100,
  fontColors: ["red", "#00ff00", "rgb(1, 2, 3)"],
  flowAreas: [0, 50, 100],
  testMode: false,
  wsUrl: "wss://example.com/room",
};

test("normalizes valid options without sharing mutable renderer arrays", () => {
  const option = normalizeFlowTextOption({
    ...validOption,
    fontColors: [" red ", "rgb(1, 2, 3)"],
    wsUrl: " wss://example.com/room ",
  });
  assert.deepEqual(option.fontColors, ["red", "rgb(1, 2, 3)"]);
  assert.equal(option.wsUrl, validOption.wsUrl);
  assert.notEqual(option.flowAreas, validOption.flowAreas);
});

test("test mode permits an omitted WebSocket URL", () => {
  const { wsUrl: _url, ...option } = validOption;
  assert.equal(normalizeFlowTextOption({ ...option, testMode: true }).wsUrl, undefined);
  assert.throws(() => normalizeFlowTextOption(option), /WebSocket URL/);
});

test("validates display speed before a presentation starts and preserves legacy defaults", () => {
  assert.equal(normalizeFlowTextOption(validOption).flowDurationSeconds, 10);
  assert.equal(normalizeFlowTextOption({ ...validOption, flowDurationSeconds: 3 }).flowDurationSeconds, 3);
  assert.equal(normalizeFlowTextOption({ ...validOption, flowDurationSeconds: 30 }).flowDurationSeconds, 30);
  for (const flowDurationSeconds of [NaN, Infinity, 0, 2, 31, "10", null]) {
    assert.throws(() => normalizeFlowTextOption({ ...validOption, flowDurationSeconds }), /表示速度/);
  }
});

test("accepts 100 colors and positions at the settings limit", () => {
  const option = normalizeFlowTextOption({
    ...validOption,
    fontColors: Array<string>(100).fill("red"),
    flowAreas: Array.from({ length: 100 }, (_, index) => index),
  });
  assert.equal(option.fontColors.length, 100);
  assert.equal(option.flowAreas.length, 100);
});

test("rejects 101 colors or positions before creating a window", () => {
  assert.throws(() => normalizeFlowTextOption({
    ...validOption,
    fontColors: Array<string>(101).fill("red"),
  }));
  assert.throws(() => normalizeFlowTextOption({
    ...validOption,
    flowAreas: Array<number>(101).fill(0),
  }));
});

test("rejects malformed IPC payloads before creating a window", () => {
  for (const payload of [
    null,
    [],
    { ...validOption, fontSize: NaN },
    { ...validOption, fontSize: Infinity },
    { ...validOption, fontSize: 0 },
    { ...validOption, fontColors: [] },
    { ...validOption, fontColors: [""] },
    { ...validOption, fontColors: ["red;display:none"] },
    { ...validOption, fontColors: [null] },
    { ...validOption, flowAreas: [] },
    { ...validOption, flowAreas: [-1] },
    { ...validOption, flowAreas: [101] },
    { ...validOption, flowAreas: [NaN] },
    { ...validOption, testMode: "true" },
    { ...validOption, wsUrl: 1 },
    { ...validOption, wsUrl: "invalid" },
    { ...validOption, wsUrl: "https://example.com" },
    { ...validOption, wsUrl: "wss://user:password@example.com" },
    { ...validOption, wsUrl: "wss://example.com/#fragment" },
    { ...validOption, wsUrl: "wss://example.com/#" },
  ]) {
    assert.throws(() => normalizeFlowTextOption(payload));
  }
});

test("restores valid state on a display with a negative origin", () => {
  const workArea = { x: -1920, y: 40, width: 1920, height: 1040 };
  const saved = { x: -1800, y: 100, width: 1000, height: 600 };
  assert.deepEqual(restoreWindowState(saved, [workArea], workArea, saved), saved);
});

test("resets corrupt or offscreen state within the primary work area", () => {
  const workArea = { x: 1920, y: 40, width: 800, height: 560 };
  for (const saved of [
    undefined,
    {},
    { x: 0, y: 0, width: 1000, height: 600 },
    { x: 2000, y: 100, width: NaN, height: 200 },
  ]) {
    assert.deepEqual(
      restoreWindowState(saved, [workArea], workArea, { width: 1000, height: 600 }),
      workArea
    );
  }
});
