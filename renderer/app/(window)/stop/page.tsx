"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { roomConnectionFromSocket, type RoomPageAction } from "@/lib/room-connection";

function PresentationControls() {
  const params = useSearchParams();
  const url = params.get("wsUrl") ?? "";
  const room = roomConnectionFromSocket(url);
  const [message, setMessage] = useState("");
  useEffect(() => window.ipc.on("room-selected", () => {
    setMessage("次のルームを設定しました。表示を停止すると確認できます。");
  }), []);
  const open = async (action: RoomPageAction) => {
    const result = await window.ipc.invoke("open-room-page", { action, connectionUrl: url });
    if (!result.ok) setMessage(result.error ?? "ブラウザを開けませんでした。");
  };

  return (
    <main className="flex min-h-screen flex-col justify-center gap-3 bg-slate-50 p-5">
      <p className="text-center text-sm font-semibold text-slate-700">コメントを表示しています</p>
      <Button size="lg" className="w-full bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => window.ipc.send("stop-text-flow", null)}>コメント表示を停止</Button>
      <p className="text-center text-xs text-slate-500">表示を停止しても、参加者の投稿受付は続きます。</p>
      {room && <div className="flex justify-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => void open("manage")}>参加案内・管理</Button>
        <Button size="sm" variant="ghost" onClick={() => void open("history")}>履歴</Button>
      </div>}
      {message && <p role="status" className="text-xs text-indigo-700">{message}</p>}
    </main>
  );
}

export default function StopPage() {
  return <Suspense fallback={<p>表示設定を読み込み中</p>}><PresentationControls /></Suspense>;
}
