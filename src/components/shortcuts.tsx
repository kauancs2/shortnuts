import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { Settings2, AppWindow, File, Keyboard } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { open } from "@tauri-apps/plugin-dialog";
import { Store } from "@tauri-apps/plugin-store";

type AtalhosProps = {
  id: string; 
};

export function Shortcuts({ id }: AtalhosProps) {
  const [armazenamento, setArmazenamento] = useState<Store | null>(null);
  const [resolucoesDisponiveis, setResolucoesDisponiveis] = useState<[number, number][]>([]);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string>("open file");
  const [resolucaoSelecionada, setResolucaoSelecionada] = useState<string>("");
  const [gravandoTeclas, setGravandoTeclas] = useState(false);
  const [teclas, setTeclas] = useState<string[]>([]);
  const [gravandoAtalho, setGravandoAtalho] = useState(false);
  const [atalhoTeclas, setAtalhoTeclas] = useState<string[]>([]);
  const [caminhoArquivo, setCaminhoArquivo] = useState<string | null>(null);
  const [carregandoArquivo, setCarregandoArquivo] = useState<boolean>(false);
  const [inicializado, setInicializado] = useState(false);

  const nomeArquivo = caminhoArquivo ? caminhoArquivo.split(/[\\/]/).pop() || caminhoArquivo : null;

  useEffect(() => {
    async function carregarDados() {
      try {
        const store = await Store.load(`shortcuts-${id}.json`);
        setArmazenamento(store);

        const [
          opcaoSalva,
          resolucaoSalva,
          teclasSalvas,
          atalhoSalvo,
          caminhoSalvo
        ] = await Promise.all([
          store.get<string>("selectedOption"),
          store.get<string>("selectedResolution"),
          store.get<string[]>("keys"),
          store.get<string[]>("keysBind"),
          store.get<string>("filePath")
        ]);

        setOpcaoSelecionada(opcaoSalva || "open file");
        setResolucaoSelecionada(resolucaoSalva || "");
        setTeclas(teclasSalvas || []);
        setAtalhoTeclas(atalhoSalvo || []);
        setCaminhoArquivo(caminhoSalvo || null);
        setInicializado(true);
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        setOpcaoSelecionada("open file");
        setInicializado(true);
      }
    }

    carregarDados();
  }, [id]);

  useEffect(() => {
    if (armazenamento && inicializado) {
      try {
        armazenamento.set("selectedOption", opcaoSelecionada);
        armazenamento.set("selectedResolution", resolucaoSelecionada);
        armazenamento.set("keys", teclas);
        armazenamento.set("keysBind", atalhoTeclas);
        armazenamento.set("filePath", caminhoArquivo);
        armazenamento.save();
      } catch (erro) {
        console.error("Erro ao salvar armazenamento:", erro);
      }
    }
  }, [opcaoSelecionada, resolucaoSelecionada, teclas, atalhoTeclas, caminhoArquivo, armazenamento, inicializado]);

  useEffect(() => {
    if (armazenamento && inicializado) {
      if (opcaoSelecionada !== "resolutions") {
        setResolucaoSelecionada("");
        armazenamento.set("selectedResolution", "");
      }
      if (opcaoSelecionada !== "open file") {
        setCaminhoArquivo(null);
        armazenamento.set("filePath", "");
      }
    }
  }, [opcaoSelecionada, armazenamento, inicializado]);

  async function buscarResolucoes() {
    try {
      const resolucoes = await invoke<[number, number][]>("get_available_resolutions");
      setResolucoesDisponiveis(resolucoes);
      return resolucoes;
    } catch (erro) {
      console.error("Erro ao buscar resoluções:", erro);
      return [];
    }
  }

  async function selecionarArquivo() {
    try {
      setCarregandoArquivo(true);
      const resultado = await open({
        multiple: false,
        filters: [
          { name: "Imagens", extensions: ["jpg", "png"] },
          { name: "Executáveis", extensions: ["exe"] },
          { name: "Textos", extensions: ["txt"] },
        ],
      });

      if (typeof resultado === "string") {
        setCaminhoArquivo(resultado);
      }

      setCarregandoArquivo(false);
    } catch (erro) {
      setCarregandoArquivo(false);
    }
  }

  function limparArquivo() {
    if (armazenamento) armazenamento.set("filePath", null);
    setCaminhoArquivo(null);
  }

  function alterarResolucao(e: React.ChangeEvent<HTMLSelectElement>) {
    setResolucaoSelecionada(e.target.value);
  }

  useHotkeys(
    "*",
    (evento) => {
      if (gravandoTeclas) {
        evento.preventDefault();
        const tecla = evento.key.toLowerCase();
        setTeclas((prev) => (prev.includes(tecla) ? prev : [...prev, tecla]));
      }
      if (gravandoAtalho) {
        evento.preventDefault();
        const tecla = evento.key.toLowerCase();
        setAtalhoTeclas((prev) => (prev.includes(tecla) ? prev : [...prev, tecla]));
      }
    },
    { enabled: gravandoTeclas || gravandoAtalho, keydown: true, keyup: false }
  );

  function alternarGravacaoTeclas() {
    if (!gravandoTeclas) setTeclas([]);
    setGravandoTeclas(!gravandoTeclas);
  }

  function alternarGravacaoAtalho() {
    if (!gravandoAtalho) setAtalhoTeclas([]);
    setGravandoAtalho(!gravandoAtalho);
  }

  function formatarTeclas(teclas: string[]) {
    return [...new Set(teclas)].join(" + ");
  }

  if (!inicializado) {
    return <div className="text-white">Carregando...</div>;
  }

  return (
    <div className="w-[750px] h-[65px] rounded-xl flex items-center justify-between px-5 mt-2 bg-[#2d2d2d] text-sm">
      {/* Opção principal */}
      <div className="flex items-center">
        <Settings2 size={18} className="pt-0.5" />
        <select
          name="opcoes"
          className="bg-[#2d2d2d] text-white"
          value={opcaoSelecionada}
          onChange={(e) => setOpcaoSelecionada(e.target.value)}
        >
          <option value="open file">open file</option>
          <option value="resolutions">resolutions</option>
          <option value="key">key</option>
        </select>
      </div>

      {/* Resoluções */}
      <div className="flex items-center">
        <AppWindow size={18} className="pt-0.5" />
        <select
          onClick={buscarResolucoes}
          value={resolucaoSelecionada}
          onChange={alterarResolucao}
          disabled={opcaoSelecionada !== "resolutions"}
          className={`min-w-[110px] text-white ${
            opcaoSelecionada !== "resolutions"
              ? "bg-[#444] opacity-50 cursor-not-allowed"
              : "bg-[#2d2d2d]"
          }`}
        >
          <option value="">{resolucaoSelecionada || "choose one"}</option>
          {resolucoesDisponiveis.map(([w, h], i) => (
            <option key={i} value={`${w}x${h}`}>{w}x{h}</option>
          ))}
        </select>
      </div>

      {/* Arquivo */}
      <div className="flex items-center gap-0.5">
        <File size={16} />
        <div className="flex flex-col items-center">
          <button
            onClick={selecionarArquivo}
            className={`text-white ${
              opcaoSelecionada !== "open file"
                ? "bg-[#444] opacity-50 cursor-not-allowed"
                : "bg-[#2d2d2d]"
            }`}
            disabled={carregandoArquivo || opcaoSelecionada !== "open file"}
          >
            {carregandoArquivo ? "Loading..." : "choose file"}
          </button>

          {nomeArquivo && (
            <>
              <p className="text-xs">{nomeArquivo}</p>
              <button
                onClick={limparArquivo}
                className="text-xs text-gray-400 hover:text-white"
                disabled={opcaoSelecionada !== "open file"}
              >
                clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Teclas */}
      <div className="flex items-center gap-2">
        <Keyboard size={16} />
        <div className="flex flex-col">
          <button
            onClick={alternarGravacaoTeclas}
            className="min-w-[100px] mx-auto py-0.5 rounded bg-[#222222] text-white"
          >
            {gravandoTeclas ? "Stop" : "Record"}
          </button>
          <div className="text-xs mt-1 min-w-[100px] pl-0.5">
            {teclas.length > 0 ? formatarTeclas(teclas) : "No keys"}
          </div>
        </div>
      </div>

      {/* Atalho */}
      <div className="flex items-center gap-2">
        <Keyboard size={16} />
        <div className="flex flex-col">
          <button
            onClick={alternarGravacaoAtalho}
            className="px-2 py-0.5 rounded bg-[#222222] text-white"
          >
            {gravandoAtalho ? "Stop" : "Record"}
          </button>
          <div className="text-xs mt-1 min-w-[100px]">
            {atalhoTeclas.length > 0 ? formatarTeclas(atalhoTeclas) : "No shortcut"}
          </div>
        </div>
      </div>
    </div>
  );
}
