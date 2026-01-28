"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConnectionSettingProps = {
  url: string;
  onChange: (url: string) => void;
};

type ServerType = "bolide2" | "digicre" | "custom";

const ROOM_ID_LENGTH = 16;

const toWsBaseUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    }
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
};

const normalizeRoomId = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_ID_LENGTH);
};

const ConnectionSetting = ({ onChange, url }: ConnectionSettingProps) => {
  const [serverType, setServerType] = useState<ServerType>("bolide2");
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [customUrl, setCustomUrl] = useState(url ?? "");

  const handleServerChange = (value: string) => {
    const nextType = value as ServerType;
    setServerType(nextType);
    updateUrl(nextType, {
      roomName,
      roomId,
      customUrl,
      serverUrl,
    });
  };

  const updateUrl = (
    type: ServerType,
    next: {
      roomName: string;
      roomId: string;
      customUrl: string;
      serverUrl: string;
    }
  ) => {
    if (type === "custom") {
      onChange(next.customUrl);
      return;
    }
    if (type === "digicre") {
      if (!next.roomName) {
        onChange("");
        return;
      }
      onChange(`wss://bolide.digicre.net/api/v1/room/${next.roomName}`);
      return;
    }
    const wsBase = toWsBaseUrl(next.serverUrl);
    if (!wsBase || !next.roomId) {
      onChange("");
      return;
    }
    onChange(`${wsBase}/rooms/${next.roomId}/ws`);
  };

  const handleRoomNameChange = (value: string) => {
    setRoomName(value);
    updateUrl(serverType, {
      roomName: value,
      roomId,
      customUrl,
      serverUrl,
    });
  };

  const handleRoomIdChange = (value: string) => {
    const normalized = normalizeRoomId(value);
    setRoomId(normalized);
    updateUrl(serverType, {
      roomName,
      roomId: normalized,
      customUrl,
      serverUrl,
    });
  };

  const handleServerUrlChange = (value: string) => {
    setServerUrl(value);
    updateUrl(serverType, {
      roomName,
      roomId,
      customUrl,
      serverUrl: value,
    });
  };

  const handleCustomUrlChange = (value: string) => {
    setCustomUrl(value);
    updateUrl(serverType, {
      roomName,
      roomId,
      customUrl: value,
      serverUrl,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="server-select">サーバータイプ</Label>
        <Select onValueChange={handleServerChange} defaultValue="bolide2">
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
              onChange={(e) => handleServerUrlChange(e.target.value)}
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
              onChange={(e) => handleRoomIdChange(e.target.value)}
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
            onChange={(e) => handleCustomUrlChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="room-name">部屋名</Label>
          <Input
            id="room-name"
            placeholder="例: my-room"
            value={roomName}
            onChange={(e) => handleRoomNameChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default ConnectionSetting;
