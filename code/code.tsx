import {
  isUiMessageRTCData,
  isUiMessagePing,
  RTCData,
  UiMessage,
  WidgetMessage,
} from "../types";

const { currentUser, widget } = figma;
const { useEffect, useSyncedMap, AutoLayout, Text } = widget;

function Widget() {
  const messagesMap = useSyncedMap<RTCData[]>("messages");
  const sessionId = () => (currentUser?.sessionId || 0).toString();

  const flattenedAndSortedMessages = () =>
    messagesMap
      .values()
      .reduce<RTCData[]>((val, curr) => val.concat(curr), [])
      .sort((a, b) => (a.time > b.time ? 1 : -1));

  const sendInitMessage = () => {
    const message: WidgetMessage = {
      type: "initialize",
      data: sessionId(),
    };
    figma.ui.postMessage(message);
  };

  const sendPongMessage = () => {
    const message: WidgetMessage = {
      type: "pong",
      data: flattenedAndSortedMessages(),
    };
    figma.ui.postMessage(message);
  };

  const showUi = () => {
    // const url = "http://localhost:42069/ui?asdf";
    const url = "https://jakealbaugh.github.io/figma-widget-test";
    const opts = { visible: true, height: 400, width: 400 };
    figma.showUI(`<script>location.href = "${url}";</script>`, opts);
  };

  useEffect(() => {
    figma.ui.onmessage = async (message: UiMessage) => {
      if (isUiMessageRTCData(message)) {
        const array = messagesMap.get(message.id) || [];
        array.push(message.data);
        messagesMap.set(message.id, array);
      } else if (isUiMessagePing(message)) {
        const array = messagesMap.get(message.id) || [];
        const last = array[array.length - 1];
        // clear self after 5 seconds of inactivity
        if (last && last.time < Date.now() - 5000) {
          messagesMap.delete(message.id);
        }
        // respond with all messages
        sendPongMessage();
      }
    };
  });

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
            showUi();
            sendInitMessage();
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
