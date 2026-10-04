import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConnectionUrl,
  connectionSettingsFromUrl,
  isWebSocketUrl,
  normalizeRoomId,
  toWsBaseUrl,
  validateWebSocketConnection,
  type ConnectionSettings,
} from "../renderer/lib/connection";

const settings: ConnectionSettings = {
  serverType: "bolide2",
  roomName: "",
  roomId: "1A2B3C4D5E6F7G8H",
  serverUrl: "https://example.com/base?query=1#fragment",
  customUrl: "",
};

test("server origins use WebSocket protocols and preserve host and port", () => {
  assert.equal(toWsBaseUrl(settings.serverUrl), "wss://example.com");
  assert.equal(toWsBaseUrl("http://localhost:8787/path"), "ws://localhost:8787");
  assert.equal(toWsBaseUrl("wss://example.com/path"), "wss://example.com");
  for (const value of ["ftp://example.com", "file:///tmp/socket", "javascript:alert(1)", "not a URL"]) {
    assert.equal(toWsBaseUrl(value), "");
  }
});

test("bolide2 connections require a complete 16-character uppercase room ID", () => {
  assert.equal(buildConnectionUrl(settings), "wss://example.com/rooms/1A2B3C4D5E6F7G8H/ws");
  for (const roomId of ["", "ABC", "1A2B3C4D5E6F7G8", "1A2B3C4D5E6F7G8H9", "1a2b3c4d5e6f7g8h"]) {
    assert.equal(buildConnectionUrl({ ...settings, roomId }), "");
  }
  assert.equal(normalizeRoomId("1a2b-3c4d 5e6f7g8h9"), "1A2B3C4D5E6F7G8H");
});

test("Digicre room names remain a single encoded path component", () => {
  assert.equal(
    buildConnectionUrl({ ...settings, serverType: "digicre", roomName: " 部屋/a?b#c " }),
    "wss://bolide.digicre.net/api/v1/room/%E9%83%A8%E5%B1%8B%2Fa%3Fb%23c"
  );
  assert.equal(buildConnectionUrl({ ...settings, serverType: "digicre", roomName: "  " }), "");
});

test("custom connections accept only browser-compatible ws or wss URLs", () => {
  assert.equal(buildConnectionUrl({ ...settings, serverType: "custom", customUrl: " wss://example.com/ws?token=1 " }), "wss://example.com/ws?token=1");
  for (const value of ["https://example.com", "wss://example.com/#room", "ws://example.com/#", "ws://user:password@example.com", "", "invalid"]) {
    assert.equal(isWebSocketUrl(value), false);
    assert.equal(buildConnectionUrl({ ...settings, serverType: "custom", customUrl: value }), "");
  }
});

test("existing generated URLs restore the corresponding connection fields", () => {
  const bolide = connectionSettingsFromUrl(buildConnectionUrl(settings));
  assert.equal(bolide.serverType, "bolide2");
  assert.equal(bolide.roomId, settings.roomId);
  assert.equal(bolide.serverUrl, "wss://example.com");

  const digicreUrl = buildConnectionUrl({ ...settings, serverType: "digicre", roomName: "部屋/a" });
  assert.equal(connectionSettingsFromUrl(digicreUrl).roomName, "部屋/a");
  assert.equal(connectionSettingsFromUrl(digicreUrl).serverType, "digicre");
  const customUrl = "wss://example.com/socket?room=1";
  assert.equal(connectionSettingsFromUrl(customUrl).customUrl, customUrl);
  assert.equal(connectionSettingsFromUrl(customUrl).serverType, "custom");
  assert.equal(connectionSettingsFromUrl("wss://bolide.digicre.net/api/v1/room/%XX").serverType, "custom");
});

class FakeSocket {
  readyState: WebSocket["readyState"] = 0;
  onopen: WebSocket["onopen"] = null;
  onerror: WebSocket["onerror"] = null;
  onclose: WebSocket["onclose"] = null;
  closeCalls = 0;

  close() {
    this.closeCalls += 1;
    this.readyState = 2;
  }

  open() {
    this.readyState = 1;
    this.onopen?.call(this as unknown as WebSocket, new Event("open"));
  }

  error() {
    this.onerror?.call(this as unknown as WebSocket, new Event("error"));
  }

  closed() {
    this.readyState = 3;
    this.onclose?.call(this as unknown as WebSocket, new Event("close") as CloseEvent);
  }
}

function createProbe() {
  const socket = new FakeSocket();
  const results: boolean[] = [];
  let timeoutCallback: (() => void) | undefined;
  let timeoutDelay = 0;
  let clearedTimers = 0;
  const cancel = validateWebSocketConnection("wss://example.com/ws", (result) => results.push(result), {
    createSocket: () => socket,
    timeoutMs: 5_000,
    setTimer: (callback, delayMs) => {
      timeoutCallback = callback;
      timeoutDelay = delayMs;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: () => { clearedTimers += 1; },
  });
  return {
    socket,
    results,
    cancel,
    timeout: () => timeoutCallback?.(),
    delay: () => timeoutDelay,
    cleared: () => clearedTimers,
  };
}

test("a successful probe reports once and releases its socket and timeout", () => {
  const probe = createProbe();
  assert.equal(probe.delay(), 5_000);
  probe.socket.open();
  probe.timeout();
  probe.cancel();
  assert.deepEqual(probe.results, [true]);
  assert.equal(probe.socket.closeCalls, 1);
  assert.equal(probe.cleared(), 1);
  assert.equal(probe.socket.onopen, null);
  assert.equal(probe.socket.onerror, null);
  assert.equal(probe.socket.onclose, null);
});

test("errors and connection closes report failure even before open", () => {
  const errorProbe = createProbe();
  errorProbe.socket.error();
  assert.deepEqual(errorProbe.results, [false]);
  assert.equal(errorProbe.socket.closeCalls, 1);

  const closeProbe = createProbe();
  closeProbe.socket.closed();
  assert.deepEqual(closeProbe.results, [false]);
  assert.equal(closeProbe.socket.closeCalls, 0);
});

test("timeout aborts a stalled connection and cannot later become valid", () => {
  const probe = createProbe();
  const lateOpen = probe.socket.onopen;
  probe.timeout();
  lateOpen?.call(probe.socket as unknown as WebSocket, new Event("open"));
  assert.deepEqual(probe.results, [false]);
  assert.equal(probe.socket.closeCalls, 1);
});

test("cancelling a connecting probe ignores queued callbacks", () => {
  const probe = createProbe();
  const lateOpen = probe.socket.onopen;
  const lateError = probe.socket.onerror;
  probe.cancel();
  lateOpen?.call(probe.socket as unknown as WebSocket, new Event("open"));
  lateError?.call(probe.socket as unknown as WebSocket, new Event("error"));
  probe.timeout();
  assert.deepEqual(probe.results, []);
  assert.equal(probe.socket.closeCalls, 1);
  assert.equal(probe.cleared(), 1);
});

test("invalid URLs and socket constructor errors fail without throwing", () => {
  const results: boolean[] = [];
  validateWebSocketConnection("https://example.com", (result) => results.push(result), {
    createSocket: () => { throw new Error("must not construct an invalid URL"); },
  });
  validateWebSocketConnection("wss://example.com", (result) => results.push(result), {
    createSocket: () => { throw new Error("socket construction failed"); },
  });
  assert.deepEqual(results, [false, false]);
});
