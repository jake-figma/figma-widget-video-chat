interface PayloadParamsDataBoolean {
  type: "rtc.accepted" | "rtc.joined";
  data: boolean;
}
interface PayloadParamsDataString {
  type: "rtc.sdp" | "rtc.ice";
  data: string;
}

interface PayloadRequired {
  from: string;
  to: string;
}
interface PayloadConnection {
  type: "connection" | "disconnection";
  data?: string;
}

type PayloadParams = PayloadParamsDataBoolean | PayloadParamsDataString;
type Payload = PayloadRequired &
  (PayloadParamsDataBoolean | PayloadParamsDataString | PayloadConnection) & {
    time?: number;
  };

const onError = console.error;
const USER_ID = Math.round(Math.random() * 100000000000000)
  .toString()
  .padStart(15, "0");

type DataHandler = (payload?: Payload) => void;

class WebRTC {
  api: API;
  connections: { [k: string]: RTCPeerConnection };
  connectionConfig: { iceServers: { urls: string }[] };
  streams: { [k: string]: MediaStream };
  onData: (payload: Payload) => void;

  constructor(api: API, onData: (payload: Payload) => void) {
    this.onData = onData;

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

  async initialize() {
    console.log("initializing!", this.api.userId);
    const { mediaDevices } = navigator;
    if (mediaDevices && mediaDevices.getUserMedia) {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        this.streams[this.api.userId] = stream;
        this.onData({
          type: "connection",
          from: this.api.userId,
          to: this.api.userId,
        });
        this.api.send("all", {
          type: "rtc.joined",
          data: false,
        });
      } catch (error) {
        onError(error);
      }
    } else {
      onError("Your browser does not support getUserMedia API");
      this.onData({
        type: "connection",
        from: this.api.userId,
        to: this.api.userId,
      });
      this.api.send("all", {
        type: "rtc.joined",
        data: false,
      });
    }
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
        // it is the stream
        // set up peer connection object for a newcomer peer
        this.initializePeer(from);
        this.api.send(from, { type: "rtc.accepted", data: false });
      } else if (type === "rtc.accepted") {
        // it is the stream
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
        this.onData(payload);
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
    this.onData({
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
      this.onData({
        type: "disconnection",
        from: peerId,
        to: this.api.userId,
      });
    }
  }
}

class Ledger {
  dataHandler: (payload: Payload) => Promise<any>;
  initialized = false;
  messages: Payload[] = [];
  messageIndex = 0;
  queue: Payload[] = [];
  processing = false;

  constructor(dataHandler: (payload: Payload) => Promise<any>) {
    this.dataHandler = dataHandler;
    window.onmessage = ({ data: { pluginMessage } }) =>
      this.receive(pluginMessage);
    this.ping();
    setInterval(this.ping, 150);
    setInterval(this.sendQueue.bind(this), 20);
  }

  ping() {
    parent.postMessage(
      {
        pluginMessage: { type: "ping", id: USER_ID },
        pluginId: "*",
      },
      "*"
    );
  }

  sendQueue() {
    if (this.queue.length) {
      const message = this.queue.shift();
      parent.postMessage(
        {
          pluginMessage: { type: "message", data: message, id: USER_ID },
          pluginId: "*",
        },
        "*"
      );
    }
  }

  addToSendQueue(message: Payload) {
    this.queue.push(message);
  }

  receive({ type, data }: { type: "pong"; data: Payload[] }) {
    if (type === "pong") {
      if (!this.initialized) {
        this.messageIndex = data.length;
        this.initialized = true;
      }
      if (data.length < this.messages.length) {
        this.messageIndex = 0;
      }
      this.messages = data;
      this.processMessages();
    }
  }

  async processMessages() {
    if (this.processing || this.messageIndex >= this.messages.length) {
      return;
    }
    this.processing = true;
    await this.dataHandler(this.messages[this.messageIndex]);
    this.messageIndex++;
    this.processing = false;
    this.processMessages();
  }
}

class API {
  ledger: Ledger;
  userId: string;
  rtc: WebRTC;

  constructor(userId: string, onData: DataHandler) {
    this.userId = userId;
    this.rtc = new WebRTC(this, onData);
    this.ledger = new Ledger(this.rtc.handleData.bind(this.rtc));
    this.rtc.initialize();
  }

  send(to: string, payload: PayloadParams) {
    this.ledger.addToSendQueue({
      ...payload,
      to,
      from: this.userId,
      time: Date.now(),
    });
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
    this.api = new API(this.userId, this.handleData.bind(this));
    this.container = container;
  }

  handleData(payload: Payload) {
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
      this.container.style.setProperty("--di", `${100 * di}vw`);
    }
  }
}

const dom = new Dom(document.querySelector("main"));
