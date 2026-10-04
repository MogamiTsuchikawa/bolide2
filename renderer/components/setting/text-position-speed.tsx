"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import flowSettings from "../../../interface/flow-settings.json";

type TextPositionSpeedSettingProps = {
  onChangePositions: (values: number[]) => void;
  currentPositions: number[];
};

const TextPositionSpeedSetting = ({
  onChangePositions,
  currentPositions,
}: TextPositionSpeedSettingProps) => {
  const canAddPosition = currentPositions.length < flowSettings.maxItems;

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
