"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StopPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Button
        variant="destructive"
        size="lg"
        className={cn(
          "text-lg font-semibold",
          "hover:bg-red-600 hover:text-white"
        )}
        onClick={() => {
          // ここにテキスト流しを停止する処理を追加
          console.log("テキスト流しを停止しました");
          window.ipc.send("stop-text-flow", null);
        }}
      >
        テキスト流しを終了
      </Button>
    </div>
  );
}
