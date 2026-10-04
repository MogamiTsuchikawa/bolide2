import { screen, BrowserWindow } from "electron";
import type { BrowserWindowConstructorOptions, Rectangle } from "electron";
import Store from "electron-store";
import { restoreWindowState } from "./window-state";

type WindowStateStore = { "window-state": Rectangle };

export const createWindow = (
  windowName: string,
  options: BrowserWindowConstructorOptions
): BrowserWindow => {
  const key = "window-state";
  const store = new Store<WindowStateStore>({
    name: `window-state-${windowName}`,
  });
  let state = restoreWindowState(
    store.get(key),
    screen.getAllDisplays().map((display) => display.workArea),
    screen.getPrimaryDisplay().workArea,
    { width: options.width ?? 800, height: options.height ?? 600 }
  );

  const win = new BrowserWindow({
    ...options,
    ...state,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      ...options.webPreferences,
    },
  });

  win.on("close", () => {
    if (!win.isMinimized() && !win.isMaximized()) {
      state = win.getBounds();
    }
    store.set(key, state);
  });

  return win;
};
