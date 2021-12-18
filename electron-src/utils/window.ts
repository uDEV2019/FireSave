import { BrowserWindow } from "electron";

import Stores from "./stores";

const savePositionAndSize = (mainWindow: BrowserWindow) => {
  const position = mainWindow.getPosition();
  const size = mainWindow.getSize();
  const isMaximized = mainWindow.isMaximized();

  const newWindowState = {
    x: position[0],
    y: position[1],
    width: size[0],
    height: size[1],
    isMaximized,
  };
  Stores.Settings.set("window", newWindowState);
};

const loadPositionAndSize = () => {
  return Stores.Settings.store.window;
};

const WindowUtils = {
  savePositionAndSize,
  loadPositionAndSize,
};

export default WindowUtils;
