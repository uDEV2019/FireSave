/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from "path";
import fs from "fs";
import { app, ipcMain, nativeTheme, protocol } from "electron";
import isDev from "electron-is-dev";
import * as backend from "i18next-electron-fs-backend";

import Logger from "./utils/logger";
Logger.init();

import i18n, { setupI18n } from "./utils/i18n";
import Games from "./utils/games";
import Stores from "./stores";
import Capture from "./utils/capture";
import Scheduler from "./utils/scheduler";
import Shortcuts from "./utils/shortcuts";
import AppUpdater from "./utils/updater";
import MainWindow from "./windows/mainWindow";
import SteamworksSDK from "./utils/steamworksSDK";
import MenuBuilder from "./windows/mainWindow/menu";
import { getAssetPath } from "./utils";
import {
  PLATFORM,
  RESOURCES_PATH,
  ASSETS_PATH,
  APP_VERSION,
} from "./utils/config";
import "./handlers";
import {
  STEAM_LANGUGE_TO_CODES_MAP,
  TSteamLanguage,
} from "../common/steamLangCodesMap";

const isDebug =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

class Main {
  private mainWindow: MainWindow | null = null;
  private menuBuilder: MenuBuilder | undefined = undefined;

  constructor() {
    if (process.env.NODE_ENV === "production") {
      const sourceMapSupport = require("source-map-support");
      sourceMapSupport.install();
    }

    if (isDebug) {
      require("electron-debug")();
    }

    app.on("will-quit", this.onWillQuit.bind(this));
    app.on("window-all-closed", this.onAllWindowsClosed.bind(this));

    app.on("ready", this.onReady.bind(this));
    app.on("activate", this.activate.bind(this));
  }

  onWillQuit() {
    Shortcuts.unregisterAll();
  }

  onAllWindowsClosed() {
    Shortcuts.unregisterAll();
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== "darwin") {
      app.quit();
    } else {
      backend.clearMainBindings(ipcMain);
    }
  }

  activate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this.mainWindow === null) this.createWindow();
  }

  initSteamworks() {
    try {
      const isSteamworksAvailable = SteamworksSDK.init();
      if (isSteamworksAvailable) {
        console.info("[main.ts/initSteamworks()] Steamworks is available");
      }
      Stores.Settings.set(
        "envs.IS_STEAMWORKS_AVAILABLE",
        isSteamworksAvailable
      );
    } catch (err) {
      Stores.Settings.set("envs.IS_STEAMWORKS_AVAILABLE", false);
      console.error(err);
    }
  }

  async initI18n() {
    i18n.on("initialized", async () => {
      await this.updateLanguageFromSteam();
      i18n.off("initialized");
    });
    setupI18n();
  }

  async updateLanguageFromSteam() {
    const isSteamworksAvailable =
      Stores.Settings.store.envs.IS_STEAMWORKS_AVAILABLE;
    if (!isSteamworksAvailable) return;
    try {
      const language = SteamworksSDK.getCurrentGameLanguage();
      const lng = STEAM_LANGUGE_TO_CODES_MAP[language as TSteamLanguage];
      await i18n.changeLanguage(lng);

      Stores.Settings.set("language", i18n.language);

      this.menuBuilder?.buildMenu();

      console.info("[main.ts/updateLanguageFromSteam()] language updated", lng);
    } catch (err) {
      console.error(err);
    }
  }

  async onReady() {
    this.initSteamworks();
    this.initI18n();

    Stores.Settings.set("version", APP_VERSION);
    Stores.Settings.set("runtimeValues.IS_MAIN_LOADING", true);
    Stores.Settings.set("envs", {
      ...Stores.Settings.store.envs,
      PLATFORM,
      RESOURCES_PATH,
      ASSETS_PATH,
      IS_DEV: isDev,
    });

    await Games.verifyGames();
    Capture.verifyPrimaryDisplaySelected();

    Stores.Settings.set("runtimeValues.IS_MAIN_LOADING", false);

    protocol.registerFileProtocol("file", (request, callback) => {
      const pathname = request.url.replace("file:///", "");
      callback(pathname);
    });

    Scheduler.start();
    nativeTheme.themeSource = "dark";

    this.createWindow();
  }

  onMainWindowClose() {
    this.mainWindow = null;
  }

  installExtensions() {
    const installer = require("electron-devtools-installer");
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ["REACT_DEVELOPER_TOOLS"];

    return installer
      .default(
        extensions.map((name) => installer[name]),
        forceDownload
      )
      .catch(console.error);
  }

  async createWindow() {
    if (isDebug) {
      await this.installExtensions();
    }

    this.mainWindow = new MainWindow({
      minimizable: true,
      maximizable: true,
      icon: getAssetPath("icon.png"),
      webPreferences: {
        contextIsolation: true,
        webSecurity: !isDev,
        preload: app.isPackaged
          ? path.join(__dirname, "preload.js")
          : path.join(__dirname, "../../.erb/dll/preload.js"),
        devTools: isDev,
      },
    });

    this.menuBuilder = new MenuBuilder(this.mainWindow);
    this.menuBuilder.buildMenu();

    backend.mainBindings(ipcMain, this.mainWindow, fs);

    this.mainWindow.on("closed", this.onMainWindowClose.bind(this));

    Shortcuts.registerSaveKey(Stores.Settings.store.saveShortcut);

    new AppUpdater();
  }
}

new Main();
