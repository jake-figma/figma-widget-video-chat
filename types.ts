interface RTCDataParamsDataBoolean {
  type: "rtc.accepted" | "rtc.joined";
  data: boolean;
}

interface RTCDataParamsDataString {
  type: "rtc.sdp" | "rtc.ice";
  data: string;
}

interface RTCDataConnection {
  type: "connection" | "disconnection";
  data?: string;
}

interface RTCDataRequired {
  from: string;
  to: string;
  time: number;
}

export type RTCDataParams = RTCDataParamsDataBoolean | RTCDataParamsDataString;
export type RTCData = RTCDataRequired &
  (RTCDataParamsDataBoolean | RTCDataParamsDataString | RTCDataConnection);

type UiMessageRTCData = { type: "rtc"; data: RTCData; id: string };
type UiMessagePing = { type: "ping"; id: string };
type WidgetMessageInit = { type: "initialize"; data: string };
type WidgetMessagePong = { type: "pong"; data: RTCData[] };

export type UiMessage = UiMessageRTCData | UiMessagePing;
export type WidgetMessage = WidgetMessageInit | WidgetMessagePong;

export const isUiMessagePing = (message: UiMessage): message is UiMessagePing =>
  message.type === "ping";

export const isUiMessageRTCData = (
  message: UiMessage
): message is UiMessageRTCData => message.type === "rtc";

export const isWidgetMessageInit = (
  message: WidgetMessage
): message is WidgetMessageInit => message.type === "initialize";

export const isWidgetMessagePong = (
  message: WidgetMessage
): message is WidgetMessagePong => message.type === "pong";
