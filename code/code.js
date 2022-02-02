// This widget will open an Iframe window with buttons to show a toast message and close the window.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { currentUser, widget } = figma;
const { useEffect, useSyncedState, useSyncedMap, AutoLayout, Image, Text } = widget;
function Widget() {
    const dataMap = useSyncedMap("data");
    const messagesMap = useSyncedMap("messages");
    const sessionId = () => (currentUser.sessionId || 0).toString();
    useEffect(() => {
        figma.ui.onmessage = (message) => __awaiter(this, void 0, void 0, function* () {
            if (message.id && !messagesMap.get(message.id)) {
                messagesMap.set(message.id, []);
            }
            if (message.type === "image") {
                const id = sessionId();
                dataMap.set(id, { id, data: message.data });
                figma.ui.postMessage({ type: "images", data: dataMap.entries() });
            }
            else if (message.type === "message") {
                if (message.data.to === "all") {
                    messagesMap.keys().forEach((key) => {
                        const array = messagesMap.get(key);
                        array.push(message.data);
                        messagesMap.set(key, array);
                    });
                }
                else {
                    const array = messagesMap.get(message.data.to);
                    array.push(message.data);
                    messagesMap.set(message.data.to, array);
                }
            }
            else if (message.type === "ping") {
                const data = messagesMap.get(message.id) || [];
                messagesMap.set(message.id, []);
                figma.ui.postMessage({ type: "pong", data });
            }
            else {
                console.log("ASDF", message);
            }
        });
    });
    // const url = "http://localhost:42069?123"; // old
    // const url = "http://localhost:6969?13";
    const url = "https://jakealbaugh.github.io/figma-widget-test?123"; // staging
    // const url = "https://jakealbaugh.github.io/figma-widget-test/old.html?123"; // staging- old
    return (figma.widget.h(AutoLayout, { spacing: 16, direction: "vertical" },
        figma.widget.h(AutoLayout, { fill: "#FF0", padding: 16, onClick: () => new Promise(() => {
                figma.showUI(`<script>location.href = "${url}";</script>`, {
                    visible: true,
                    height: 400,
                    width: 400,
                });
                figma.ui.postMessage({ type: "add", id: sessionId() });
            }) },
            figma.widget.h(Text, { fontSize: 24, fontWeight: "black" }, "Join Video Chat")),
        figma.widget.h(AutoLayout, { fill: "#F00", padding: 8, onClick: () => {
                dataMap.keys().forEach((k) => dataMap.delete(k));
                messagesMap.keys().forEach((k) => messagesMap.delete(k));
            } },
            figma.widget.h(Text, { fontSize: 12 }, "Purge")),
        messagesMap.entries().map((messages, i) => (figma.widget.h(Text, { fontSize: 12, key: i }, JSON.stringify(messages))))));
}
widget.register(Widget);
