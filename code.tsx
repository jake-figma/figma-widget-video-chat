// This widget will open an Iframe window with buttons to show a toast message and close the window.

const { currentUser, widget } = figma;
const { useEffect, useSyncedMap, AutoLayout, Image, Text } = widget;

function Widget() {
  const dataMap = useSyncedMap<{ id: string; data: string }>("data");
  const sessionId = () => (currentUser.sessionId || 0).toString();

  useEffect(() => {
    figma.ui.onmessage = async (message) => {
      if (message.type === "image") {
        const id = sessionId();
        dataMap.set(id, { id, data: message.data });
        figma.ui.postMessage(
          { type: "images", data: dataMap.entries() },
          { origin: "*" }
        );
      } else {
        console.log("ASDF", message);
      }
    };
  });

  const url = "http://localhost:42069";
  // const url = "https://staging.figma.com/widgets/photobooth"; // staging

  return (
    <AutoLayout spacing={16}>
      <Text
        fontSize={24}
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
        Join Video Chat
      </Text>
      <Text
        fontSize={24}
        onClick={() => dataMap.keys().forEach((k) => dataMap.delete(k))}
      >
        Purge
      </Text>
    </AutoLayout>
  );
}

widget.register(Widget);
