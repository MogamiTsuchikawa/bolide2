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
import {
  DEFAULT_SERVER_ORIGIN,
  parseRoomLink,
  parseServerOrigin,
  roomConnectionFromSocket,
  resolveRoomPage,
} from "../renderer/lib/room-connection";

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

test("imports a participant URL and desktop link into the same room connection", () => {
  const participantUrl = `https://example.com/rooms/${settings.roomId}`;
  const room = parseRoomLink(` ${participantUrl} `);
  assert.ok(room);
  assert.equal(room.participantUrl, participantUrl);
  assert.equal(room.manageUrl, `${participantUrl}/manage`);
  assert.equal(room.historyUrl, `${participantUrl}/history`);
  assert.equal(room.wsUrl, `wss://example.com/rooms/${settings.roomId}/ws`);
  assert.deepEqual(parseRoomLink(`bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("https://example.com")}`), room);
  assert.deepEqual(parseRoomLink(`${participantUrl}/`), room);
  assert.deepEqual(roomConnectionFromSocket(room.wsUrl), room);
  const dev = parseRoomLink(`http://127.0.0.1:8787/rooms/${settings.roomId}`);
  assert.equal(dev?.wsUrl, `ws://127.0.0.1:8787/rooms/${settings.roomId}/ws`);
  assert.equal(parseServerOrigin("http://localhost:8787"), "http://localhost:8787");
  assert.equal(parseServerOrigin("http://[::1]:8787"), "http://[::1]:8787");
});

test("rejects links with unsafe protocols, credentials, ambiguous paths or queries", () => {
  const validLink = `bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("https://example.com")}`;
  for (const value of [
    `https://user:secret@example.com/rooms/${settings.roomId}`,
    `http://example.com/rooms/${settings.roomId}`,
    `file:///rooms/${settings.roomId}`,
    `https://example.com/rooms/${settings.roomId}?token=secret`,
    `https://example.com/rooms/${settings.roomId}?`,
    `https://example.com/rooms/${settings.roomId}#`,
    `https://example.com/rooms/previous/../${settings.roomId}`,
    `https://example.com/rooms/${settings.roomId}/manage`,
    `https://example.com/rooms/${settings.roomId.toLowerCase()}`,
    `bolide2://rooms/${settings.roomId}`,
    `bolide2://other/${settings.roomId}?server=https://example.com`,
    `bolide2://rooms:123/${settings.roomId}?server=https://example.com`,
    `bolide2://user@rooms/${settings.roomId}?server=https://example.com`,
    `${validLink}&server=https://attacker.example`,
    `${validLink}&start=true`,
    `${validLink}#ignored`,
    `bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("https://example.com/extra")}`,
    `bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("https://example.com?token=1")}`,
    `bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("https://user:secret@example.com")}`,
    `bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("http://example.com")}`,
    `bolide2://rooms/${settings.roomId}?server=${encodeURIComponent("javascript:alert(1)")}`,
  ]) assert.equal(parseRoomLink(value), null, value);
  for (const value of ["https:example.com", "https://example.com\\", "https://example.com/path", "https://example.com?", "https://example.com#", "https://user@example.com", "http://localhost.example.com", "https://example.com\n"]) {
    assert.equal(parseServerOrigin(value), null, value);
  }
});

test("external browser IPC only generates known room and dashboard pages", () => {
  const connectionUrl = `wss://example.com/rooms/${settings.roomId}/ws`;
  assert.equal(resolveRoomPage({ action: "dashboard" }), `${DEFAULT_SERVER_ORIGIN}/`);
  assert.equal(resolveRoomPage({ action: "dashboard", connectionUrl }), "https://example.com/");
  assert.equal(resolveRoomPage({ action: "manage", connectionUrl }), `https://example.com/rooms/${settings.roomId}/manage`);
  assert.equal(resolveRoomPage({ action: "participant", connectionUrl }), `https://example.com/rooms/${settings.roomId}`);
  assert.equal(resolveRoomPage({ action: "history", connectionUrl }), `https://example.com/rooms/${settings.roomId}/history`);
  for (const value of [null, [], "https://example.com", { action: "open", url: "file:///tmp" }, { action: "manage", connectionUrl: "wss://example.com/other" }, { action: "history", connectionUrl: 1 }]) {
    assert.equal(resolveRoomPage(value), null);
  }
  for (const connectionUrl of ["wss://user:secret@example.com/rooms/1A2B3C4D5E6F7G8H/ws", "wss://example.com/rooms/1A2B3C4D5E6F7G8H/ws?token=1", "ws://remote.example.com/rooms/1A2B3C4D5E6F7G8H/ws"]) {
    assert.equal(roomConnectionFromSocket(connectionUrl), null);
  }
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
