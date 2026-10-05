"use client";

import { useEffect, useState } from "react";
import type { FlowTextOption } from "../../../../interface/app";
import { normalizeFlowTextOption } from "../../../../main/helpers/flow-options";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWebSocketConnectionStatus } from "@/hook/ws-validation";
import PresenterRoom from "@/components/setting/presenter-room";
import TextPositionSpeedSetting from "@/components/setting/text-position-speed";
import FontSizeColorSetting, { isValidFontColor } from "@/components/setting/font-size-color";
import { Presentation, Sliders, Palette, Play } from "lucide-react";

type SettingSection = "room" | "text-position-speed" | "text-color-size";
const STORAGE_KEY = "bolide2.presenter.options";
const optionList: { name: SettingSection; label: string; icon: React.ReactNode }[] = [
  { name: "room", label: "発表するルーム", icon: <Presentation className="size-5" /> },
  { name: "text-position-speed", label: "表示位置と速度", icon: <Sliders className="size-5" /> },
  { name: "text-color-size", label: "色と文字サイズ", icon: <Palette className="size-5" /> },
];

const SettingPage = () => {
  const [selectedOption, setSelectedOption] = useState<SettingSection>("room");
  const [startError, setStartError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [option, setOption] = useState<FlowTextOption>({
    fontSize: 100,
    fontColors: ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#800080", "#FFC0CB"],
    flowAreas: [0, 10, 20, 30, 40, 50, 60, 70, 80],
    flowDurationSeconds: 10,
    testMode: false,
  });
  const connectionStatus = useWebSocketConnectionStatus(option, connectionAttempt);
  const isValidWsUrl = connectionStatus === "connected";
  const hasValidColors = option.fontColors.length > 0 && option.fontColors.every(isValidFontColor);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const restored = normalizeFlowTextOption({ ...JSON.parse(saved), testMode: true });
        setOption({ ...restored, testMode: false });
      }
    } catch {
      // Invalid/old settings should not prevent the presenter from opening the app.
    }
    setLoaded(true);
    const selectRoom = ({ wsUrl }: { wsUrl: string }) => {
      setOption((current) => ({ ...current, wsUrl }));
      setSelectedOption("room");
      setStartError("");
      setNotice("ブラウザからルームを受け取りました。参加案内を確認して、コメント表示を開始してください。");
    };
    const offError = window.ipc.on("flow-text-error", ({ message }) => setStartError(message));
    const offRoom = window.ipc.on("room-selected", selectRoom);
    void window.ipc.invoke("get-selected-room", null).then((room) => { if (room) selectRoom(room); });
    return () => { offError(); offRoom(); };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(option)); } catch { /* Storage can be disabled. */ }
  }, [option, loaded]);

  const start = (preview = false) => {
    if ((!preview && !isValidWsUrl) || !hasValidColors) return;
    setStartError("");
    window.ipc.send("start-flow-text", preview ? { ...option, testMode: true, wsUrl: "" } : option);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col justify-between bg-slate-950 p-5 text-slate-100">
        <div>
          <p className="mb-1 text-2xl font-bold tracking-tight">bolide2</p>
          <p className="mb-8 text-sm text-slate-400">発表の画面に、みんなの反応を。</p>
          <nav aria-label="発表の設定" className="space-y-2">
            {optionList.map(({ name, label, icon }) => <button key={name} onClick={() => setSelectedOption(name)} aria-current={selectedOption === name ? "page" : undefined} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors", selectedOption === name ? "bg-indigo-500/20 text-indigo-200" : "text-slate-300 hover:bg-slate-800")}>
              {icon}<span>{label}</span>
            </button>)}
          </nav>
        </div>
        <div className="space-y-3 pt-8">
          <p className="text-xs leading-relaxed text-slate-400">コメントは資料やアプリの上に流れます。参加者にはQR・URLを案内してください。</p>
          <Button onClick={() => start()} disabled={!isValidWsUrl || !hasValidColors} className="w-full gap-2 bg-indigo-500 hover:bg-indigo-400"><Play className="size-4" />コメント表示を開始</Button>
          <Button variant="ghost" onClick={() => start(true)} disabled={!hasValidColors} className="w-full text-slate-300 hover:bg-slate-800 hover:text-white">表示を試す</Button>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto bg-white p-8">
        {startError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{startError}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{notice}</p>}
        <div hidden={selectedOption !== "room"}>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">発表するルーム</h1>
          <p className="mb-7 text-sm text-slate-500">ルームを選び、参加者を招待したら、コメント表示を開始します。</p>
          <PresenterRoom onChange={(wsUrl) => { setOption((current) => ({ ...current, wsUrl })); setNotice(""); }} url={option.wsUrl ?? ""} connectionStatus={connectionStatus} onRetryConnection={() => setConnectionAttempt((current) => current + 1)} />
        </div>
        <div hidden={selectedOption !== "text-position-speed"}>
          <h1 className="mb-6 text-2xl font-bold text-slate-900">表示位置と速度</h1>
          <TextPositionSpeedSetting onChangePositions={(flowAreas) => setOption((current) => ({ ...current, flowAreas }))} currentPositions={option.flowAreas} currentDurationSeconds={option.flowDurationSeconds ?? 10} onChangeDurationSeconds={(flowDurationSeconds) => setOption((current) => ({ ...current, flowDurationSeconds }))} />
        </div>
        <div hidden={selectedOption !== "text-color-size"}>
          <h1 className="mb-6 text-2xl font-bold text-slate-900">色と文字サイズ</h1>
          <FontSizeColorSetting onChangeFontSize={(fontSize) => setOption((current) => ({ ...current, fontSize }))} onChangeFontColors={(fontColors) => setOption((current) => ({ ...current, fontColors }))} currentFontSize={option.fontSize} currentFontColors={option.fontColors} />
          {!hasValidColors && <p role="alert" className="mt-4 text-sm text-red-600">有効な色コードまたはCSS色名を入力してください。</p>}
        </div>
      </main>
    </div>
  );
};

export default SettingPage;
