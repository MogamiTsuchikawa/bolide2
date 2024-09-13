"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react"; // Assuming you're using lucide-react for icons

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

const FontSizeColorSetting = ({
  onChangeFontSize,
  onChangeFontColors,
  currentFontSize,
  currentFontColors,
}: FontSizeColorSettingProps) => {
  const [fontSize, setFontSize] = useState(currentFontSize);
  const [fontColors, setFontColors] = useState(currentFontColors);

  useEffect(() => {
    setFontSize(currentFontSize);
    setFontColors(currentFontColors);
  }, [currentFontSize, currentFontColors]);

  const handleFontSizeChange = (value: string) => {
    const newSize = Number(value);
    if (!Number.isNaN(newSize)) {
      setFontSize(newSize);
      onChangeFontSize(newSize);
    }
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...fontColors];
    newColors[index] = value;
    setFontColors(newColors);
    onChangeFontColors(newColors);
  };

  const handleDeleteColor = (index: number) => {
    const newColors = fontColors.filter((_, i) => i !== index);
    setFontColors(newColors);
    onChangeFontColors(newColors);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="font-size">フォントサイズ</Label>
        <Input
          id="font-size"
          type="number"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          className="w-20"
        />
      </div>

      <div className="space-y-2">
        <Label>フォントカラー</Label>
        {fontColors.map((color, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              className="w-12 h-8 p-0 border-none"
            />
            <Input
              type="text"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              className="w-32"
              placeholder="色コードまたはCSS色名"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteColor(index)}
              className="h-8 w-8"
              disabled={fontColors.length <= 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>プリセットカラー</Label>
        <div className="flex flex-wrap gap-2">
          {presetColors.map((color, index) => (
            <button
              key={index}
              className="w-6 h-6 border border-gray-300 rounded"
              style={{ backgroundColor: color }}
              onClick={() => {
                const newColors = [...fontColors, color];
                setFontColors(newColors);
                onChangeFontColors(newColors);
              }}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={() => {
          const newColors = [...fontColors, "#000000"];
          setFontColors(newColors);
          onChangeFontColors(newColors);
        }}
        variant="outline"
      >
        色を追加
      </Button>
    </div>
  );
};

export default FontSizeColorSetting;
