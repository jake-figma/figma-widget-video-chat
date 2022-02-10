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

  // types.ts
  var isUiMessagePing = (message) => message.type === "ping";
  var isUiMessageRTCData = (message) => message.type === "rtc";

  // code/code.tsx
  var { currentUser, widget } = figma;
  var { useEffect, useSyncedMap, AutoLayout, Text } = widget;
  function Widget() {
    const messagesMap = useSyncedMap("messages");
    const sessionId = () => ((currentUser == null ? void 0 : currentUser.sessionId) || 0).toString();
    const flattenedAndSortedMessages = () => messagesMap.values().reduce((val, curr) => val.concat(curr), []).sort((a, b) => a.time > b.time ? 1 : -1);
    const sendInitMessage = () => {
      const message = {
        type: "initialize",
        data: sessionId()
      };
      figma.ui.postMessage(message);
    };
    const sendPongMessage = () => {
      const message = {
        type: "pong",
        data: flattenedAndSortedMessages()
      };
      figma.ui.postMessage(message);
    };
    const showUi = () => {
      const url = "https://jakealbaugh.github.io/figma-widget-test";
      const opts = { visible: true, height: 400, width: 400 };
      figma.showUI(`<script>location.href = "${url}";<\/script>`, opts);
    };
    useEffect(() => {
      figma.ui.onmessage = (message) => __async(this, null, function* () {
        if (isUiMessageRTCData(message)) {
          const array = messagesMap.get(message.id) || [];
          array.push(message.data);
          messagesMap.set(message.id, array);
        } else if (isUiMessagePing(message)) {
          const array = messagesMap.get(message.id) || [];
          const last = array[array.length - 1];
          if (last && last.time < Date.now() - 5e3) {
            messagesMap.delete(message.id);
          }
          sendPongMessage();
        }
      });
    });
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
        showUi();
        sendInitMessage();
      })
    }, /* @__PURE__ */ figma.widget.h(Text, {
      fontSize: 12,
      fill: "#FFF",
      fontWeight: "medium"
    }, "Join Video Chat")));
  }
  widget.register(Widget);
})();
