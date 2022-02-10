# WebRTC Video Chat Widget

This widget should work out of the box in staging (camera access required), but if you want to edit this, there are a few things to keep in mind.

## Setup

`npm run dev` is all you need to do to develop this widget. It starts three processes:

- compilation of `code/code.js`
- compilation of `ui/ui.js`
- hosting ui locally (python http server)

## UI Hosting

To get camera access, this widget UI uses the `window.location.href = ...` hack we are using in the photobooth widget.
For now and unless you change the code, the ui for this widget is hosted _externally_ at [jakealbaugh.github.io](https://jakealbaugh.github.io/figma-widget-test).

If you would like to develop the ui, change the `url` definition in `code/code.tsx` to be the commented out localhost url.
You can test the ui with different sessions on your own machine, but since the url is local, your machine will be the only one that can load the UI.

## types.ts

This structure shares types across code and ui. This is helpful for formatting messages posted and received between the ui and widget.

## How it works

To establish a WebRTC connection, each new session must exchange a series of messages with every other session. To achieve this in a widget, we use a synced map and polling.

When ui posts `Message` to widget, widget receives `Message` and pushes into `Message[]` stored at `messagesMap.get(ui.id)`.

```ts
const messagesMap = useSyncedMap<Message[]>("messages");
```

```ts
function receiveMessage(message: Message) {
  const array = messagesMap.get(message.uuid) || [];
  messagesMap.set(message.uuid, array.concat(message));
}
```

When ui polls widget for all `Messages` periodically, widget returns a flattened `Message[]` by merging `messagesMap` values and sorting by timestamp.

```ts
const allMessages = messagesMap
  .values()
  .reduce<Message[]>((a, b) => a.concat(b), [])
  .sort((a, b) => a.time - b.time);
```

UI then processes all relevant messages using a cursor that indicates the timestamp of last message received.

### Cleaning

These messages can be very lengthy, and widget sorting all messages every time it is polled can be intense, so it is important the messages map is cleared whenever possible.

To do this, when it is polled, the widget cleans out old messages from that user.
