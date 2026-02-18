import WebSocket from "ws"
import readline from "readline"

const ws = new WebSocket("ws://localhost:8181")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

ws.on("open", () => {
    console.log("Connected to sörver!")

    rl.question("Your name: ", (name) => {
        if (name)
            ws.send(JSON.stringify({ type: "join", name: name.trim() }))
    })
})

rl.on("line", (line) => {
    if (line.trim()) {
        ws.send(JSON.stringify({ type: "message", text: line.trim() }))
    }
})

ws.on("message", (data) => {
    const msg = JSON.parse(data.toString())

    switch (msg.type) {
        case "welcome":
            console.log(`\nWelcome, ${msg.name}! Type a message end press enter.\n`)
            break
        case "info":
            console.log(` --- ${msg.message} --- `)
            break
        case "message":
            console.log(`${msg.from}: ${msg.text}`)
            break
    }
})