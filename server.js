import { WebSocketServer } from "ws"

const PORT = 8181
const wss = new WebSocketServer({ port: PORT })

const clients = new Map()

wss.on("connection", (ws) => {
    clients.set(ws, { name: null })

    console.log(`Clients connected: ${clients.size}`)

    ws.on("message", (data) => {
        const msg = JSON.parse(data.toString())

        switch (msg.type) {
            case "join": {
                clients.get(ws).name = msg.name
                console.log(`${msg.name} connected. Tot ${clients.size}`)
                ws.send(JSON.stringify({ type: "welcome", name: msg.name }))
                broadcast(ws, { type: "info", message: `${msg.name} joined` })
                break
            }
            case "message": {
                const { name } = clients.get(ws)
                broadcast(ws, { type: "message", from: name, text: msg.text })
                break
            }
        }
    })

    ws.on("close", () => {
        const { name } = clients.get(ws)
        clients.delete(ws)
        if (name) {
            console.log(`${name} disconnected (tot ${clients.size})`)
            broadcast(null, { type: "info", message: `${name} left the building` })
        }
    })
})

function broadcast(sender, data) {
    const json = JSON.stringify(data)
    for (const [client] of clients) {
        if (client !== sender && client.readyState === client.OPEN) {
            client.send(json)
        }
    }
}

console.log(`Webscoket server is running on ws://localhost: ${PORT}`)
