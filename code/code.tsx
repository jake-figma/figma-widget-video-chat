// This widget will open an Iframe window with buttons to show a toast message and close the window.

const { currentUser, widget } = figma;
const { useEffect, useSyncedState, useSyncedMap, AutoLayout, Image, Text } =
  widget;

function Widget() {
  const dataMap = useSyncedMap<{ id: string; data: string }>("data");
  const messagesMap = useSyncedMap<any>("messages");
  const sessionId = () => (currentUser.sessionId || 0).toString();

  useEffect(() => {
    figma.ui.onmessage = async (message) => {
      if (message.id && !messagesMap.get(message.id)) {
        messagesMap.set(message.id, []);
      }
      if (message.type === "image") {
        const id = sessionId();
        dataMap.set(id, { id, data: message.data });
        figma.ui.postMessage({ type: "images", data: dataMap.entries() });
      } else if (message.type === "message") {
        if (message.data.to === "all") {
          messagesMap.keys().forEach((key) => {
            const array = messagesMap.get(key);
            array.push(message.data);
            messagesMap.set(key, array);
          });
        } else {
          const array = messagesMap.get(message.data.to);
          array.push(message.data);
          messagesMap.set(message.data.to, array);
        }
      } else if (message.type === "ping") {
        const data = messagesMap.get(message.id) || [];
        messagesMap.set(message.id, []);
        figma.ui.postMessage({ type: "pong", data });
      } else {
        console.log("ASDF", message);
      }
    };
  });

  // const url = "http://localhost:42069?123"; // old
  // const url = "http://localhost:6969?13";
  const url = "https://jakealbaugh.github.io/figma-widget-test?123"; // staging
  // const url = "https://jakealbaugh.github.io/figma-widget-test/old.html?123"; // staging- old

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
        fill="#F00"
        padding={8}
        onClick={() => {
          dataMap.keys().forEach((k) => dataMap.delete(k));
          messagesMap.keys().forEach((k) => messagesMap.delete(k));
        }}
      >
        <Text fontSize={12}>Purge</Text>
      </AutoLayout>
      {messagesMap.entries().map((messages, i) => (
        <Text fontSize={12} key={i}>
          {JSON.stringify(messages)}
        </Text>
      ))}
    </AutoLayout>
  );
}

widget.register(Widget);
