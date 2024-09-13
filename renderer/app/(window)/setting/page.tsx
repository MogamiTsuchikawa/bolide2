"use client";
import { useState } from "react";
import Connection from "../../../components/setting/connection";
import { FlowTextOption } from "../../../../interface/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWebSocketValidation } from "@/hook/ws-validation";
import TextPositionSpeedSetting from "@/components/setting/text-position-speed";
import FontSizeColorSetting from "@/components/setting/font-size-color";

const optionList: {
  name: "room" | "text-position-speed" | "text-color-size" | "app-info";
  label: string;
}[] = [
  { name: "room", label: "ルーム設定" },
  { name: "text-position-speed", label: "流れるテキストの位置と速度" },
  { name: "text-color-size", label: "流れるテキストの色とサイズ" },
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
    <div className="flex">
      {/* サイドメニュー */}
      <div className="w-60 bg-gray-800 text-white min-h-screen p-4 flex flex-col justify-between">
        <nav className="space-y-2">
          {optionList.map(({ name, label }) => (
            <button
              key={name}
              onClick={() => setSelectedOption(name)}
              className={cn(
                "w-full text-left px-4 py-2 rounded-md",
                selectedOption === name ? "bg-gray-700" : "hover:bg-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
        <Button
          onClick={onClickStart}
          className="w-full mt-4 bg-green-500 hover:bg-green-600"
          disabled={!isValidWsUrl}
        >
          スタート
        </Button>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 p-6 bg-gray-100 min-h-screen max-h-screen overflow-y-auto">
        {selectedOption === "room" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">ルーム設定</h2>
            <Connection
              onChange={(url) => setOption({ ...option, wsUrl: url })}
              url={option.wsUrl ?? ""}
            />
          </div>
        )}

        {selectedOption === "text-position-speed" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              流れるテキストの位置と速度
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
            <h2 className="text-2xl font-bold mb-4">
              流れるテキストの色とサイズ
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
