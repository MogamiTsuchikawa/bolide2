import { DEFAULT_SERVER_ORIGIN } from "./room-connection";

export const ROOM_ID_LENGTH = 16;

export type ServerType = "bolide2" | "digicre" | "custom";

export type ConnectionSettings = {
  serverType: ServerType;
  roomName: string;
  roomId: string;
  serverUrl: string;
  customUrl: string;
};

export function normalizeRoomId(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_ID_LENGTH);
}

export function isWebSocketUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "ws:" || url.protocol === "wss:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.href.includes("#")
    );
  } catch {
    return false;
  }
}

export function toWsBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

export function buildConnectionUrl(settings: ConnectionSettings): string {
  if (settings.serverType === "custom") {
    const url = settings.customUrl.trim();
    return isWebSocketUrl(url) ? url : "";
  }
  if (settings.serverType === "digicre") {
    const roomName = settings.roomName.trim();
    return roomName
      ? `wss://bolide.digicre.net/api/v1/room/${encodeURIComponent(roomName)}`
      : "";
  }
  const baseUrl = toWsBaseUrl(settings.serverUrl);
  return baseUrl && /^[A-Z0-9]{16}$/.test(settings.roomId)
    ? `${baseUrl}/rooms/${settings.roomId}/ws`
    : "";
}

export function connectionSettingsFromUrl(value: string): ConnectionSettings {
  const settings: ConnectionSettings = {
    serverType: value ? "custom" : "bolide2",
    roomName: "",
    roomId: "",
    serverUrl: DEFAULT_SERVER_ORIGIN,
    customUrl: value,
  };
  if (!isWebSocketUrl(value)) return settings;

  const url = new URL(value);
  if (url.search || url.hash) return settings;
  const roomMatch = url.pathname.match(/^\/rooms\/([A-Z0-9]{16})\/ws$/);
  if (roomMatch) {
    return {
      ...settings,
      serverType: "bolide2",
      serverUrl: url.origin,
      roomId: roomMatch[1],
    };
  }
  const digicreMatch = url.pathname.match(/^\/api\/v1\/room\/([^/]+)$/);
  if (url.origin === "wss://bolide.digicre.net" && digicreMatch) {
    try {
      return {
        ...settings,
        serverType: "digicre",
        roomName: decodeURIComponent(digicreMatch[1]),
      };
    } catch {
      return settings;
    }
  }
  return settings;
}

type ValidationSocket = Pick<
  WebSocket,
  "readyState" | "onopen" | "onerror" | "onclose" | "close"
>;

type ValidationDependencies = {
  createSocket?: (url: string) => ValidationSocket;
  timeoutMs?: number;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
};

/** Probe one connection; cancelling also aborts an in-progress handshake. */
export function validateWebSocketConnection(
  url: string,
  onResult: (isValid: boolean) => void,
  {
    createSocket = (value) => new WebSocket(value),
    timeoutMs = 5_000,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  }: ValidationDependencies = {}
): () => void {
  if (!isWebSocketUrl(url)) {
    onResult(false);
    return () => {};
  }

  let socket: ValidationSocket;
  try {
    socket = createSocket(url);
  } catch {
    onResult(false);
    return () => {};
  }

  let active = true;
  let cleanedUp = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (timeout !== undefined) clearTimer(timeout);
    socket.onopen = null;
    socket.onerror = null;
    socket.onclose = null;
    // Calling close while CONNECTING aborts the handshake. Detach callbacks first
    // because some implementations report that cancellation as an error.
    if (socket.readyState === 0 || socket.readyState === 1) {
      try {
        socket.close();
      } catch {
        // A concurrently closed socket must not interrupt effect cleanup.
      }
    }
  };

  const finish = (isValid: boolean) => {
    if (!active) return;
    active = false;
    cleanup();
    onResult(isValid);
  };

  socket.onopen = () => finish(true);
  socket.onerror = () => finish(false);
  socket.onclose = () => finish(false);
  timeout = setTimer(() => finish(false), timeoutMs);

  return () => {
    active = false;
    cleanup();
  };
}
