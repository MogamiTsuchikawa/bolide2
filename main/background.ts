import path from "path";
import { app, BrowserWindow, ipcMain, screen } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { FlowTextOption } from "../interface/app";
import { electron } from "process";

const isProd = process.env.NODE_ENV === "production";
const isMac = process.platform === "darwin";

if (isMac) {
  app.dock.hide();
}
if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}
let settingWindow: BrowserWindow | null = null;
let flowTextWindow: BrowserWindow | null = null;
let stopWindow: BrowserWindow | null = null;
(async () => {
  await app.whenReady();

  settingWindow = createWindow("setting", {
    width: 1000,
    height: 600,
    title: "bolide2 設定",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isProd) {
    await settingWindow.loadURL("app://./setting");
  } else {
    const port = process.argv[2];
    await settingWindow.loadURL(`http://localhost:${port}/setting`);
    settingWindow.webContents.openDevTools();
  }
})();

const openFlowTextWindow = async (option: FlowTextOption) => {
  settingWindow?.hide();

  flowTextWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  flowTextWindow.setIgnoreMouseEvents(true);
  flowTextWindow.setAlwaysOnTop(true, "screen-saver"); // 常に最前面に表示する
  flowTextWindow.setVisibleOnAllWorkspaces(true);
  flowTextWindow.setPosition(0, 0);
  const queryStr = new URLSearchParams({
    fontSize: option.fontSize.toString(),
    fontColors: option.fontColors.join(","),
    flowAreas: option.flowAreas.join(","),
    testMode: option.testMode ? "true" : "false",
    windowHeight: screen.getPrimaryDisplay().workAreaSize.height.toString(),
    windowWidth: screen.getPrimaryDisplay().workAreaSize.width.toString(),
    wsUrl: option.wsUrl,
  }).toString();
  if (isProd) {
    await flowTextWindow.loadURL("app://./flow-text?" + queryStr);
  } else {
    const port = process.argv[2];
    await flowTextWindow.loadURL(
      `http://localhost:${port}/flow-text?${queryStr}`
    );
    //flowTextWindow.webContents.openDevTools();
  }
};

const openStopWindow = async () => {
  stopWindow = new BrowserWindow({
    width: 250,
    height: 150,
    title: "bolide2 停止",
    closable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  if (isProd) {
    await stopWindow.loadURL("app://./stop");
  } else {
    const port = process.argv[2];
    await stopWindow.loadURL(`http://localhost:${port}/stop`);
    //stopWindow.webContents.openDevTools();
  }
};

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("start-flow-text", async (event, arg) => {
  openFlowTextWindow(arg);
  openStopWindow();
});

ipcMain.on("stop-text-flow", async (event, arg) => {
  stopWindow.closable = true;
  stopWindow?.close();
  stopWindow = null;
  flowTextWindow?.close();
  flowTextWindow = null;
  settingWindow?.show();
});
