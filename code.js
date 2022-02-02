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
const { useEffect, useSyncedMap, AutoLayout, Image, Text } = widget;
function Widget() {
    const dataMap = useSyncedMap("data");
    const sessionId = () => (currentUser.sessionId || 0).toString();
    useEffect(() => {
        figma.ui.onmessage = (message) => __awaiter(this, void 0, void 0, function* () {
            if (message.type === "image") {
                const id = sessionId();
                dataMap.set(id, { id, data: message.data });
                figma.ui.postMessage({ type: "images", data: dataMap.entries() }, { origin: "*" });
            }
            else {
                console.log("ASDF", message);
            }
        });
    });
    const url = "http://localhost:42069";
    // const url = "https://staging.figma.com/widgets/photobooth"; // staging
    return (figma.widget.h(AutoLayout, { spacing: 16 },
        figma.widget.h(Text, { fontSize: 24, onClick: () => new Promise(() => {
                figma.showUI(`<script>location.href = "${url}";</script>`, {
                    visible: true,
                    height: 400,
                    width: 400,
                });
                figma.ui.postMessage({ type: "add", id: sessionId() });
            }) }, "Join Video Chat"),
        figma.widget.h(Text, { fontSize: 24, onClick: () => dataMap.keys().forEach((k) => dataMap.delete(k)) }, "Purge")));
}
widget.register(Widget);
