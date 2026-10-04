import { app } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The parent process owns this temporary profile and removes it after shutdown.
const appRoot = process.env.BOLIDE2_SMOKE_APP_ROOT;
const userData = process.env.BOLIDE2_SMOKE_USER_DATA;
if (!appRoot || !userData) {
  throw new Error("Run this bootstrap through npm run test:electron.");
}

app.setName("bolide2-smoke");
app.setAppPath(appRoot);
app.setPath("userData", userData);
await import(pathToFileURL(path.join(appRoot, "app", "main.js")).href);
