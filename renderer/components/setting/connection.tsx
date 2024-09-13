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

const ConnectionSetting = ({ onChange, url }: ConnectionSettingProps) => {
  const [serverType, setServerType] = useState("digicre");
  const [roomName, setRoomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const handleServerChange = (value: string) => {
    setServerType(value);
    updateUrl(value, roomName, customUrl);
  };

  const handleInputChange = (value: string) => {
    if (serverType === "custom") {
      setCustomUrl(value);
    } else {
      setRoomName(value);
    }
    updateUrl(serverType, value, value);
  };

  const updateUrl = (type: string, room: string, custom: string) => {
    if (type === "custom") {
      onChange(custom);
    } else {
      onChange(`wss://bolide.digicre.net/api/v1/room/${room}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="server-select">サーバータイプ</Label>
        <Select onValueChange={handleServerChange} defaultValue="digicre">
          <SelectTrigger id="server-select" className="w-[200px]">
            <SelectValue placeholder="サーバーを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="digicre">デジクリ</SelectItem>
            <SelectItem value="custom">カスタム</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {serverType === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="custom-url">カスタム接続先URL</Label>
          <Input
            id="custom-url"
            placeholder="例: wss://example.com/api/v1/room/your-room"
            value={customUrl}
            onChange={(e) => handleInputChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="room-name">部屋名</Label>
          <Input
            id="room-name"
            placeholder="例: my-room"
            value={roomName}
            onChange={(e) => handleInputChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default ConnectionSetting;
