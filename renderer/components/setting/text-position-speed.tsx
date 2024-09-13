"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type TextPositionSpeedSettingProps = {
  onChangePositions: (values: number[]) => void;
  currentPositions: number[];
};

const TextPositionSpeedSetting = ({
  onChangePositions,
  currentPositions,
}: TextPositionSpeedSettingProps) => {
  const [positions, setPositions] = useState(currentPositions);
  useEffect(() => {
    setPositions(currentPositions);
  }, [currentPositions]);
  const handleChange = (index: number, value: string) => {
    if (Number.isNaN(Number(value))) return;
    const newPositions = [...positions];
    newPositions[index] = Number(value);
    setPositions([...newPositions]);
    onChangePositions([...newPositions]);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        文字を流す位置を画面上部からのパーセンテージで入力してください
      </p>
      <div className="space-y-2">
        {positions.map((position, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Label htmlFor={`position-${index}`} className="w-24">
              位置 {index + 1}
            </Label>
            <Input
              id={`position-${index}`}
              type="number"
              value={position}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-20"
            />
            <span className="text-sm">%</span>
          </div>
        ))}
      </div>
      <Button
        onClick={() => {
          setPositions([...positions, 0]);
          onChangePositions([...positions, 0]);
        }}
        variant="outline"
      >
        追加
      </Button>
    </div>
  );
};

export default TextPositionSpeedSetting;
