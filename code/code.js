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
const { useEffect, useSyncedMap, AutoLayout, Text } = widget;
function Widget() {
    const dataMap = useSyncedMap("data");
    const messagesMap = useSyncedMap("messages");
    const sessionId = () => (currentUser.sessionId || 0).toString();
    const ledger = () => messagesMap
        .values()
        .reduce((val, curr) => val.concat(curr), [])
        .sort((a, b) => (a.time > b.time ? 1 : -1));
    useEffect(() => {
        figma.ui.onmessage = (message) => __awaiter(this, void 0, void 0, function* () {
            if (message.type === "image") {
                const id = sessionId();
                dataMap.set(id, { id, data: message.data });
                figma.ui.postMessage({ type: "images", data: dataMap.entries() });
            }
            else if (message.type === "message") {
                const array = messagesMap.get(message.id) || [];
                array.push(message.data);
                messagesMap.set(message.id, array);
            }
            else if (message.type === "ping") {
                const data = ledger();
                const last = data[data.length - 1];
                // clear after 5 seconds of inactivity
                if (last && last.time < Date.now() - 1000 * 5) {
                    messagesMap.keys().forEach((key) => messagesMap.delete(key));
                }
                figma.ui.postMessage({ type: "pong", data });
            }
            else {
                console.log("ASDF", message);
            }
        });
    });
    // const url = "http://localhost:6969?142";
    // const urlOld = "http://localhost:42069?123";
    const url = "https://jakealbaugh.github.io/figma-widget-test?123";
    const urlOld = "https://jakealbaugh.github.io/figma-widget-test/old.html?123";
    const renderOld = false;
    return (figma.widget.h(AutoLayout, { spacing: 8, padding: 8, direction: "vertical", horizontalAlignItems: "center" },
        figma.widget.h(AutoLayout, { cornerRadius: 4, fill: "#000", padding: 8, onClick: () => new Promise(() => {
                figma.showUI(`<script>location.href = "${url}";</script>`, {
                    visible: true,
                    height: 400,
                    width: 400,
                });
                figma.ui.postMessage({ type: "add", id: sessionId() });
            }) },
            figma.widget.h(Text, { fontSize: 12, fill: "#FFF", fontWeight: "medium" }, "Join Video Chat")),
        renderOld ? (figma.widget.h(AutoLayout, { cornerRadius: 4, fill: "#999", padding: 8, onClick: () => new Promise(() => {
                figma.showUI(`<script>location.href = "${urlOld}";</script>`, {
                    visible: true,
                    height: 400,
                    width: 400,
                });
                figma.ui.postMessage({ type: "add", id: sessionId() });
            }) },
            figma.widget.h(Text, { fontSize: 12, fill: "#FFF", fontWeight: "medium" }, "LoFi Video Chat"))) : null));
}
widget.register(Widget);
