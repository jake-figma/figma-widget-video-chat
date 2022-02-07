const { currentUser, widget } = figma;
const { useEffect, useSyncedMap, AutoLayout, Text } = widget;

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

type ImageMessage = { type: "image"; data: string; id: undefined };
type PayloadMessage = { type: "message"; data: Payload; id: string };
type PingMessage = { type: "ping"; id: string };

type Message = PayloadMessage | ImageMessage | PingMessage;

function Widget() {
  const dataMap = useSyncedMap<{ id: string; data: string }>("data");
  const messagesMap = useSyncedMap<Payload[]>("messages");
  const sessionId = () => (currentUser.sessionId || 0).toString();

  const ledger = () =>
    messagesMap
      .values()
      .reduce<Payload[]>((val, curr) => val.concat(curr), [])
      .sort((a, b) => (a.time > b.time ? 1 : -1));

  useEffect(() => {
    figma.ui.onmessage = async (message: Message) => {
      if (message.type === "image") {
        const id = sessionId();
        dataMap.set(id, { id, data: message.data });
        figma.ui.postMessage({ type: "images", data: dataMap.entries() });
      } else if (message.type === "message") {
        const array = messagesMap.get(message.id) || [];
        array.push(message.data);
        messagesMap.set(message.id, array);
      } else if (message.type === "ping") {
        figma.ui.postMessage({ type: "pong", data: ledger() });
      } else {
        console.log("ASDF", message);
      }
    };
  });

  // const url = "http://localhost:6969?13";
  // const urlOld = "http://localhost:42069?123"; // old
  const url = "https://jakealbaugh.github.io/figma-widget-test?123"; // staging
  const urlOld = "https://jakealbaugh.github.io/figma-widget-test/old.html?123"; // staging- old

  return (
    <AutoLayout spacing={16} direction="vertical">
      <AutoLayout
        fill="#FF0"
        padding={16}
        onClick={() =>
          new Promise(() => {
            figma.showUI(`<script>location.href = "${url}";</script>`, {
              visible: true,
              height: 400,
              width: 400,
            });
            figma.ui.postMessage({ type: "add", id: sessionId() });
          })
        }
      >
        <Text fontSize={24} fontWeight="black">
          Join Video Chat
        </Text>
      </AutoLayout>
      <AutoLayout
        fill="#00F"
        padding={16}
        onClick={() =>
          new Promise(() => {
            figma.showUI(`<script>location.href = "${urlOld}";</script>`, {
              visible: true,
              height: 400,
              width: 400,
            });
            figma.ui.postMessage({ type: "add", id: sessionId() });
          })
        }
      >
        <Text fontSize={24} fontWeight="black">
          Join Lo Res Video Chat
        </Text>
      </AutoLayout>
      <AutoLayout
        fill="#F00"
        padding={8}
        onClick={() => {
          dataMap.keys().forEach((k) => dataMap.delete(k));
          messagesMap.keys().forEach((k) => messagesMap.delete(k));
        }}
      >
        <Text fontSize={12}>Purge</Text>
      </AutoLayout>
      {ledger().map((message, i) => (
        <Text fontSize={12} key={i}>
          {JSON.stringify(message)}
        </Text>
      ))}
    </AutoLayout>
  );
}

widget.register(Widget);
