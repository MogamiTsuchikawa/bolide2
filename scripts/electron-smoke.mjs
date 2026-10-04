import assert from "node:assert/strict";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "playwright";
import { WebSocket, WebSocketServer } from "ws";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const appRoot = path.resolve(process.env.BOLIDE2_SMOKE_ASAR || projectRoot);
const outputDirectory = path.resolve(
  process.env.BOLIDE2_SMOKE_OUTPUT || path.join(projectRoot, "output", "playwright"),
);
const require = createRequire(import.meta.url);
const checkTimeout = 8_000;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function withTimeout(promise, label, milliseconds = checkTimeout) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function until(condition, label, milliseconds = checkTimeout) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    const result = await condition();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}

if (!existsSync(appRoot) || (!process.env.BOLIDE2_SMOKE_ASAR &&
    !existsSync(path.join(appRoot, "app", "main.js")))) {
  throw new Error("Production build missing. Run npm run build:check before test:electron.");
}

await mkdir(outputDirectory, { recursive: true });
const userData = await mkdtemp(path.join(tmpdir(), "bolide2-smoke-userdata-"));
const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
const rendererErrors = [];
const observedPages = new WeakSet();
const screenshotPaths = [];
let electron;
let setting;

const observePage = (page) => {
  if (observedPages.has(page)) return;
  observedPages.add(page);
  page.setDefaultTimeout(checkTimeout);
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  page.on("crash", () => rendererErrors.push(`Renderer crashed: ${page.url()}`));
};

const windowState = () => withTimeout(
  electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => ({
    url: window.webContents.getURL(),
    visible: window.isVisible(),
  }))),
  "read Electron windows",
);

const pageFor = (route) => until(
  () => electron.windows().find((page) => page.url().includes(`/${route}`)),
  `${route} page`,
);

const settingsRestored = async () => {
  const windows = await windowState();
  return windows.length === 1 && windows[0].visible && windows[0].url.includes("/setting");
};

async function screenshot(page, name) {
  const screenshotPath = path.join(outputDirectory, `electron-smoke-${name}.png`);
  await page.screenshot({ path: screenshotPath });
  screenshotPaths.push(screenshotPath);
}

async function runSmoke(wsUrl, port) {
  setting = await electron.firstWindow();
  observePage(setting);
  await setting.getByRole("heading", { name: "ルーム設定", exact: true }).waitFor();
  assert.equal(await setting.evaluate(() => typeof window.ipc.send), "function");
  assert.equal(await setting.evaluate(() => typeof window.require), "undefined");
  assert.equal(await electron.evaluate(({ app }) => app.getPath("userData")), userData);
  await screenshot(setting, "settings");
  console.log("Production Electron startup and isolated IPC bridge passed");

  await setting.getByLabel("サーバーURL", { exact: true }).fill(`http://127.0.0.1:${port}`);
  await setting.getByLabel(/ルームID/).fill("1a2b-3c4d 5e6f7g8h");
  assert.equal(await setting.getByLabel(/ルームID/).inputValue(), "1A2B3C4D5E6F7G8H");
  await until(() => setting.getByRole("button", { name: "スタート", exact: true }).isEnabled(),
    "connection validation");
  await until(() => server.clients.size === 0, "validation socket closes");

  await setting.getByRole("button", { name: "テキスト色とサイズ", exact: true }).click();
  await setting.getByLabel("フォントサイズ", { exact: true }).fill("72");
  await setting.getByLabel("色 1 のコードまたはCSS色名", { exact: true }).fill("rgb(255, 0, 0)");
  await setting.getByRole("button", { name: "ルーム設定", exact: true }).click();
  assert.equal(await setting.getByLabel(/ルームID/).inputValue(), "1A2B3C4D5E6F7G8H");
  await setting.getByRole("button", { name: "テキスト色とサイズ", exact: true }).click();
  assert.equal(await setting.getByLabel("フォントサイズ", { exact: true }).inputValue(), "72");
  assert.equal(await setting.getByLabel("色 1 のコードまたはCSS色名", { exact: true }).inputValue(),
    "rgb(255, 0, 0)");
  await setting.getByRole("button", { name: "ルーム設定", exact: true }).click();
  console.log("Connection probe, room ID normalization and settings retention passed");

  const option = {
    fontSize: 72,
    fontColors: ["rgb(255, 0, 0)", "blue"],
    flowAreas: [0, 20, 40],
    testMode: false,
    wsUrl,
  };
  await setting.getByRole("button", { name: "スタート", exact: true }).click();
  await setting.evaluate((payload) => window.ipc.send("start-flow-text", payload), option);
  await until(async () => (await windowState()).filter((window) => window.visible).length === 2,
    "start opens flow and stop windows");
  const windows = await windowState();
  assert.equal(windows.length, 3, "duplicate start must not create additional windows");
  assert.equal(windows.find((window) => window.url.includes("/setting"))?.visible, false);
  const flow = await pageFor("flow-text");
  const stop = await pageFor("stop");
  const query = new URL(flow.url()).searchParams;
  assert.equal(query.get("fontSize"), "72");
  assert.equal(JSON.parse(query.get("fontColors"))[0], "rgb(255, 0, 0)");
  assert.equal(query.get("wsUrl"), wsUrl);
  const socket = await until(
    () => [...server.clients].find((client) => client.readyState === WebSocket.OPEN),
    "flow WebSocket connects",
  );
  socket.send("not-json");
  socket.send("null");
  socket.send(JSON.stringify({ type: "comment.created", body: { text: "新しい形式のコメント" } }));
  socket.send(JSON.stringify({ comment: "以前の形式のコメント" }));
  await flow.getByText("新しい形式のコメント", { exact: true }).waitFor();
  await flow.getByText("以前の形式のコメント", { exact: true }).waitFor();
  const comments = flow.locator('div[style*="animation"]');
  const rows = await comments.evaluateAll((nodes) => nodes.map((node) => node.style.top));
  assert.equal(rows.length, 2, "malformed payloads must not add comments");
  assert.equal(new Set(rows).size, 2, "active comments should use separate available rows");
  assert.equal(await flow.getByText("新しい形式のコメント", { exact: true })
    .evaluate((node) => node.style.fontSize), "72px");
  await flow.waitForFunction(() => {
    const comment = document.querySelector('div[style*="animation"]');
    return comment && comment.getBoundingClientRect().left < window.innerWidth - 100;
  });
  await screenshot(flow, "flow");
  await until(async () => await comments.count() === 0, "finished comments removed", 12_000);
  console.log("Current/legacy comments, malformed payloads, row occupancy and animation cleanup passed");

  await stop.getByRole("button", { name: "テキスト流しを終了", exact: true }).click();
  await until(settingsRestored, "stop restores settings");
  await until(() => server.clients.size === 0, "flow WebSocket closes after stop");
  await setting.evaluate(() => {
    window.ipc.send("stop-text-flow", null);
    window.ipc.send("stop-text-flow", null);
  });
  assert.ok(await settingsRestored(), "duplicate stop must retain the settings window");

  await setting.evaluate((payload) => window.ipc.send("start-flow-text", payload),
    { ...option, testMode: true, wsUrl: "" });
  await until(async () => (await windowState()).length === 3, "preview windows open");
  const preview = await pageFor("flow-text");
  await preview.getByText("TEST0", { exact: true }).waitFor();
  assert.equal(await preview.getByText("TEST0", { exact: true })
    .evaluate((node) => node.style.top), "0%");
  await until(settingsRestored, "preview automatically returns to settings", 12_000);
  console.log("Stop, duplicate stop and preview auto return passed");

  await electron.evaluate(({ session }) => {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["app://*/stop*"] },
      (_details, callback) => callback({ cancel: true }));
  });
  try {
    await setting.evaluate((payload) => window.ipc.send("start-flow-text", payload), option);
    await setting.getByRole("alert").waitFor();
    await until(settingsRestored, "failed page load rolls back both windows");
  } finally {
    await electron.evaluate(({ session }) => session.defaultSession.webRequest.onBeforeRequest(null));
  }
  await setting.evaluate((payload) => window.ipc.send("start-flow-text", payload), option);
  await until(async () => (await windowState()).filter((window) => window.visible).length === 2,
    "restart after failed page load");
  const resumedStop = await pageFor("stop");
  await resumedStop.getByRole("button", { name: "テキスト流しを終了", exact: true }).click();
  await until(settingsRestored, "final stop restores settings");
  await until(() => server.clients.size === 0, "final flow WebSocket closes");
  assert.deepEqual(rendererErrors, [], "renderers must not throw or crash during the smoke flow");
  console.log("Failed load rollback and restart passed");
}

try {
  await withTimeout(once(server, "listening"), "mock WebSocket server starts");
  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/rooms/1A2B3C4D5E6F7G8H/ws`;
  const env = {
    ...process.env,
    BOLIDE2_SMOKE_APP_ROOT: appRoot,
    BOLIDE2_SMOKE_USER_DATA: userData,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  // Resolve at launch time so a missing Electron download gives its own diagnostic.
  electron = await _electron.launch({
    executablePath: require("electron"),
    args: [
      ...(process.platform === "linux" ? ["--no-sandbox"] : []),
      fileURLToPath(new URL("./electron-smoke-bootstrap.mjs", import.meta.url)),
    ],
    cwd: projectRoot,
    env,
    timeout: 30_000,
  });
  electron.on("window", observePage);
  electron.windows().forEach(observePage);
  await withTimeout(runSmoke(wsUrl, port), "complete Electron smoke", 90_000);
  console.log(JSON.stringify({ status: "passed", platform: process.platform, appRoot,
    checks: ["production startup", "isolated IPC bridge", "connection probe", "room ID normalization",
      "settings retention", "start and duplicate start", "current and legacy comments",
      "malformed payloads", "row occupancy", "animation cleanup", "WebSocket cleanup",
      "stop and duplicate stop", "preview auto return", "load failure rollback", "restart after failure"],
    screenshots: screenshotPaths }, null, 2));
} catch (error) {
  if (setting && !setting.isClosed()) {
    await withTimeout(screenshot(setting, "failure"), "failure screenshot", 2_000).catch(() => {});
  }
  throw error;
} finally {
  try {
    if (electron) {
      try {
        await withTimeout(electron.close(), "Electron shutdown", 8_000);
      } catch (error) {
        electron.process().kill();
        throw error;
      }
    }
  } finally {
    for (const socket of server.clients) socket.terminate();
    try {
      await withTimeout(new Promise((resolve, reject) => server.close((error) =>
        error ? reject(error) : resolve())), "mock WebSocket server shutdown", 5_000);
    } finally {
      await rm(userData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }
}
