const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4000;
const BOARD_SIZE = 19;
const BLACK = "black";
const WHITE = "white";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".webp": "image/webp"
};

const rooms = Object.create(null);

const server = http.createServer(async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || "/";

  try {
    if (pathname === "/health") {
      sendJson(res, 200, {
        name: "gomoku-local",
        status: "ok",
        transport: "http-polling"
      });
      return;
    }

    if (pathname === "/api/create-room" && req.method === "POST") {
      const code = generateCode();
      rooms[code] = {
        code,
        blackToken: createToken(),
        whiteToken: null,
        board: emptyBoard(),
        currentPlayer: BLACK,
        gameOver: false,
        winner: null,
        winLine: null,
        updatedAt: Date.now()
      };

      sendJson(res, 200, {
        ok: true,
        code,
        player: BLACK,
        token: rooms[code].blackToken
      });
      return;
    }

    if (pathname === "/api/join-room" && req.method === "POST") {
      const body = await readJsonBody(req);
      const code = String(body?.code || "");
      const room = rooms[code];

      if (!room) {
        sendJson(res, 404, { ok: false, message: "房间不存在" });
        return;
      }

      if (room.whiteToken) {
        sendJson(res, 409, { ok: false, message: "房间已满" });
        return;
      }

      room.whiteToken = createToken();
      room.updatedAt = Date.now();

      sendJson(res, 200, {
        ok: true,
        code,
        player: WHITE,
        token: room.whiteToken
      });
      return;
    }

    if (pathname === "/api/room" && req.method === "GET") {
      const code = String(parsedUrl.query.code || "");
      const token = String(parsedUrl.query.token || "");
      const room = rooms[code];

      if (!room) {
        sendJson(res, 404, { ok: false, message: "房间不存在" });
        return;
      }

      const player = getPlayerByToken(room, token);
      if (!player) {
        sendJson(res, 403, { ok: false, message: "身份无效" });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        code: room.code,
        board: room.board,
        currentPlayer: room.currentPlayer,
        gameOver: room.gameOver,
        winner: room.winner,
        winLine: room.winLine,
        joined: !!room.whiteToken,
        yourPlayer: player,
        updatedAt: room.updatedAt
      });
      return;
    }

    if (pathname === "/api/move" && req.method === "POST") {
      const body = await readJsonBody(req);
      const code = String(body?.code || "");
      const token = String(body?.token || "");
      const row = Number(body?.row);
      const col = Number(body?.col);
      const room = rooms[code];

      if (!room) {
        sendJson(res, 404, { ok: false, message: "房间不存在" });
        return;
      }

      const player = getPlayerByToken(room, token);
      if (!player) {
        sendJson(res, 403, { ok: false, message: "身份无效" });
        return;
      }

      if (room.gameOver) {
        sendJson(res, 409, { ok: false, message: "游戏已结束" });
        return;
      }

      if (room.currentPlayer !== player) {
        sendJson(res, 409, { ok: false, message: "还没轮到你" });
        return;
      }

      if (!isValidMove(room.board, row, col)) {
        sendJson(res, 400, { ok: false, message: "无效落子" });
        return;
      }

      room.board[row][col] = player;
      room.updatedAt = Date.now();

      if (checkWin(room.board, row, col, player)) {
        room.gameOver = true;
        room.winner = player;
        room.winLine = getWinLine(room.board, row, col, player);
      } else if (isFull(room.board)) {
        room.gameOver = true;
        room.winner = "draw";
        room.winLine = null;
      } else {
        room.currentPlayer = player === BLACK ? WHITE : BLACK;
      }

      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/restart" && req.method === "POST") {
      const body = await readJsonBody(req);
      const code = String(body?.code || "");
      const token = String(body?.token || "");
      const room = rooms[code];

      if (!room) {
        sendJson(res, 404, { ok: false, message: "房间不存在" });
        return;
      }

      if (!getPlayerByToken(room, token)) {
        sendJson(res, 403, { ok: false, message: "身份无效" });
        return;
      }

      room.board = emptyBoard();
      room.currentPlayer = BLACK;
      room.gameOver = false;
      room.winner = null;
      room.winLine = null;
      room.updatedAt = Date.now();

      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/leave" && req.method === "POST") {
      const body = await readJsonBody(req);
      const code = String(body?.code || "");
      const token = String(body?.token || "");
      const room = rooms[code];

      if (!room) {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (!getPlayerByToken(room, token)) {
        sendJson(res, 403, { ok: false, message: "身份无效" });
        return;
      }

      delete rooms[code];
      sendJson(res, 200, { ok: true });
      return;
    }

    serveStatic(pathname, res);
  } catch (error) {
    console.error("Server error:", error);
    sendJson(res, 500, {
      ok: false,
      message: error && error.message ? error.message : "服务器错误"
    });
  }
});

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(__dirname, "public", safePath));
  const publicRoot = path.normalize(path.join(__dirname, "public"));

  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    };

    if (filePath.endsWith("sw.js")) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    }

    res.writeHead(200, headers);
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("请求数据格式错误"));
      }
    });
    req.on("error", reject);
  });
}

function generateCode() {
  let code = "";
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms[code]);
  return code;
}

function createToken() {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

function getPlayerByToken(room, token) {
  if (token && token === room.blackToken) {
    return BLACK;
  }
  if (token && token === room.whiteToken) {
    return WHITE;
  }
  return null;
}

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function isValidMove(board, row, col) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row][col] === null
  );
}

function isFull(board) {
  return board.every((line) => line.every((cell) => cell !== null));
}

function checkWin(board, row, col, player) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return dirs.some(([dx, dy]) => countLine(board, row, col, player, dx, dy).length >= 5);
}

function getWinLine(board, row, col, player) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dx, dy] of dirs) {
    const line = countLine(board, row, col, player, dx, dy);
    if (line.length >= 5) {
      return line;
    }
  }
  return [[row, col]];
}

function countLine(board, row, col, player, dx, dy) {
  const cells = [[row, col]];

  for (let step = 1; step < 5; step++) {
    const r = row + dx * step;
    const c = col + dy * step;
    if (!sameStone(board, r, c, player)) {
      break;
    }
    cells.push([r, c]);
  }

  for (let step = 1; step < 5; step++) {
    const r = row - dx * step;
    const c = col - dy * step;
    if (!sameStone(board, r, c, player)) {
      break;
    }
    cells.unshift([r, c]);
  }

  return cells;
}

function sameStone(board, row, col, player) {
  return (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row][col] === player
  );
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log(" Gomoku Local Server");
  console.log("================================");
  console.log(" Server: http://localhost:" + PORT);
  console.log(" Health: http://localhost:" + PORT + "/health");
  console.log("================================");
});
