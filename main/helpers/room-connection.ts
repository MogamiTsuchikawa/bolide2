export const DEFAULT_SERVER_ORIGIN = "https://bolide2-server.mogami.workers.dev";

export type RoomConnection = {
  roomId: string;
  serverOrigin: string;
  participantUrl: string;
  wsUrl: string;
  manageUrl: string;
  historyUrl: string;
};

const isLoopback = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/** Imported links must contain only a secure server origin, or a local dev origin. */
export function parseServerOrigin(value: string): string | null {
  if (!/^https?:\/\/[^/?#\\]+\/?$/i.test(value) || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) ||
      !url.hostname || url.username || url.password || url.pathname !== "/" ||
      url.search || url.hash || value.includes("?") || value.includes("#")
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildRoomConnection(serverOrigin: string, roomId: string): RoomConnection | null {
  const origin = parseServerOrigin(serverOrigin);
  if (!origin || !/^[A-Z0-9]{16}$/.test(roomId)) return null;
  const participantUrl = `${origin}/rooms/${roomId}`;
  const websocketOrigin = origin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return {
    roomId,
    serverOrigin: origin,
    participantUrl,
    wsUrl: `${websocketOrigin}/rooms/${roomId}/ws`,
    manageUrl: `${participantUrl}/manage`,
    historyUrl: `${participantUrl}/history`,
  };
}

/** A participant URL or the app's exact deep-link contract. No token/query is retained. */
export function parseRoomLink(value: string): RoomConnection | null {
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u0020\u007f]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    const rawPath = trimmed.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+([^?#]*)/i)?.[1];
    if (rawPath === undefined || rawPath !== url.pathname) return null;
    if (url.username || url.password || url.hash || trimmed.includes("#")) return null;
    if (url.protocol === "bolide2:") {
      if (url.hostname !== "rooms" || url.port) return null;
      const match = url.pathname.match(/^\/([A-Z0-9]{16})$/);
      const entries = [...url.searchParams.entries()];
      return match && entries.length === 1 && entries[0][0] === "server"
        ? buildRoomConnection(entries[0][1], match[1])
        : null;
    }
    if (url.search || trimmed.includes("?")) return null;
    const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{16})\/?$/);
    return match ? buildRoomConnection(url.origin, match[1]) : null;
  } catch {
    return null;
  }
}

/** Legacy/custom WebSocket settings remain usable but get no unsafe browser links. */
export function roomConnectionFromSocket(value: string): RoomConnection | null {
  try {
    const url = new URL(value);
    if (
      !["ws:", "wss:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || value.includes("?") || value.includes("#")
    ) return null;
    const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{16})\/ws$/);
    const origin = url.origin.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    return match ? buildRoomConnection(origin, match[1]) : null;
  } catch {
    return null;
  }
}

export type RoomPageAction = "dashboard" | "manage" | "participant" | "history";
export type RoomPageRequest = { action: RoomPageAction; connectionUrl?: string };

/** Build the URL in the main process rather than passing arbitrary URLs to shell. */
export function resolveRoomPage(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const request = value as Record<string, unknown>;
  if (request.connectionUrl !== undefined && typeof request.connectionUrl !== "string") return null;
  const room = typeof request.connectionUrl === "string"
    ? roomConnectionFromSocket(request.connectionUrl)
    : null;
  switch (request.action) {
    case "dashboard": return `${room?.serverOrigin ?? DEFAULT_SERVER_ORIGIN}/`;
    case "manage": return room?.manageUrl ?? null;
    case "participant": return room?.participantUrl ?? null;
    case "history": return room?.historyUrl ?? null;
    default: return null;
  }
}
