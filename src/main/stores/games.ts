import ElectronStore from "electron-store";

import persistentStore from "./persistent";
import { PLATFORM } from "../utils/config";

const gamesStore = new ElectronStore<TGamesStore>({
  cwd: persistentStore.store.gamesStorePath,
  name: "games",
  defaults: {
    games: {},
    savePoints: {},
  },
  migrations: {
    "1.0.0": (settings) => {
      console.log("MIGRATION RUNNED");
    },
    "0.3.23": (store) => {
      const games = store.store.games;
      Object.entries(games).forEach(([, game]) => {
        const saveConfig = game.savesConfig?.[PLATFORM];
        if (saveConfig && !saveConfig?.type) {
          saveConfig.type = "simple";
        }
      });
      store.set("games", games);
    },
  },
});

export default gamesStore;
