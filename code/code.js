(() => {
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // code/code.tsx
  var { currentUser, widget } = figma;
  var { useEffect, useSyncedMap, AutoLayout, Image, Text } = widget;
  function Widget() {
    const messagesMap = useSyncedMap("messages");
    const sessionId = () => ((currentUser == null ? void 0 : currentUser.sessionId) || 0).toString();
    const ledger = () => messagesMap.values().reduce((val, curr) => val.concat(curr), []).sort((a, b) => a.time > b.time ? 1 : -1);
    useEffect(() => {
      figma.ui.onmessage = (message) => __async(this, null, function* () {
        if (message.type === "message") {
          const array = messagesMap.get(message.id) || [];
          array.push(message.data);
          messagesMap.set(message.id, array);
        } else if (message.type === "ping") {
          const data = ledger();
          const last = data[data.length - 1];
          if (last && last.time < Date.now() - 5e3) {
            messagesMap.keys().forEach((key) => messagesMap.delete(key));
          }
          figma.ui.postMessage({ type: "pong", data });
        }
      });
    });
    const url = "https://jakealbaugh.github.io/figma-widget-test";
    return /* @__PURE__ */ figma.widget.h(AutoLayout, {
      spacing: 8,
      padding: 8,
      direction: "vertical",
      horizontalAlignItems: "center"
    }, /* @__PURE__ */ figma.widget.h(AutoLayout, {
      cornerRadius: 4,
      fill: "#000",
      padding: 8,
      onClick: () => new Promise(() => {
        figma.showUI(`<script>location.href = "${url}";<\/script>`, {
          visible: true,
          height: 400,
          width: 400
        });
        figma.ui.postMessage({ type: "add", id: sessionId() });
      })
    }, /* @__PURE__ */ figma.widget.h(Text, {
      fontSize: 12,
      fill: "#FFF",
      fontWeight: "medium"
    }, "Join Video Chat")));
  }
  widget.register(Widget);
})();
