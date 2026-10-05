import path from "node:path";
import { app, BrowserWindow, ipcMain, screen, shell } from "electron";
import type { BrowserWindowConstructorOptions, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { normalizeFlowTextOption } from "./helpers/flow-options";
import type { FlowTextOption } from "../interface/app";
import { parseRoomLink, resolveRoomPage, type RoomConnection } from "./helpers/room-connection";

const isProd = process.env.NODE_ENV === "production";
const preload = path.join(import.meta.dirname, "preload.js");
const webPreferences = { nodeIntegration: false, contextIsolation: true, preload };

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}
let settingWindow: BrowserWindow | null = null;
let isQuitting = false;
let pendingRoom: RoomConnection | null = null;
let settingReady = false;
type FlowSession = {
  flowWindow: BrowserWindow | null;
  stopWindow: BrowserWindow | null;
};
let flowSession: FlowSession | null = null;

const bringForward = (window: BrowserWindow | null) => {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
};

const selectRoomFromLink = (value: string) => {
  const room = parseRoomLink(value);
  if (!room) return;
  pendingRoom = room;
  if (settingReady && settingWindow && !settingWindow.isDestroyed()) {
    settingWindow.webContents.send("room-selected", room);
    pendingRoom = null;
  }
  if (flowSession?.stopWindow && !flowSession.stopWindow.isDestroyed()) {
    // Stage the next room while preserving the presentation already in progress.
    flowSession.stopWindow.webContents.send("room-selected", room);
    bringForward(flowSession.stopWindow);
  } else {
    bringForward(settingWindow);
  }
};

// Register the macOS listener synchronously, before app readiness/cold-start URLs.
app.on("open-url", (event, value) => {
  event.preventDefault();
  selectRoomFromLink(value);
});
const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
app.on("second-instance", (_event, commandLine) => {
  const link = commandLine.find((argument) => argument.startsWith("bolide2:"));
  if (link) selectRoomFromLink(link);
  else bringForward(flowSession?.stopWindow ?? settingWindow);
});
for (const argument of process.argv) {
  if (argument.startsWith("bolide2:")) selectRoomFromLink(argument);
}

const loadPage = async (
  window: BrowserWindow,
  page: "setting" | "flow-text" | "stop",
  query?: URLSearchParams
) => {
  const search = query ? `?${query.toString()}` : "";
  const origin = isProd ? "app://." : `http://localhost:${process.argv[2]}`;
  await window.loadURL(`${origin}/${page}${search}`);
};

const destroyWindow = (window: BrowserWindow | null) => {
  if (window && !window.isDestroyed()) window.destroy();
};

const stopFlowText = () => {
  const session = flowSession;
  flowSession = null;
  if (session) {
    destroyWindow(session.stopWindow);
    destroyWindow(session.flowWindow);
  }
  if (!isQuitting && settingWindow && !settingWindow.isDestroyed()) {
    settingWindow.show();
  }
};

const createSessionWindow = (
  session: FlowSession,
  options: BrowserWindowConstructorOptions
) => {
  const window = new BrowserWindow({ ...options, show: false, webPreferences });
  window.once("closed", () => {
    if (flowSession === session) stopFlowText();
  });
  return window;
};

const reportStartError = (error: unknown) => {
  console.error("Could not start text flow:", error);
  if (settingWindow && !settingWindow.isDestroyed()) {
    settingWindow.webContents.send("flow-text-error", {
      message: error instanceof Error ? error.message : "表示を開始できませんでした。",
    });
  }
};

const startFlowText = async (option: FlowTextOption) => {
  if (flowSession || !settingWindow || settingWindow.isDestroyed() || isQuitting) {
    return;
  }
  const session: FlowSession = { flowWindow: null, stopWindow: null };
  flowSession = session;

  try {
    const workArea = screen.getPrimaryDisplay().workArea;
    const flowWindow = createSessionWindow(session, {
      ...workArea,
      transparent: true,
      frame: false,
      resizable: false,
      hasShadow: false,
    });
    session.flowWindow = flowWindow;
    flowWindow.setIgnoreMouseEvents(true);
    flowWindow.setAlwaysOnTop(true, "screen-saver");
    flowWindow.setVisibleOnAllWorkspaces(true);

    const stopWindow = createSessionWindow(session, {
      width: 380,
      height: 250,
      title: "bolide2 コメント表示中",
      closable: false,
      maximizable: false,
      resizable: false,
    });
    session.stopWindow = stopWindow;

    const query = new URLSearchParams({
      fontSize: option.fontSize.toString(),
      fontColors: JSON.stringify(option.fontColors),
      flowAreas: option.flowAreas.join(","),
      testMode: option.testMode.toString(),
      windowHeight: workArea.height.toString(),
      windowWidth: workArea.width.toString(),
      wsUrl: option.wsUrl ?? "",
      flowDurationSeconds: (option.flowDurationSeconds ?? 10).toString(),
    });
    const stopQuery = new URLSearchParams({ wsUrl: option.wsUrl ?? "" });
    await Promise.all([
      loadPage(flowWindow, "flow-text", query),
      loadPage(stopWindow, "stop", stopQuery),
    ]);

    if (flowSession !== session) return;
    settingWindow?.hide();
    flowWindow.showInactive();
    stopWindow.show();
  } catch (error) {
    if (flowSession !== session) return;
    stopFlowText();
    reportStartError(error);
  }
};

const isSenderWindow = (event: IpcMainEvent | IpcMainInvokeEvent, window: BrowserWindow | null) =>
  window !== null &&
  !window.isDestroyed() &&
  event.sender === window.webContents &&
  event.senderFrame === window.webContents.mainFrame;

ipcMain.handle("get-selected-room", (event, value: unknown) => {
  if (value !== null || !isSenderWindow(event, settingWindow)) return null;
  // The renderer subscribes before requesting this handshake, so future links
  // can be delivered directly without leaving stale imports queued for reload.
  settingReady = true;
  const room = pendingRoom;
  pendingRoom = null;
  return room;
});
ipcMain.handle("open-room-page", async (event, value: unknown) => {
  if (!(isSenderWindow(event, settingWindow) || isSenderWindow(event, flowSession?.stopWindow ?? null))) {
    return { ok: false, error: "この画面からブラウザを開くことはできません。" };
  }
  const url = resolveRoomPage(value);
  if (!url) return { ok: false, error: "参加URLとルームの設定を確認してください。" };
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch {
    return { ok: false, error: "ブラウザを開けませんでした。参加URLをコピーして開いてください。" };
  }
});

ipcMain.on("start-flow-text", (event, value: unknown) => {
  if (!isSenderWindow(event, settingWindow)) return;
  try {
    void startFlowText(normalizeFlowTextOption(value));
  } catch (error) {
    reportStartError(error);
  }
});

for (const channel of ["stop-text-flow", "back-to-setting"] as const) {
  ipcMain.on(channel, (event, value: unknown) => {
    if (
      value === null &&
      (isSenderWindow(event, settingWindow) ||
        isSenderWindow(event, flowSession?.flowWindow ?? null) ||
        isSenderWindow(event, flowSession?.stopWindow ?? null))
    ) {
      stopFlowText();
    }
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  stopFlowText();
});
app.on("window-all-closed", () => app.quit());

const openSettingWindow = async () => {
  await app.whenReady();
  // Installed builds register the protocol. Dev/test runs do not alter OS handlers.
  if (app.isPackaged && !process.env.BOLIDE2_SMOKE_USER_DATA) {
    app.setAsDefaultProtocolClient("bolide2");
  }
  if (process.platform === "darwin") app.dock?.hide();

  const window = createWindow("setting", {
    width: 1000,
    height: 760,
    title: "bolide2 発表の準備",
    show: false,
    webPreferences,
  });
  settingWindow = window;
  window.webContents.on("did-start-loading", () => { settingReady = false; });
  window.once("closed", () => {
    settingWindow = null;
    settingReady = false;
    stopFlowText();
  });
  await loadPage(window, "setting");
  if (window.isDestroyed() || isQuitting) return;
  window.show();
  if (!isProd) window.webContents.openDevTools();
};

if (ownsInstance) void openSettingWindow().catch((error: unknown) => {
  console.error("Could not open settings:", error);
  app.quit();
});
