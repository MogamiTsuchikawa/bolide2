"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import type { RoomConnection } from "@/lib/room-connection";

export default function RoomInvite({ room, compact = false }: {
  room: RoomConnection;
  compact?: boolean;
}) {
  const [qr, setQr] = useState<{ url: string; image: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setMessage("");
    void QRCode.toDataURL(room.participantUrl, {
      width: compact ? 144 : 184,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((image) => {
      if (active) setQr({ url: room.participantUrl, image });
    }).catch(() => {
      if (active) setMessage("QRを作成できませんでした。参加URLをご案内ください。");
    });
    return () => { active = false; };
  }, [room.participantUrl, compact]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.participantUrl);
      setMessage("参加URLをコピーしました。");
    } catch {
      setMessage("コピーできませんでした。下の参加URLを選択してコピーしてください。");
    }
  };

  return (
    <section aria-label="参加者への案内" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-white" style={{ width: compact ? 144 : 184, height: compact ? 144 : 184 }}>
          {qr?.url === room.participantUrl
            ? <img src={qr.image} alt="このルームの参加QR" width={compact ? 144 : 184} height={compact ? 144 : 184} />
            : <span className="text-sm text-slate-500">QRを準備中</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-slate-900">参加者にQR・URLを案内</h3>
            <p className="mt-1 text-sm text-slate-600">スマホのブラウザから参加できます。Googleログインは不要です。</p>
          </div>
          <p className="select-all break-all text-sm text-slate-700" aria-label="選択中の参加URL">{room.participantUrl}</p>
          <Button variant="outline" onClick={copy}>参加URLをコピー</Button>
          {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
        </div>
      </div>
    </section>
  );
}
