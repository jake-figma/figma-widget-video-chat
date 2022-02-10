(() => {
  // types.ts
  var isWidgetMessageInit = (message) => message.type === "initialize";
  var isWidgetMessagePong = (message) => message.type === "pong";

  // ui/ui.ts
  var onError = console.error;
  var WebRTC = class {
    constructor(api) {
      this.api = api;
      this.connections = {};
      this.connectionConfig = {
        iceServers: [
          { urls: "stun:stun.stunprotocol.org:3478" },
          { urls: "stun:stun.l.google.com:19302" }
        ]
      };
      this.streams = {};
    }
    initialize(deviceId) {
      console.log("initializing!", this.api.app.userId);
      return new Promise(async (resolve) => {
        const { mediaDevices } = navigator;
        if (mediaDevices && mediaDevices.getUserMedia) {
          try {
            const stream = await mediaDevices.getUserMedia({
              audio: false,
              video: deviceId ? { deviceId: { exact: deviceId } } : true
            });
            this.streams[this.api.app.userId] = stream;
            this.api.app.handleEvent({
              type: "connection",
              from: this.api.app.userId,
              to: this.api.app.userId
            });
            this.api.send("all", {
              type: "rtc.joined",
              data: false
            });
            resolve(true);
          } catch (error) {
            onError(error);
          }
        } else {
          onError("Your browser does not support getUserMedia API");
          this.api.app.handleEvent({
            type: "connection",
            from: this.api.app.userId,
            to: this.api.app.userId
          });
          this.api.send("all", {
            type: "rtc.joined",
            data: false
          });
        }
      });
    }
    async initializePeer(peerId, initCall = false) {
      try {
        this.connections[peerId] = new RTCPeerConnection(this.connectionConfig);
        this.connections[peerId].onicecandidate = (event) => this.gotIceCandidate(event, peerId);
        this.connections[peerId].ontrack = (event) => this.gotRemoteStream(event, peerId);
        this.connections[peerId].oniceconnectionstatechange = (event) => this.monitorConnection(event, peerId);
        const stream = this.streams[this.api.app.userId];
        if (stream) {
          stream.getTracks().forEach((track) => this.connections[peerId].addTrack(track, stream));
        }
        if (initCall) {
          const description = await this.connections[peerId].createOffer();
          this.gotDescription(description, peerId);
        }
      } catch (error) {
        onError(error);
      }
    }
    async handleIncomingMessage(payload) {
      try {
        const { type, data, from, to } = payload;
        const fromSelf = from === this.api.app.userId;
        const toSelf = to === this.api.app.userId || to === "all";
        if (type.match("rtc") && (fromSelf || !toSelf)) {
          return;
        }
        if (type === "rtc.joined") {
          this.initializePeer(from);
          this.api.send(from, { type: "rtc.accepted", data: false });
        } else if (type === "rtc.accepted") {
          this.initializePeer(from, true);
        } else if (type === "rtc.sdp" && data) {
          const d = JSON.parse(data);
          await this.connections[from].setRemoteDescription(new RTCSessionDescription(d));
          if (d && d.type === "offer") {
            const description = await this.connections[from].createAnswer();
            this.gotDescription(description, from);
          }
        } else if (type === "rtc.ice") {
          const d = JSON.parse(data);
          await this.connections[from].addIceCandidate(new RTCIceCandidate(d));
        } else {
          this.api.app.handleEvent(payload);
        }
        return true;
      } catch (error) {
        onError(error);
      }
    }
    gotIceCandidate(event, peerId) {
      if (event.candidate === null)
        return;
      const data = JSON.stringify(event.candidate);
      this.api.send(peerId, { type: "rtc.ice", data });
    }
    async gotDescription(description, peerId) {
      console.log(`got description, peer ${peerId}`);
      try {
        await this.connections[peerId].setLocalDescription(description);
        const data = JSON.stringify(this.connections[peerId].localDescription);
        this.api.send(peerId, { type: "rtc.sdp", data });
      } catch (error) {
        onError(error);
      }
    }
    gotRemoteStream(event, peerId) {
      console.log(`got remote stream, peer ${peerId}`);
      this.streams[peerId] = event.streams[0];
      this.api.app.handleEvent({
        type: "connection",
        from: peerId,
        to: this.api.app.userId
      });
    }
    monitorConnection(event, peerId) {
      const state = this.connections[peerId].iceConnectionState;
      console.log(`connection with peer ${peerId} ${state}`);
      if (state === "failed" || state === "closed" || state === "disconnected") {
        delete this.connections[peerId];
        delete this.streams[peerId];
        this.api.app.handleEvent({
          type: "disconnection",
          from: peerId,
          to: this.api.app.userId
        });
      }
    }
  };
  var API = class {
    constructor(app2) {
      this.messageCursor = 0;
      this.messages = [];
      this.processing = false;
      this.app = app2;
      this.rtc = new WebRTC(this);
      window.onmessage = ({ data: { pluginMessage } }) => this.receiveMessageFromParent(pluginMessage);
    }
    async initialize(deviceId) {
      await this.rtc.initialize(deviceId);
      this.sendPing();
      setInterval(this.sendPing.bind(this), 150);
    }
    send(to, payload) {
      this.sendRTC({
        ...payload,
        to,
        from: this.app.userId,
        time: Date.now()
      });
    }
    sendPing() {
      this.postMessageToParent({ type: "ping", id: this.app.userId });
    }
    sendRTC(data) {
      this.postMessageToParent({ type: "rtc", data, id: this.app.userId });
    }
    postMessageToParent(pluginMessage) {
      parent.postMessage({ pluginMessage, pluginId: "*" }, "*");
    }
    async processMessages() {
      if (this.processing || !this.messages.length) {
        return;
      }
      this.processing = true;
      const message = this.messages.find(({ time }) => time > this.messageCursor);
      if (message) {
        await this.rtc.handleIncomingMessage(message);
        this.messageCursor = message.time;
        this.processing = false;
        this.processMessages();
      }
      this.processing = false;
    }
    receiveMessageFromParent(message) {
      if (isWidgetMessagePong(message)) {
        this.messages = message.data;
        this.processMessages();
      } else if (isWidgetMessageInit(message)) {
        this.app.initializeApp(message.data);
      }
    }
  };
  var App = class {
    constructor(container) {
      this.initializing = true;
      this.videos = {};
      this.streams = {};
      this.streamId = null;
      this.api = new API(this);
      this.container = container;
    }
    initializeApp(userId) {
      console.log({ userId });
      this.userId = userId;
      const select = document.getElementById("camera");
      select.addEventListener("change", async () => {
        select.remove();
        this.api.initialize(select.value);
      });
      navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
        if (mediaDevices.length) {
          select.innerHTML = "<option selected disabled>Choose Camera</option>";
          let count = 1;
          mediaDevices.forEach(({ kind, label, deviceId }) => {
            if (kind === "videoinput") {
              const option = document.createElement("option");
              option.value = deviceId;
              option.innerText = label || `Camera ${count++}`;
              select.appendChild(option);
            }
          });
        } else {
          select.disabled = true;
          select.innerHTML = "<option selected disabled>No Permission / No Camera Detected</option>";
        }
      });
    }
    handleEvent(payload) {
      if (!["connection", "disconnection"].includes(payload.type)) {
        return;
      }
      const streams = this.api.rtc.streams;
      const curr = Object.keys(this.streams);
      const news = Object.keys(streams);
      const deleted = curr.filter((id) => !news.includes(id));
      news.forEach((id) => {
        if (!this.streams[id]) {
          this.streams[id] = streams[id];
          const video = document.createElement("video");
          video.srcObject = streams[id];
          video.autoplay = true;
          video.volume = 0;
          video.muted = true;
          video.playsInline = true;
          this.videos[id] = video;
          this.container.appendChild(video);
        }
      });
      deleted.forEach((id) => {
        delete this.streams[id];
        this.videos[id].remove();
        delete this.videos[id];
      });
      const count = this.container.querySelectorAll("video").length;
      const di = 1 / Math.ceil(Math.sqrt(count));
      this.container.style.setProperty("--di-rat", di.toFixed(5));
    }
  };
  var app = new App(document.querySelector("main"));
})();
