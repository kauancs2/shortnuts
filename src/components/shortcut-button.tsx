import { useState, useEffect, useRef } from "react";
import { AppWindow, File, Keyboard } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";

type shortcutProps = {
  id: string;
  globalHotkeysEnabled: boolean;
};

const MAPA_TECLAS: Record<string, string> = {
  ctrl: "control",
  control: "control",
  shift: "shift",
  alt: "alt",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  esc: "escape",
  enter: "enter",
  space: "space",
  tab: "tab",
  backspace: "backspace",
  delete: "delete",
  insert: "insert",
  home: "home",
  end: "end",
  pageup: "pageup",
  pagedown: "pagedown",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  f1: "f1",
  f2: "f2",
  f3: "f3",
  f4: "f4",
  f5: "f5",
  f6: "f6",
  f7: "f7",
  f8: "f8",
  f9: "f9",
  f10: "f10",
  f11: "f11",
  f12: "f12",
};

export function ShortcutButton({ id, globalHotkeysEnabled }: shortcutProps) {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string>("");
  const [resolucaoSelecionada, setResolucaoSelecionada] = useState<string>("");
  const [teclas, setTeclas] = useState<string[]>([]);
  const [teclasAtalho, setTeclasAtalho] = useState<string[]>([]);
  const [caminhoArquivo, setCaminhoArquivo] = useState<string | null>(null);
  const [inicializado, setInicializado] = useState(false);
  const [idAtalho] = useState(() => `atalho-${id}-${Math.random().toString(36).substr(2, 9)}`);
  const executando = useRef(false);

  function logDebug(mensagem: string, dados?: any) {
    console.log(`[BotaoAtalho ${id}] ${mensagem}`, dados || '');
  }

  function formatarTeclas(lista: string[]) {
    const formatado = lista
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .map(function (t) {
        const minuscula = t.toLowerCase();
        return MAPA_TECLAS[minuscula] || minuscula;
      })
      .join("+");

    logDebug("Formatando teclas", { input: lista, output: formatado });
    return formatado;
  }

  function normalizarTeclas(lista: string[]) {
    const normalizado = lista.map(function (t) {
      const minuscula = t.toLowerCase();
      switch (minuscula) {
        case "control": return "ctrl";
        case "escape": return "esc";
        case "command":
        case "cmd": return "meta";
        default: return minuscula;
      }
    });

    logDebug("normalizando teclas", { input: lista, output: normalizado });
    return normalizado;
  }

  async function executarAcaoCombinada() {
    if (executando.current) return;
    executando.current = true;

    try {
      logDebug("Executando ação combinada", { opcaoSelecionada, teclas });

      if (opcaoSelecionada === "resolutions") {
        await definirResolucao();
      } else if (opcaoSelecionada === "open file") {
        await abrirArquivo();
      }

      if (teclas.length > 0) {
        await enviarTeclas();
      }

      logDebug("ação combinada concluída com sucesso");
    } catch (erro) {
      console.error(`[BotaoAtalho ${id}] Erro ao executar ação combinada`, erro);
    } finally {
      setTimeout(function () {
        executando.current = false;
      }, 500);
    }
  }

  async function abrirArquivo() {
    logDebug("executando abrirArquivo", { caminhoArquivo });
    if (!caminhoArquivo) return;

    try {
      await invoke("open_file", { path: caminhoArquivo });
      logDebug("arquivo aberto com sucesso");
    } catch (erro) {
      console.error(`[BotaoAtalho ${id}] Falha ao abrir arquivo`, erro);
    }
  }

  async function definirResolucao() {
    logDebug("executando definirResolucao", { resolucaoSelecionada });
    if (!resolucaoSelecionada) return;

    try {
      const [largura, altura] = resolucaoSelecionada.split("x").map(Number);
      await invoke("set_resolution", { width: largura, height: altura });
      logDebug("resolução definida com sucesso");
    } catch (erro) {
      console.error(`[BotaoAtalho ${id}] Falha ao definir resolução`, erro);
    }
  }

  async function enviarTeclas() {
    if (teclas.length === 0) {
      logDebug("nenhuma tecla especificada");
      return;
    }

    try {
      const normalizado = normalizarTeclas(teclas);
      logDebug("enviando teclas para backend", { normalizado });

      await new Promise(resolve => setTimeout(resolve, 100));
      await invoke("input_keys", { combo: { keys: normalizado } });

      logDebug("teclas enviadas com sucesso");
    } catch (erro) {
      console.error(`[BotaoAtalho ${id}] Falha ao enviar teclas`, erro);
    }
  }

  useEffect(function () {
    async function carregarStore() {
      try {
        const store = await Store.load(`shortcuts-${id}.json`);
        const resultado = await Promise.all([
          store.get<string>("selectedOption"),
          store.get<string>("selectedResolution"),
          store.get<string[]>("keys"),
          store.get<string[]>("keysBind"),
          store.get<string>("filePath"),
        ]);

        setOpcaoSelecionada(resultado[0] || "");
        setResolucaoSelecionada(resultado[1] || "");
        setTeclas(resultado[2] || []);
        setTeclasAtalho(resultado[3] || []);
        setCaminhoArquivo(resultado[4] || null);
        setInicializado(true);
      } catch (erro) {
        console.error(`[BotaoAtalho ${id}] Erro ao carregar store`, erro);
        setInicializado(true);
      }
    }

    carregarStore();
  }, [id]);

  useEffect(function () {
    if (!inicializado) return;

    const intervalo = setInterval(async function () {
      try {
        const store = await Store.load(`shortcuts-${id}.json`);
        const resultado = await Promise.all([
          store.get<string>("selectedOption"),
          store.get<string>("selectedResolution"),
          store.get<string[]>("keys"),
          store.get<string[]>("keysBind"),
          store.get<string>("filePath"),
        ]);

        setOpcaoSelecionada(resultado[0] || "");
        setResolucaoSelecionada(resultado[1] || "");
        setTeclas(resultado[2] || []);
        setTeclasAtalho(resultado[3] || []);
        setCaminhoArquivo(resultado[4] || null);
      } catch (erro) {
        console.error(`[BotaoAtalho ${id}] Erro ao recarregar store`, erro);
      }
    }, 1000);

    return function () {
      clearInterval(intervalo);
    };
  }, [id, inicializado]);

  useEffect(function () {
    if (!inicializado || teclasAtalho.length === 0) return;

    async function gerenciarAtalho() {
      try {
        if (globalHotkeysEnabled) {
          const acelerador = formatarTeclas(teclasAtalho)
            .toLowerCase()
            .replace(/control/g, "ctrl")
            .replace(/command|cmd/g, "meta");

          await invoke("register_global_hotkey", { id: idAtalho, accelerator: acelerador });
        } else {
          await invoke("unregister_global_hotkey", { id: idAtalho });
        }
      } catch (erro) {
        console.error(`[BotaoAtalho ${id}] Erro ao gerenciar atalho`, erro);
      }
    }

    gerenciarAtalho();

    return function () {
      invoke("unregister_global_hotkey", { id: idAtalho }).catch(function (erro) {
        console.error(`[BotaoAtalho ${id}] Erro ao remover atalho`, erro);
      });
    };
  }, [teclasAtalho, inicializado, idAtalho, id, globalHotkeysEnabled]);

  useEffect(function () {
    if (!inicializado || !globalHotkeysEnabled) return;

    let pararEscuta: () => void;

    async function configurarListener() {
      try {
        pararEscuta = await listen<string>("global_hotkey_pressed", function (evento) {
          if (evento.payload === idAtalho) {
            executarAcaoCombinada();
          }
        });
      } catch (erro) {
        console.error(`[BotaoAtalho ${id}] Erro ao configurar ouvinte`, erro);
      }
    }

    configurarListener();

    return function () {
      if (pararEscuta) pararEscuta();
    };
  }, [inicializado, idAtalho, id, executarAcaoCombinada, globalHotkeysEnabled]);

  async function aoClicar() {
    if (executando.current) return;
    await executarAcaoCombinada();
  }

  function obterConteudo() {
    if (opcaoSelecionada === "resolutions" && resolucaoSelecionada) {
      return (
        <>
          <AppWindow size={20} />
          <h1>{resolucaoSelecionada}</h1>
        </>
      );
    } else if (opcaoSelecionada === "open file" && caminhoArquivo) {
      const nomeArquivo = caminhoArquivo.split(/[\\/]/).pop() || caminhoArquivo;
      return (
        <>
          <File size={20} />
          <h1>{nomeArquivo}</h1>
        </>
      );
    } else if (opcaoSelecionada === "key" && teclas.length > 0) {
      return (
        <>
          <Keyboard size={20} />
          <h1>{formatarTeclas(teclas)}</h1>
        </>
      );
    }
    return null;
  }

  if (!inicializado || !obterConteudo()) return null;

  return (
    <button
      onClick={aoClicar}
      className="w-full text-left group"
      aria-label={`Shortcut ${formatarTeclas(teclasAtalho)} for ${opcaoSelecionada}`}
    >
      <div className="flex items-center gap-2 hover:bg-[#8a5cf6] pl-2 h-7 rounded-md mx-2 transition-colors duration-150">
        {obterConteudo()}
        {opcaoSelecionada !== "key" && teclas.length > 0 && (
          <span className="text-sm">+ {formatarTeclas(teclas)}</span>
        )}
        {teclasAtalho.length > 0 && (
          <span className="text-xs text-gray-300 ml-auto pr-2 group-hover:text-white">
            {formatarTeclas(teclasAtalho)}
          </span>
        )}
      </div>
    </button>
  );
}
