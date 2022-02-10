import { Payload, PayloadMessage, PingMessage } from "../types";

const { currentUser, widget } = figma;
const { useEffect, useSyncedMap, AutoLayout, Image, Text } = widget;

function Widget() {
  const messagesMap = useSyncedMap<Payload[]>("messages");
  const sessionId = () => (currentUser?.sessionId || 0).toString();

  const ledger = () =>
    messagesMap
      .values()
      .reduce<Payload[]>((val, curr) => val.concat(curr), [])
      .sort((a, b) => (a.time > b.time ? 1 : -1));

  useEffect(() => {
    figma.ui.onmessage = async (message: PingMessage | PayloadMessage) => {
      if (message.type === "message") {
        const array = messagesMap.get(message.id) || [];
        array.push(message.data);
        messagesMap.set(message.id, array);
      } else if (message.type === "ping") {
        const data = ledger();
        const last = data[data.length - 1];
        // clear after 5 seconds of inactivity
        if (last && last.time < Date.now() - 5000) {
          messagesMap.keys().forEach((key) => messagesMap.delete(key));
        }
        figma.ui.postMessage({ type: "pong", data });
      }
    };
  });

  const url = "http://localhost:42069/ui?asdf";
  // const url = "https://jakealbaugh.github.io/figma-widget-test";

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
    </AutoLayout>
  );
}

widget.register(Widget);
