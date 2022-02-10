import {
  Payload,
  PayloadMessage,
  PayloadParams,
  PingMessage,
  PongMessage,
} from "../types";

const onError = console.error;
// Not ashamed at all. Don't @ me.
const USER_ID = Math.round(Math.random() * 100000000000000)
  .toString()
  .padStart(15, "0");

class WebRTC {
  api: API;
  connections: { [k: string]: RTCPeerConnection };
  connectionConfig: { iceServers: { urls: string }[] };
  streams: { [k: string]: MediaStream };

  constructor(api: API) {
    this.api = api;
    this.connections = {};
    this.connectionConfig = {
      iceServers: [
        { urls: "stun:stun.stunprotocol.org:3478" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    };
    this.streams = {};
  }

  initialize(deviceId: string) {
    console.log("initializing!", this.api.userId);
    return new Promise(async (resolve) => {
      const { mediaDevices } = navigator;
      if (mediaDevices && mediaDevices.getUserMedia) {
        try {
          const stream = await mediaDevices.getUserMedia({
            audio: false,
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
          });
          this.streams[this.api.userId] = stream;
          this.api.dom.handleData({
            type: "connection",
            from: this.api.userId,
            to: this.api.userId,
          });
          this.api.send("all", {
            type: "rtc.joined",
            data: false,
          });
          resolve(true);
        } catch (error) {
          onError(error);
        }
      } else {
        onError("Your browser does not support getUserMedia API");
        this.api.dom.handleData({
          type: "connection",
          from: this.api.userId,
          to: this.api.userId,
        });
        this.api.send("all", {
          type: "rtc.joined",
          data: false,
        });
      }
    });
  }

  async initializePeer(peerId: string, initCall = false) {
    try {
      this.connections[peerId] = new RTCPeerConnection(this.connectionConfig);
      this.connections[peerId].onicecandidate = (event) =>
        this.gotIceCandidate(event, peerId);
      this.connections[peerId].ontrack = (event) =>
        this.gotRemoteStream(event, peerId);
      this.connections[peerId].oniceconnectionstatechange = (event) =>
        this.monitorConnection(event, peerId);
      const stream = this.streams[this.api.userId];
      if (stream) {
        stream
          .getTracks()
          .forEach((track) => this.connections[peerId].addTrack(track, stream));
      }

      if (initCall) {
        const description = await this.connections[peerId].createOffer();
        this.gotDescription(description, peerId);
      }
    } catch (error) {
      onError(error);
    }
  }

  async handleData(payload: Payload) {
    try {
      const { type, data, from, to } = payload;
      const fromSelf = from === this.api.userId;
      const toSelf = to === this.api.userId || to === "all";
      // Ignore messages that are not for us or are from us
      if (type.match("rtc") && (fromSelf || !toSelf)) {
        return;
      }

      if (type === "rtc.joined") {
        // set up peer connection object for a newcomer peer
        this.initializePeer(from);
        this.api.send(from, { type: "rtc.accepted", data: false });
      } else if (type === "rtc.accepted") {
        // initiate call if we are the newcomer peer
        this.initializePeer(from, true);
      } else if (type === "rtc.sdp" && data) {
        const d = JSON.parse(data as string) as RTCSessionDescription;
        await this.connections[from].setRemoteDescription(
          new RTCSessionDescription(d)
        );
        if (d && d.type === "offer") {
          const description = await this.connections[from].createAnswer();
          this.gotDescription(description, from);
        }
      } else if (type === "rtc.ice") {
        const d = JSON.parse(data as string) as RTCIceCandidateInit;
        await this.connections[from].addIceCandidate(new RTCIceCandidate(d));
      } else {
        this.api.dom.handleData(payload);
      }
      return true;
    } catch (error) {
      onError(error);
    }
  }

  gotIceCandidate(event: RTCPeerConnectionIceEvent, peerId: string) {
    if (event.candidate === null) return;
    const data = JSON.stringify(event.candidate);
    this.api.send(peerId, { type: "rtc.ice", data });
  }

  async gotDescription(description: RTCSessionDescriptionInit, peerId: string) {
    console.log(`got description, peer ${peerId}`);
    try {
      await this.connections[peerId].setLocalDescription(description);
      const data = JSON.stringify(this.connections[peerId].localDescription);
      this.api.send(peerId, { type: "rtc.sdp", data });
    } catch (error) {
      onError(error);
    }
  }

  gotRemoteStream(event: RTCTrackEvent, peerId: string) {
    console.log(`got remote stream, peer ${peerId}`);
    this.streams[peerId] = event.streams[0];
    this.api.dom.handleData({
      type: "connection",
      from: peerId,
      to: this.api.userId,
    });
  }

  monitorConnection(event: Event, peerId: string) {
    const state = this.connections[peerId].iceConnectionState;
    console.log(`connection with peer ${peerId} ${state}`);
    if (state === "failed" || state === "closed" || state === "disconnected") {
      delete this.connections[peerId];
      delete this.streams[peerId];
      this.api.dom.handleData({
        type: "disconnection",
        from: peerId,
        to: this.api.userId,
      });
    }
  }
}

class API {
  dom: Dom;
  initialized = false;
  messages: Payload[] = [];
  messageIndex = 0;
  processing = false;
  rtc: WebRTC;
  userId: string;

  constructor(userId: string, dom: Dom) {
    this.dom = dom;
    this.userId = userId;
    this.rtc = new WebRTC(this);
    window.onmessage = ({ data: { pluginMessage } }) =>
      this.receiveMessageFromParent(pluginMessage);
  }

  async initialize(deviceId: string) {
    await this.rtc.initialize(deviceId);
    this.sendPing();
    setInterval(this.sendPing.bind(this), 150);
  }

  send(to: string, payload: PayloadParams) {
    this.sendMessage({
      ...payload,
      to,
      from: this.userId,
      time: Date.now(),
    });
  }

  sendMessage(message: Payload) {
    this.postMessageToParent({ type: "message", data: message, id: USER_ID });
  }

  sendPing() {
    this.postMessageToParent({ type: "ping", id: USER_ID });
  }

  postMessageToParent(pluginMessage: PingMessage | PayloadMessage) {
    parent.postMessage({ pluginMessage, pluginId: "*" }, "*");
  }

  async processMessages() {
    if (this.processing || this.messageIndex >= this.messages.length) {
      return;
    }
    this.processing = true;
    await this.rtc.handleData(this.messages[this.messageIndex]);
    this.messageIndex++;
    this.processing = false;
    this.processMessages();
  }

  receiveMessageFromParent({ type, data }: PongMessage) {
    if (type === "pong") {
      if (!this.initialized) {
        this.messageIndex = data.length;
        this.initialized = true;
      }
      if (data.length < this.messages.length) {
        this.messageIndex = 0;
      }
      // helpful for debugging multiplayer being in sync
      // console.log(data.length);
      this.messages = data;
      this.processMessages();
    }
  }
}

class Dom {
  api: API;
  initializing = true;
  container: HTMLElement;
  videos: { [key: string]: HTMLVideoElement } = {};
  streams: { [key: string]: MediaStream } = {};
  streamId: string | null = null;
  userId = USER_ID;

  constructor(container: HTMLElement) {
    this.api = new API(this.userId, this);
    this.container = container;
    this.initializeDom();
  }

  initializeDom() {
    const select = document.getElementById("camera") as HTMLSelectElement;
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
        select.innerHTML =
          "<option selected disabled>No Permission / No Camera Detected</option>";
      }
    });
  }

  handleData(payload: Omit<Payload, "time">) {
    if (!payload) {
      return;
    }
    if (["connection", "disconnection"].includes(payload.type)) {
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
  }
}

const dom = new Dom(document.querySelector("main"));
