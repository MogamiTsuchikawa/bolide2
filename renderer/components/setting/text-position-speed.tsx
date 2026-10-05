"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import flowSettings from "../../../interface/flow-settings.json";

type TextPositionSpeedSettingProps = {
  onChangePositions: (values: number[]) => void;
  currentPositions: number[];
  currentDurationSeconds: number;
  onChangeDurationSeconds: (value: number) => void;
};

const TextPositionSpeedSetting = ({
  onChangePositions,
  currentPositions,
  currentDurationSeconds,
  onChangeDurationSeconds,
}: TextPositionSpeedSettingProps) => {
  const canAddPosition = currentPositions.length < flowSettings.maxItems;
  const [durationDraft, setDurationDraft] = useState(String(currentDurationSeconds));
  const draftSeconds = Number(durationDraft);
  const hasValidDuration = Boolean(durationDraft.trim()) && Number.isFinite(draftSeconds) && draftSeconds >= 3 && draftSeconds <= 30;
  useEffect(() => { setDurationDraft(String(currentDurationSeconds)); }, [currentDurationSeconds]);

  const handleAddPosition = () => {
    if (!canAddPosition) return;
    onChangePositions([...currentPositions, 0]);
  };

  const handleChange = (index: number, value: string) => {
    const position = Number(value);
    if (!value.trim() || !Number.isFinite(position) || position < 0 || position > 100) {
      return;
    }
    const nextPositions = [...currentPositions];
    nextPositions[index] = position;
    onChangePositions(nextPositions);
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flow-duration">コメントが画面を横切る時間（秒）</Label>
        <Input id="flow-duration" type="number" min={3} max={30} step={1} value={durationDraft} aria-invalid={!hasValidDuration} className="w-24" onBlur={() => setDurationDraft(String(currentDurationSeconds))} onChange={(event) => {
          setDurationDraft(event.target.value);
          const seconds = Number(event.target.value);
          if (event.target.value.trim() && Number.isFinite(seconds) && seconds >= 3 && seconds <= 30) onChangeDurationSeconds(seconds);
        }} />
        <p className="text-sm text-muted-foreground">3〜30秒で設定できます。秒数を小さくすると速く、大きくするとゆっくり流れます。</p>
      </div>
      <p className="text-sm text-muted-foreground">
        文字を流す位置を画面上部からのパーセンテージで入力してください
      </p>
      <div className="space-y-2">
        {currentPositions.map((position, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Label htmlFor={`position-${index}`} className="w-24">
              位置 {index + 1}
            </Label>
            <Input
              id={`position-${index}`}
              type="number"
              min={0}
              max={100}
              step="any"
              value={position}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-20"
            />
            <span className="text-sm">%</span>
          </div>
        ))}
      </div>
      <Button
        onClick={handleAddPosition}
        disabled={!canAddPosition}
        variant="outline"
      >
        追加
      </Button>
      <p className="text-sm text-muted-foreground">
        最大 {flowSettings.maxItems} 件まで追加できます。
      </p>
    </div>
  );
};

export default TextPositionSpeedSetting;
