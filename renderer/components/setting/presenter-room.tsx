"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConnectionSetting from "./connection";
import RoomInvite from "./room-invite";
import { DEFAULT_SERVER_ORIGIN, parseRoomLink, roomConnectionFromSocket, type RoomPageAction } from "@/lib/room-connection";
import type { ConnectionStatus } from "@/hook/ws-validation";

export default function PresenterRoom({ url, onChange, connectionStatus, onRetryConnection }: {
  url: string;
  onChange: (url: string) => void;
  connectionStatus: ConnectionStatus;
  onRetryConnection: () => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const room = roomConnectionFromSocket(url);

  useEffect(() => {
    if (room) setInput(room.participantUrl);
    setError("");
    setNotice("");
  }, [room?.participantUrl]);

  const open = async (action: RoomPageAction) => {
    const result = await window.ipc.invoke("open-room-page", { action, connectionUrl: url });
    if (!result.ok) setError(result.error ?? "ブラウザを開けませんでした。");
  };

  const apply = () => {
    const selected = parseRoomLink(input);
    if (!selected) {
      setError("ルームの参加URLを貼り付けてください。HTTPS、またはローカル開発用のHTTPに対応しています。");
      return;
    }
    setError("");
    setNotice("ルームを設定しました。接続を確認後、コメント表示を開始できます。");
    onChange(selected.wsUrl);
  };

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">1</span>
          <h3 className="font-semibold text-slate-900">主催者としてルームを用意</h3>
        </div>
        <p className="text-sm text-slate-600">ブラウザでGoogleログインして、ルームを作成します。管理画面の「bolide2 Desktopで開く」から、このアプリにルームを渡せます。</p>
        <Button variant="outline" onClick={() => void open("dashboard")} className="gap-2"><ExternalLink className="size-4" />ルームを作成・管理</Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">2</span>
          <h3 className="font-semibold text-slate-900">この発表で使うルームを選択</h3>
        </div>
        <p className="text-sm text-slate-600">ブラウザから開けない場合は、ルームの参加URLを貼り付けてください。</p>
        <Label htmlFor="participant-room-url">参加URL</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="participant-room-url" type="url" placeholder={`${DEFAULT_SERVER_ORIGIN}/rooms/…`} value={input} onChange={(event) => setInput(event.target.value)} className="min-w-56 flex-1" />
          <Button onClick={apply} className="gap-2"><Link2 className="size-4" />このルームを使う</Button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-slate-600">{notice}</p>}
      </section>

      {room && <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-slate-900">選択中のルーム <span className="font-mono">{room.roomId}</span></h3>
          <span role="status" className={`rounded-full px-3 py-1 text-xs font-medium ${connectionStatus === "connected" ? "bg-emerald-50 text-emerald-700" : connectionStatus === "failed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{connectionStatus === "connected" ? "接続確認済み" : connectionStatus === "failed" ? "接続できません" : "接続を確認しています"}</span>
        </div>
        {connectionStatus === "failed" && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3">
          <p className="flex-1 text-sm text-red-700">ルームが受付中か、参加URLとネットワークを確認してください。</p>
          <Button size="sm" variant="outline" onClick={onRetryConnection}>接続を再確認</Button>
        </div>}
        <RoomInvite room={room} />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => void open("manage")}>このルームの管理</Button>
          <Button variant="ghost" onClick={() => void open("history")}>コメント履歴</Button>
        </div>
      </div>}

      <details className="rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">その他の接続先・詳細設定</summary>
        <div className="mt-4"><ConnectionSetting url={url} onChange={onChange} /></div>
      </details>
    </div>
  );
}
