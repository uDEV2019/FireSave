import path from "path";
import { app } from "electron";
// @ts-ignore
import appRoot from "app-root-path";

export const { NODE_ENV, PORT, START_MINIMIZED } = process.env;

export const SENTRY_DSN =
  "https://8067b69a6c824137afacdf25c3d8987b@o240795.ingest.sentry.io/5594347";

export const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "assets")
  : path.join(__dirname, "../../../assets");

export const STEAM_APP_ID = 1904150;

let APP_ROOT_PATH = appRoot.toString();
// TODO: replacement required only in production
if (process.platform === "darwin") {
  APP_ROOT_PATH = APP_ROOT_PATH.replace(
    "/FireSave.app/Contents/Resources/app.asar/dist/main",
    ""
  );
}

export const DEFAULT_STORES_PATH = path.join(APP_ROOT_PATH, "FireSave_Data");

export const APP_VERSION = app.getVersion();

export const PLATFORM = process.platform;

export const SCREENSHOTS_FOLDER_NAME = "__screenshots";
