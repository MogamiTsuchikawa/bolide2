"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildConnectionUrl,
  connectionSettingsFromUrl,
  normalizeRoomId,
  ROOM_ID_LENGTH,
  type ConnectionSettings,
  type ServerType,
} from "@/lib/connection";

type ConnectionSettingProps = {
  url: string;
  onChange: (url: string) => void;
};

const ConnectionSetting = ({ onChange, url }: ConnectionSettingProps) => {
  const [settings, setSettings] = useState(() => connectionSettingsFromUrl(url));
  const { serverType, roomName, roomId, serverUrl, customUrl } = settings;

  // A browser deep link or pasted room URL can change the connection externally.
  // Keep partially edited fields when they still describe the current URL.
  useEffect(() => {
    setSettings((current) => buildConnectionUrl(current) === url
      ? current
      : connectionSettingsFromUrl(url));
  }, [url]);

  const updateSettings = (changes: Partial<ConnectionSettings>) => {
    const next = { ...settings, ...changes };
    setSettings(next);
    onChange(buildConnectionUrl(next));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="server-select">サーバータイプ</Label>
        <Select
          onValueChange={(value: ServerType) => updateSettings({ serverType: value })}
          value={serverType}
        >
          <SelectTrigger id="server-select" className="w-[200px]">
            <SelectValue placeholder="サーバーを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bolide2">bolide2 サーバー</SelectItem>
            <SelectItem value="digicre">デジクリ</SelectItem>
            <SelectItem value="custom">カスタム</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {serverType === "bolide2" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-url">サーバーURL</Label>
            <Input
              id="server-url"
              placeholder="例: https://your-worker-domain.workers.dev"
              value={serverUrl}
              onChange={(e) => updateSettings({ serverUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-id">
              ルームID（英大文字・数字 {ROOM_ID_LENGTH} 文字）
            </Label>
            <Input
              id="room-id"
              placeholder="例: 1A2B3C4D5E6F7G8H"
              value={roomId}
              autoCapitalize="characters"
              onChange={(e) =>
                updateSettings({ roomId: normalizeRoomId(e.target.value) })
              }
            />
          </div>
        </div>
      ) : serverType === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="custom-url">カスタム接続先URL</Label>
          <Input
            id="custom-url"
            placeholder="例: wss://example.com/api/v1/room/your-room"
            value={customUrl}
            onChange={(e) => updateSettings({ customUrl: e.target.value })}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="room-name">部屋名</Label>
          <Input
            id="room-name"
            placeholder="例: my-room"
            value={roomName}
            onChange={(e) => updateSettings({ roomName: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};

export default ConnectionSetting;
