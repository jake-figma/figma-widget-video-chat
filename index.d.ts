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
}
interface PayloadConnection {
  type: "connection" | "disconnection";
  data?: string;
}

type PayloadParams = PayloadParamsDataBoolean | PayloadParamsDataString;
type Payload = PayloadRequired &
  (PayloadParamsDataBoolean | PayloadParamsDataString | PayloadConnection) & {
    time?: number;
  };
