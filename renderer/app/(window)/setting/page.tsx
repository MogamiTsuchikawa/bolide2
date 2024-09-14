"use client";
import { useState } from "react";
import Connection from "../../../components/setting/connection";
import { FlowTextOption } from "../../../../interface/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWebSocketValidation } from "@/hook/ws-validation";
import TextPositionSpeedSetting from "@/components/setting/text-position-speed";
import FontSizeColorSetting from "@/components/setting/font-size-color";
import { Settings, Sliders, Palette } from "lucide-react"; // Change icons

const optionList: {
  name: "room" | "text-position-speed" | "text-color-size" | "app-info";
  label: string;
  icon: React.ReactNode;
}[] = [
  { name: "room", label: "ルーム設定", icon: <Settings className="w-5 h-5" /> },
  {
    name: "text-position-speed",
    label: "テキスト位置と速度",
    icon: <Sliders className="w-5 h-5" />,
  },
  {
    name: "text-color-size",
    label: "テキスト色とサイズ",
    icon: <Palette className="w-5 h-5" />,
  },
];

const SettingPage = () => {
  const [selectedOption, setSelectedOption] = useState<
    "room" | "text-position-speed" | "text-color-size" | "app-info"
  >("room");
  const [option, setOption] = useState<FlowTextOption>({
    fontSize: 100,
    fontColors: ["red", "blue", "green", "yellow", "purple", "pink"],
    flowAreas: [0, 10, 20, 30, 40, 50, 60, 70, 80],
    testMode: false,
  });

  const isValidWsUrl = useWebSocketValidation(option);

  const onClickStart = () => {
    window.ipc.send("start-flow-text", option);
  };

  return (
    <div className="flex bg-gray-100">
      {/* サイドメニュー */}
      <div className="w-64 bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col justify-between">
        <nav className="space-y-1">
          {optionList.map(({ name, label, icon }) => (
            <button
              key={name}
              onClick={() => setSelectedOption(name)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center space-x-3 transition-all duration-200",
                selectedOption === name
                  ? "bg-gray-800 text-blue-400"
                  : "hover:bg-gray-800"
              )}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <Button
          onClick={onClickStart}
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 transition-all duration-200"
          disabled={!isValidWsUrl}
        >
          スタート
        </Button>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 p-8 bg-white min-h-screen max-h-screen overflow-y-auto">
        {selectedOption === "room" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              ルーム設定
            </h2>
            <Connection
              onChange={(url) => setOption({ ...option, wsUrl: url })}
              url={option.wsUrl ?? ""}
            />
          </div>
        )}

        {selectedOption === "text-position-speed" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              テキスト位置と速度
            </h2>
            <TextPositionSpeedSetting
              onChangePositions={(positions) =>
                setOption({ ...option, flowAreas: positions })
              }
              currentPositions={option.flowAreas}
            />
          </div>
        )}

        {selectedOption === "text-color-size" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              テキスト色とサイズ
            </h2>
            <FontSizeColorSetting
              onChangeFontSize={(size) =>
                setOption({ ...option, fontSize: size })
              }
              onChangeFontColors={(colors) =>
                setOption({ ...option, fontColors: colors })
              }
              currentFontSize={option.fontSize}
              currentFontColors={option.fontColors}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingPage;
