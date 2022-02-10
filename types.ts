interface PayloadParamsDataBoolean {
  type: "rtc.accepted" | "rtc.joined";
  data: boolean;
}
interface PayloadParamsDataString {
  type: "rtc.sdp" | "rtc.ice";
  data: string;
}

interface PayloadRequired {
  from: string;
  to: string;
  time: number;
}
interface PayloadConnection {
  type: "connection" | "disconnection";
  data?: string;
}

export type PayloadParams = PayloadParamsDataBoolean | PayloadParamsDataString;
export type Payload = PayloadRequired &
  (PayloadParamsDataBoolean | PayloadParamsDataString | PayloadConnection);

export type PayloadMessage = { type: "message"; data: Payload; id: string };
export type PingMessage = { type: "ping"; id: string };
export type PongMessage = { type: "pong"; data: Payload[] };
