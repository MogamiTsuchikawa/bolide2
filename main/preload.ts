import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { FlowTextOption } from "../interface/app";
import type { RoomConnection, RoomPageRequest } from "../renderer/lib/room-connection";

type SendPayloads = {
  "start-flow-text": FlowTextOption;
  "stop-text-flow": null;
  "back-to-setting": null;
};
type ReceivePayloads = {
  "flow-text-error": { message: string };
  "room-selected": RoomConnection;
};
type InvokePayloads = {
  "get-selected-room": null;
  "open-room-page": RoomPageRequest;
};
type InvokeResults = {
  "get-selected-room": RoomConnection | null;
  "open-room-page": { ok: boolean; error?: string };
};
const sendChannels: readonly string[] = [
  "start-flow-text",
  "stop-text-flow",
  "back-to-setting",
];
const receiveChannels: readonly string[] = ["flow-text-error", "room-selected"];
const invokeChannels: readonly string[] = ["get-selected-room", "open-room-page"];

const handler = {
  invoke<Channel extends keyof InvokePayloads>(
    channel: Channel,
    value: InvokePayloads[Channel]
  ): Promise<InvokeResults[Channel]> {
    if (!invokeChannels.includes(channel)) throw new Error("Unsupported IPC channel");
    return ipcRenderer.invoke(channel, value);
  },
  send<Channel extends keyof SendPayloads>(
    channel: Channel,
    value: SendPayloads[Channel]
  ) {
    if (!sendChannels.includes(channel)) throw new Error("Unsupported IPC channel");
    ipcRenderer.send(channel, value);
  },
  on<Channel extends keyof ReceivePayloads>(
    channel: Channel,
    callback: (payload: ReceivePayloads[Channel]) => void
  ) {
    if (!receiveChannels.includes(channel)) throw new Error("Unsupported IPC channel");
    const subscription = (
      _event: IpcRendererEvent,
      payload: ReceivePayloads[Channel]
    ) => callback(payload);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
};

contextBridge.exposeInMainWorld("ipc", handler);

export type IpcHandler = typeof handler;
