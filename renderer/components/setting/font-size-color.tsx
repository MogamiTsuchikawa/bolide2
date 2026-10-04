"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import flowSettings from "../../../interface/flow-settings.json";

type FontSizeColorSettingProps = {
  onChangeFontSize: (value: number) => void;
  onChangeFontColors: (values: string[]) => void;
  currentFontSize: number;
  currentFontColors: string[];
};

const presetColors = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFFFFF",
  "#000000",
  "#808080",
  "#FFA500",
  "#800080",
  "#008000",
];

export function isValidFontColor(color: string): boolean {
  return (
    color.trim().length > 0 &&
    color.length <= 256 &&
    !/[\x00-\x1F\x7F;{}]/.test(color) &&
    (typeof CSS === "undefined" || CSS.supports("color", color))
  );
}

const FontSizeColorSetting = ({
  onChangeFontSize,
  onChangeFontColors,
  currentFontSize,
  currentFontColors,
}: FontSizeColorSettingProps) => {
  const canAddColor = currentFontColors.length < flowSettings.maxItems;

  const handleAddColor = (color: string) => {
    if (!canAddColor) return;
    onChangeFontColors([...currentFontColors, color]);
  };

  const handleFontSizeChange = (value: string) => {
    const newSize = Number(value);
    if (value.trim() && Number.isFinite(newSize) && newSize > 0) {
      onChangeFontSize(newSize);
    }
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...currentFontColors];
    newColors[index] = value;
    onChangeFontColors(newColors);
  };

  const handleDeleteColor = (index: number) => {
    onChangeFontColors(currentFontColors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="font-size">フォントサイズ</Label>
        <Input
          id="font-size"
          type="number"
          min={1}
          step="any"
          value={currentFontSize}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          className="w-20"
        />
      </div>

      <div className="space-y-2">
        <Label>フォントカラー</Label>
        {currentFontColors.map((color, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              className="w-12 h-8 p-0 border-none"
              aria-label={`色 ${index + 1} を選択`}
            />
            <Input
              type="text"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              className="w-32"
              placeholder="色コードまたはCSS色名"
              aria-label={`色 ${index + 1} のコードまたはCSS色名`}
              aria-invalid={!isValidFontColor(color)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteColor(index)}
              className="h-8 w-8"
              disabled={currentFontColors.length <= 1}
              aria-label={`色 ${index + 1} を削除`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>プリセットカラー</Label>
        <div className="flex flex-wrap gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              className="w-6 h-6 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: color }}
              onClick={() => handleAddColor(color)}
              disabled={!canAddColor}
              aria-label={`${color} を追加`}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={() => handleAddColor("#000000")}
        disabled={!canAddColor}
        variant="outline"
      >
        色を追加
      </Button>
      <p className="text-sm text-muted-foreground">
        最大 {flowSettings.maxItems} 色まで追加できます。
      </p>
    </div>
  );
};

export default FontSizeColorSetting;
