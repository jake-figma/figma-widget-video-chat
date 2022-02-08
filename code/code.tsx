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
        const data = ledger();
        const last = data[data.length - 1];
        // clear after 5 seconds of inactivity
        if (last && last.time < Date.now() - 1000 * 5) {
          messagesMap.keys().forEach((key) => messagesMap.delete(key));
        }
        figma.ui.postMessage({ type: "pong", data });
      } else {
        console.log("ASDF", message);
      }
    };
  });

  // const url = "http://localhost:6969?142";
  // const urlOld = "http://localhost:42069?123";
  const url = "https://jakealbaugh.github.io/figma-widget-test";
  const urlOld = "https://jakealbaugh.github.io/figma-widget-test/old.html?123";
  const renderOld = false;

  return (
    <AutoLayout
      spacing={8}
      padding={8}
      direction="vertical"
      horizontalAlignItems="center"
    >
      <AutoLayout
        cornerRadius={4}
        fill="#000"
        padding={8}
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
        <Text fontSize={12} fill="#FFF" fontWeight="medium">
          Join Video Chat
        </Text>
      </AutoLayout>
      {renderOld ? (
        <AutoLayout
          cornerRadius={4}
          fill="#999"
          padding={8}
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
          <Text fontSize={12} fill="#FFF" fontWeight="medium">
            LoFi Video Chat
          </Text>
        </AutoLayout>
      ) : null}
      {/* <Text fontSize={12}>{ledger().length}</Text> */}
    </AutoLayout>
  );
}

widget.register(Widget);
