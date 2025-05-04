import { useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ShortcutButton } from "../components/shortcut-button";
import { Switch } from "../components/ui/switch";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { Squirrel } from "lucide-react";

function abrirNovaJanela() {
  const settings = new WebviewWindow("janela-secundaria", {
    url: "/settings",
    width: 800,
    height: 500,
    center: true,
    title: "shortnuts",
    resizable: false,
  });

  settings.once("tauri://created", function () {
    console.log("nova janela");
  });

  settings.once("tauri://error", function (e) {
    console.error("erro ao criar janela:", e);
  });
}

export function App() {
  const [globalHotkeysEnabled, setGlobalHotkeysEnabled] = useState(true);

  async function toggleGlobalHotkeys(enabled: boolean) {
    setGlobalHotkeysEnabled(enabled);
    try {
      const store = await Store.load("settings.json");
      await store.set("globalHotkeysEnabled", enabled);
      await store.save();
    } catch (error) {
      console.error("erro ao salvar no json:", error);
    }
  }

  return (
    <div className="flex flex-col gap-0.5 text-white font-normal text-sm cursor-default">
      <div className="pl-2 mx-2 pt-4 flex items-center gap-2">
        <Squirrel size={15} />
        <h1>shortnuts</h1>
        <div className="ml-20 gap-2 flex items-center">
          <h1>binds:</h1>
          <Switch 
            checked={globalHotkeysEnabled}
            onCheckedChange={toggleGlobalHotkeys}
          />
        </div>
      </div>
     
      <div className="bg-zinc-500 w-[248px] h-px mx-auto mb-2 mt-2" />

      <ShortcutButton id="1" globalHotkeysEnabled={globalHotkeysEnabled} />
      <ShortcutButton id="2" globalHotkeysEnabled={globalHotkeysEnabled} />
      <ShortcutButton id="3" globalHotkeysEnabled={globalHotkeysEnabled} />
      <ShortcutButton id="4" globalHotkeysEnabled={globalHotkeysEnabled} />
      <ShortcutButton id="5" globalHotkeysEnabled={globalHotkeysEnabled} />

      <div className="bg-zinc-500 w-[248px] h-px mx-auto mt-2 mb-2" />
      <h1 onClick={abrirNovaJanela} className="pl-2 pt-1 hover:bg-[#8a5cf6] h-7 rounded-md mx-2 transition-colors duration-150">
        Settings
      </h1>
      <h1
        className="pl-2 pt-1 hover:bg-red-500 h-7 rounded-md mx-2 transition-colors duration-150"
        onClick={function () {
          invoke("quit_app");
        }}
      >
        Quit
      </h1>
    </div>
  );
}
