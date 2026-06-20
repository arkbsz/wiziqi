const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 4000;

const MIME_TYPES = {};
MIME_TYPES[".html"] = "text/html; charset=utf-8";
MIME_TYPES[".js"] = "text/javascript; charset=utf-8";
MIME_TYPES[".css"] = "text/css; charset=utf-8";
MIME_TYPES[".json"] = "application/json; charset=utf-8";
MIME_TYPES[".svg"] = "image/svg+xml";
MIME_TYPES[".png"] = "image/png";
MIME_TYPES[".gif"] = "image/gif";
MIME_TYPES[".jpeg"] = "image/jpeg";
MIME_TYPES[".jpg"] = "image/jpeg";

const server = http.createServer((req, res) => {
  let fp = req.url === "/" ? "/index.html" : url.parse(req.url).pathname;
  fp = path.join(__dirname, "public", fp);
  const ext = path.extname(fp);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    var h={"Content-Type":MIME_TYPES[ext]||"application/octet-stream"};if(fp.endsWith("sw.js"))h["Cache-Control"]="no-cache, no-store, must-revalidate";res.writeHead(200,h);
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = {};

function genCode() {
  let c;
  do { c = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (rooms[c]);
  return c;
}

function emptyBoard() {
  return Array.from({ length: 19 }, () => Array(19).fill(null));
}

function broadcast(room, msg) {
  const d = JSON.stringify(msg);
  room.players.forEach(p => { if (p.readyState === WebSocket.OPEN) p.send(d); });
}

function checkWin(b, r, c, p) {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [dx, dy] of dirs) {
    let cnt = 1;
    for (let i = 1; i < 5; i++) {
      const rr = r + dx*i, cc = c + dy*i;
      if (rr < 0 || rr >= 19 || cc < 0 || cc >= 19 || b[rr][cc] !== p) break;
      cnt++;
    }
    for (let i = 1; i < 5; i++) {
      const rr = r - dx*i, cc = c - dy*i;
      if (rr < 0 || rr >= 19 || cc < 0 || cc >= 19 || b[rr][cc] !== p) break;
      cnt++;
    }
    if (cnt >= 5) return true;
  }
  return false;
}

function getWinLine(b, r, c, p) {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [dx, dy] of dirs) {
    const cells = [[r, c]];
    for (let i = 1; i < 5; i++) {
      const rr = r + dx*i, cc = c + dy*i;
      if (rr < 0 || rr >= 19 || cc < 0 || cc >= 19 || b[rr][cc] !== p) break;
      cells.push([rr, cc]);
    }
    for (let i = 1; i < 5; i++) {
      const rr = r - dx*i, cc = c - dy*i;
      if (rr < 0 || rr >= 19 || cc < 0 || cc >= 19 || b[rr][cc] !== p) break;
      cells.push([rr, cc]);
    }
    if (cells.length >= 5) return cells;
  }
  return [[r, c]];
}

function isFull(b) {
  return b.every(row => row.every(cell => cell !== null));
}

wss.on("connection", (ws, req) => {
  ws.room = null;
  ws.player = null;
  const ip = req.socket.remoteAddress;
  console.log("Client connected from " + ip);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMsg(ws, msg);
    } catch (e) {
      console.error("Invalid message:", e);
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.room];
    if (room) {
      const opp = room.players.find(p => p !== ws);
      if (opp && opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify({ type: "opponent_disconnected" }));
      delete rooms[ws.room];
    }
  });
});

function handleMsg(ws, msg) {
  switch (msg.type) {
    case "create_room": {
      const code = genCode();
      rooms[code] = { code, players: [ws], board: emptyBoard(), currentPlayer: "black", gameOver: false };
      ws.room = code;
      ws.player = "black";
      ws.send(JSON.stringify({ type: "room_created", code, player: "black" }));
      console.log("Room " + code + " created by black, total rooms="+Object.keys(rooms).length);
      break;
    }
    case "join_room": {console.log("Join room request: code="+msg.code+", rooms keys="+Object.keys(rooms).join(","));
      const room = rooms[msg.code];
      if (!room) { ws.send(JSON.stringify({ type: "error", message: "房间不存在" })); return; }
      if (room.players.length >= 2) { ws.send(JSON.stringify({ type: "error", message: "房间已满" })); return; }
      room.players.push(ws);
      ws.room = msg.code;
      ws.player = "white";
      ws.send(JSON.stringify({ type: "room_joined", code: msg.code, player: "white" }));
      room.players[0].send(JSON.stringify({ type: "opponent_joined" }));
      ws.send(JSON.stringify({ type: "board_state", board: room.board, currentPlayer: room.currentPlayer }));
      console.log("White joined room " + msg.code);
      break;
    }
    case "make_move": {
      const room = rooms[ws.room];
      if (!room) return;
      if (room.gameOver) { ws.send(JSON.stringify({ type: "error", message: "游戏已结束" })); return; }
      if (room.currentPlayer !== ws.player) { ws.send(JSON.stringify({ type: "error", message: "还没轮到你" })); return; }
      const { row, col } = msg;
      if (row < 0 || row >= 19 || col < 0 || col >= 19 || room.board[row][col] !== null) {
        ws.send(JSON.stringify({ type: "error", message: "无效落子" }));
        return;
      }
      room.board[row][col] = ws.player;
      if (checkWin(room.board, row, col, ws.player)) {
        room.gameOver = true;
        broadcast(room, { type: "game_over", winner: ws.player, row, col, winLine: getWinLine(room.board, row, col, ws.player) });
      } else if (isFull(room.board)) {
        room.gameOver = true;
        broadcast(room, { type: "game_over", winner: "draw", row, col });
      } else {
        room.currentPlayer = ws.player === "black" ? "white" : "black";
        broadcast(room, { type: "move_made", row, col, player: ws.player, currentPlayer: room.currentPlayer });
      }
      break;
    }
    case "restart": {
      const room = rooms[ws.room];
      if (!room) return;
      room.board = emptyBoard();
      room.currentPlayer = "black";
      room.gameOver = false;
      broadcast(room, { type: "restarted" });
      break;
    }
    case "leave_room": {
      const room = rooms[ws.room];
      if (room) {
        const opp = room.players.find(p => p !== ws);
        if (opp && opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify({ type: "opponent_left" }));
        delete rooms[ws.room];
      }
      ws.room = null;
      ws.player = null;
      break;
    }
  }
}

server.listen(PORT, () => {
  console.log("Gomoku server on http://localhost:" + PORT);
});
