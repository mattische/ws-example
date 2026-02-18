# WebSockets i terminalen

Bygg en chattapplikation med WebSockets i Node.js, steg för steg.

---

## Steg 1 — Projekt-setup

```bash
npm init -y
npm install ws
```

Lägg till i `package.json`:

```json
"type": "module",
"scripts": {
  "server": "node server.js",
  "client": "node client.js"
}
```

---

## Steg 2 — Server: lyssna på anslutningar

Skapa `server.js`:

```js
import { WebSocketServer } from "ws";

const PORT = 8181;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Client connected");
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
```

Testa: `npm run server`

---

## Steg 3 — Klient: anslut till servern

Skapa `client.js`:

```js
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8181");

ws.on("open", () => {
  console.log("Connected to server!");
});
```

Testa: `npm run client` — båda terminaler loggar anslutningen.

---

## Steg 4 — Klient: läs input från terminalen

Lägg till i `client.js`:

```js
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (line) => {
  if (line.trim()) {
    ws.send(line.trim());
  }
});
```

---

## Steg 5 — Server: logga mottagna meddelanden

Lägg till inuti `connection`-callbacken i `server.js`:

```js
ws.on("message", (data) => {
  console.log(`Received: ${data}`);
});
```

Testa: skriv i klienten — det syns i servern.

---

## Steg 6 — Server: broadcast till alla klienter

Lägg till en `Set` högst upp i `server.js`:

```js
const clients = new Set();
```

Uppdatera `connection`-callbacken:

```js
wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`Client connected (total: ${clients.size})`);

  ws.on("message", (data) => {
    for (const client of clients) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(data.toString());
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});
```

---

## Steg 7 — Klient: visa inkommande meddelanden

Lägg till i `client.js`:

```js
ws.on("message", (data) => {
  console.log(data.toString());
});
```

Testa med **två klienter** — skriv i en, det visas i den andra. Fungerande chatt!

---

## Steg 8 — Byt till JSON-protokoll

Klienten skickar nu JSON. Ändra `rl.on("line", ...)` i `client.js`:

```js
rl.on("line", (line) => {
  if (line.trim()) {
    ws.send(JSON.stringify({ type: "message", text: line.trim() }));
  }
});
```

---

## Steg 9 — Server: parsa JSON och broadcast:a

Ändra `message`-hanteraren i `server.js`:

```js
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === "message") {
    for (const client of clients) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(JSON.stringify({ type: "message", text: msg.text }));
      }
    }
  }
});
```

---

## Steg 10 — Klient: parsa inkommande JSON

Ändra `message`-hanteraren i `client.js`:

```js
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === "message") {
    console.log(msg.text);
  }
});
```

Testa — fungerar som innan, men nu har vi ett utbyggbart protokoll.

---

## Steg 11 — Server: spara klienter med namn

Byt `Set` till `Map` i `server.js`:

```js
const clients = new Map();
```

Ändra första raden i `connection`-callbacken:

```js
clients.set(ws, { name: null });
```

---

## Steg 12 — Server: hantera join

Ändra `message`-hanteraren till en switch i `server.js`:

```js
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  switch (msg.type) {
    case "join": {
      clients.get(ws).name = msg.name;
      console.log(`${msg.name} connected (total: ${clients.size})`);
      ws.send(JSON.stringify({ type: "welcome", name: msg.name }));
      broadcast(ws, { type: "info", message: `${msg.name} joined` });
      break;
    }
    case "message": {
      const { name } = clients.get(ws);
      broadcast(ws, { type: "message", from: name, text: msg.text });
      break;
    }
  }
});
```

---

## Steg 13 — Server: broadcast-funktion och disconnect

Lägg till `broadcast`-funktionen i `server.js`:

```js
function broadcast(sender, data) {
  const json = JSON.stringify(data);
  for (const [client] of clients) {
    if (client !== sender && client.readyState === client.OPEN) {
      client.send(json);
    }
  }
}
```

Uppdatera `close`-hanteraren:

```js
ws.on("close", () => {
  const { name } = clients.get(ws);
  clients.delete(ws);
  if (name) {
    console.log(`${name} disconnected (total: ${clients.size})`);
    broadcast(null, { type: "info", message: `${name} left` });
  }
});
```

---

## Steg 14 — Klient: fråga efter namn

Ändra `open`-hanteraren i `client.js`:

```js
ws.on("open", () => {
  rl.question("Your name: ", (name) => {
    if (name)
      ws.send(JSON.stringify({ type: "join", name: name.trim() }));
  });
});
```

---

## Steg 15 — Klient: hantera alla meddelandetyper

Ändra `message`-hanteraren i `client.js`:

```js
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  switch (msg.type) {
    case "welcome":
      console.log(`\nWelcome, ${msg.name}! Type a message and press Enter.\n`);
      break;
    case "info":
      console.log(`--- ${msg.message} ---`);
      break;
    case "message":
      console.log(`${msg.from}: ${msg.text}`);
      break;
  }
});
```

Klart! Testa med två klienter — namn visas på varje meddelande.

---

## Meddelandeprotokoll

**Klient → Server:**

| type      | Fält   | Beskrivning              |
|-----------|--------|--------------------------|
| `join`    | `name` | Klientens valda namn     |
| `message` | `text` | Meddelande att skicka    |

**Server → Klient:**

| type      | Fält           | Beskrivning                    |
|-----------|----------------|--------------------------------|
| `welcome` | `name`         | Bekräftelse av namn            |
| `info`    | `message`      | Systemmeddelande (join/leave)  |
| `message` | `from`, `text` | Chattmeddelande från en klient |

---

## Jämförelse: `ws` vs socket.io

Hur skulle samma exempel se ut med socket.io?

---

### Server med socket.io

```js
import { Server } from "socket.io";

const io = new Server(8181);

io.on("connection", (socket) => {
  socket.on("join", (name) => {
    socket.data.name = name;
    socket.emit("welcome", name);
    socket.broadcast.emit("info", `${name} joined`);
  });

  socket.on("message", (text) => {
    socket.broadcast.emit("message", { from: socket.data.name, text });
  });

  socket.on("disconnect", () => {
    io.emit("info", `${socket.data.name} left`);
  });
});
```

Ingen manuell `JSON.stringify`, ingen broadcast-loop, namngivna events direkt.

---

### Klient med socket.io

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:8181");

socket.on("message", ({ from, text }) => {
  console.log(`${from}: ${text}`);
});

socket.emit("join", name);
socket.emit("message", text);
```

Ingen `JSON.parse`, inga `type`-fält — varje event har sitt eget namn.

---

### Skillnader i översikt

| | `ws` | `socket.io` |
|---|---|---|
| Protokoll | Ren WebSocket (RFC 6455) | Eget protokoll ovanpå WebSocket |
| Broadcast | Manuell loop | `socket.broadcast.emit()` inbyggt |
| Serialisering | Manuell `JSON.stringify/parse` | Automatisk |
| Events | Ett `message`-event, du dispatch:ar själv | Namngivna events direkt |
| Reconnect | Måste byggas själv | Automatisk |
| Klient-paket | Samma `ws`-paket | Separat `socket.io-client` |

---

### När välja vad?

- **`ws`** — förstå protokollet, lättviktigt, full kontroll
- **socket.io** — rum/kanaler, auto-reconnect, HTTP long-polling fallback

För lärande rekommenderas `ws`. Socket.io är ett bra nästa steg.

---

## Idéer för att bygga vidare

- **Privata meddelanden** — skicka till en specifik klient baserat på namn
- **Rum/kanaler** — gruppera klienter i separata rum
- **Meddelandehistorik** — spara och visa senaste meddelanden till nya klienter
- **Webb-klient** — skapa en HTML-sida som ansluter med `new WebSocket()`
