import assert from "node:assert/strict";
import test from "node:test";
import {
  extractCommentText,
  parseCommentMessage,
  parseFlowTextOptions,
  selectFlowColor,
  selectFlowLine,
} from "../renderer/lib/flow-text";

test("extracts current and legacy comment formats", () => {
  assert.equal(
    extractCommentText({ type: "comment.created", body: { text: "current" } }),
    "current",
  );
  assert.equal(extractCommentText({ comment: "legacy" }), "legacy");
  assert.equal(extractCommentText({ comment: { text: "nested" } }), "nested");
  assert.equal(extractCommentText({ body: { text: "body" } }), "body");
  assert.equal(
    extractCommentText({
      type: "comment.created",
      body: { text: "current" },
      comment: "legacy",
    }),
    "current",
  );
});

test("ignores malformed and non-text protocol payloads", () => {
  for (const payload of [
    null,
    1,
    "comment",
    [],
    {},
    { comment: 1 },
    { comment: { text: [] } },
    { body: { text: false } },
    { type: "comment.created", body: null, comment: "legacy" },
  ]) {
    assert.equal(extractCommentText(payload), null);
  }
  assert.equal(parseCommentMessage("not json"), null);
  assert.equal(parseCommentMessage("null"), null);
  assert.equal(parseCommentMessage(new ArrayBuffer(8)), null);
  assert.equal(parseCommentMessage('{"comment":"hello"}'), "hello");
});

test("uses display defaults for absent or invalid options", () => {
  const defaults = parseFlowTextOptions(new URLSearchParams());
  assert.equal(defaults.fontSize, 100);
  assert.equal(defaults.windowHeight, 1000);
  assert.equal(defaults.windowWidth, 1000);
  assert.equal(defaults.wsUrl, "");
  assert.equal(
    parseFlowTextOptions(new URLSearchParams({ wsUrl: "ws://example.com/#fragment" }))
      .wsUrl,
    "",
  );
  assert.ok(defaults.fontColors.length > 0);
  assert.ok(defaults.flowAreas.length > 0);
  for (const value of ["", "NaN", "Infinity", "-1", "0", "10px"]) {
    const options = parseFlowTextOptions(
      new URLSearchParams({
        fontSize: value,
        windowHeight: value,
        windowWidth: value,
        fontColors: " , , ",
        flowAreas: ",NaN,-10,101,Infinity,",
        wsUrl: "https://example.com",
      }),
    );
    assert.deepEqual(options, defaults);
  }
});

test("reads windowHeight and keeps valid color, position, and connection values", () => {
  const options = parseFlowTextOptions(
    new URLSearchParams({
      fontSize: "72",
      fontColors: " red, ,#ffffff, blue ",
      flowAreas: "0,10,NaN,10,100,101,-1,",
      windowHeight: "1080",
      windowHight: "200",
      windowWidth: "1920",
      testMode: "true",
      wsUrl: "wss://example.com/comments",
    }),
  );
  assert.deepEqual(options, {
    fontSize: 72,
    fontColors: ["red", "#ffffff", "blue"],
    flowAreas: [0, 10, 100],
    windowHeight: 1080,
    windowWidth: 1920,
    testMode: true,
    wsUrl: "wss://example.com/comments",
  });
  assert.equal(
    parseFlowTextOptions(new URLSearchParams({ windowHight: "720" })).windowHeight,
    720,
  );
});

test("keeps CSS function commas in JSON encoded colors and accepts old lists", () => {
  assert.deepEqual(
    parseFlowTextOptions(
      new URLSearchParams({
        fontColors: JSON.stringify(["rgb(255, 0, 0)", "hsl(120, 100%, 50%)"]),
      }),
    ).fontColors,
    ["rgb(255, 0, 0)", "hsl(120, 100%, 50%)"],
  );
  assert.deepEqual(
    parseFlowTextOptions(new URLSearchParams({ fontColors: "red,blue" })).fontColors,
    ["red", "blue"],
  );
  assert.deepEqual(
    parseFlowTextOptions(new URLSearchParams({ fontColors: "[invalid" })).fontColors,
    parseFlowTextOptions(new URLSearchParams()).fontColors,
  );
});

test("preserves explicit first-row selection and uses only available rows", () => {
  const areas = [0, 20, 40];
  assert.equal(selectFlowLine(areas, [], 0.99, 0), 0);
  assert.equal(selectFlowLine(areas, [{ line: 0 }], 0), 20);
  assert.equal(selectFlowLine(areas, [{ line: 0 }], 0.99), 40);
  assert.equal(selectFlowLine(areas, [{ line: 0 }, { line: 20 }], 0.99), 40);
  assert.equal(
    selectFlowLine(areas, [{ line: 0 }, { line: 20 }, { line: 40 }], 0.99),
    40,
  );
});

test("makes row selection from current occupancy and reuses completed rows", () => {
  const areas = [0, 20];
  const first = selectFlowLine(areas, [], 0);
  const second = selectFlowLine(areas, [{ line: first }], 0);
  assert.equal(first, 0);
  assert.equal(second, 20);
  assert.equal(selectFlowLine(areas, [{ line: second }], 0), first);
});

test("keeps randomized selections defined at the upper boundary", () => {
  assert.equal(selectFlowLine([10, 20], [], 1), 20);
  assert.equal(selectFlowColor(["red", "blue"], 1), "blue");
  assert.equal(selectFlowLine([10, 20], [], Number.NaN), 10);
  assert.ok(Number.isFinite(selectFlowLine([], [], 0.99)));
  assert.ok(selectFlowColor([], 0.99));
});
