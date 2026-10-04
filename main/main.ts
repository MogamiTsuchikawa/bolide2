import path from "node:path";
import { app, BrowserWindow, ipcMain, screen } from "electron";
import type { BrowserWindowConstructorOptions, IpcMainEvent } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { normalizeFlowTextOption } from "./helpers/flow-options";
import type { FlowTextOption } from "../interface/app";

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
type FlowSession = {
  flowWindow: BrowserWindow | null;
  stopWindow: BrowserWindow | null;
};
let flowSession: FlowSession | null = null;

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
      width: 250,
      height: 150,
      title: "bolide2 停止",
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
    });
    await Promise.all([
      loadPage(flowWindow, "flow-text", query),
      loadPage(stopWindow, "stop"),
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

const isSenderWindow = (event: IpcMainEvent, window: BrowserWindow | null) =>
  window !== null &&
  !window.isDestroyed() &&
  event.sender === window.webContents &&
  event.senderFrame === window.webContents.mainFrame;

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
  if (process.platform === "darwin") app.dock?.hide();

  const window = createWindow("setting", {
    width: 1000,
    height: 600,
    title: "bolide2 設定",
    show: false,
    webPreferences,
  });
  settingWindow = window;
  window.once("closed", () => {
    settingWindow = null;
    stopFlowText();
  });
  await loadPage(window, "setting");
  if (window.isDestroyed() || isQuitting) return;
  window.show();
  if (!isProd) window.webContents.openDevTools();
};

void openSettingWindow().catch((error: unknown) => {
  console.error("Could not open settings:", error);
  app.quit();
});
