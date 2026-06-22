const WebSocket = require("ws");
const ws = new WebSocket("wss://gomoku-online.3337987024.workers.dev");
const timer = setTimeout(() => { console.log("TIMEOUT"); ws.terminate(); process.exit(2); }, 10000);
ws.on("open", () => { console.log("OPEN"); ws.send(JSON.stringify({ type: "create_room" })); });
ws.on("message", data => { console.log("MESSAGE " + data.toString()); clearTimeout(timer); ws.close(); process.exit(0); });
ws.on("error", err => { console.log("ERROR " + err.message); clearTimeout(timer); process.exit(1); });
ws.on("close", (code, reason) => { console.log("CLOSE " + code + " " + reason); });
