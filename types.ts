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

type UIMessageRTCData = { type: "rtc"; data: RTCData; id: string };
type UIMessagePing = { type: "ping"; id: string };
type WidgetMessageInit = { type: "initialize"; data: string };
type WidgetMessagePong = { type: "pong"; data: RTCData[] };

export type UIMessage = UIMessageRTCData | UIMessagePing;
export type WidgetMessage = WidgetMessageInit | WidgetMessagePong;

export const isUIMessagePing = (message: UIMessage): message is UIMessagePing =>
  message.type === "ping";

export const isUIMessageRTCData = (
  message: UIMessage
): message is UIMessageRTCData => message.type === "rtc";

export const isWidgetMessageInit = (
  message: WidgetMessage
): message is WidgetMessageInit => message.type === "initialize";

export const isWidgetMessagePong = (
  message: WidgetMessage
): message is WidgetMessagePong => message.type === "pong";
