import { DurableObject } from "cloudflare:workers";

const BOARD_SIZE = 19;
const BLACK = "black";
const WHITE = "white";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        name: "gomoku-online",
        status: "ok",
        transport: "http-polling"
      });
    }

    const id = env.GOMOKU_LOBBY.idFromName("global");
    const stub = env.GOMOKU_LOBBY.get(id);
    return stub.fetch(request);
  }
};

export class GomokuLobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.ready = this.loadState();
  }

  async loadState() {
    this.rooms = (await this.ctx.storage.get("rooms")) || {};
  }

  async saveState() {
    await this.ctx.storage.put("rooms", this.rooms);
  }

  async fetch(request) {
    await this.ready;

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    try {
      if (method === "POST" && path === "/api/create-room") {
        return withCors(await this.createRoom());
      }
      if (method === "POST" && path === "/api/join-room") {
        const body = await request.json();
        return withCors(await this.joinRoom(body));
      }
      if (method === "POST" && path === "/api/move") {
        const body = await request.json();
        return withCors(await this.makeMove(body));
      }
      if (method === "POST" && path === "/api/restart") {
        const body = await request.json();
        return withCors(await this.restartRoom(body));
      }
      if (method === "POST" && path === "/api/leave") {
        const body = await request.json();
        return withCors(await this.leaveRoom(body));
      }
      if (method === "GET" && path === "/api/room") {
        return withCors(await this.getRoom(url.searchParams));
      }
    } catch (error) {
      return withCors(json({ ok: false, message: error.message || "服务器错误" }, 500));
    }

    return withCors(json({ ok: false, message: "Not found" }, 404));
  }

  async createRoom() {
    const code = this.generateCode();
    this.rooms[code] = {
      code,
      blackToken: crypto.randomUUID(),
      whiteToken: null,
      board: emptyBoard(),
      currentPlayer: BLACK,
      gameOver: false,
      winner: null,
      winLine: null,
      updatedAt: Date.now()
    };
    await this.saveState();

    return json({
      ok: true,
      code,
      player: BLACK,
      token: this.rooms[code].blackToken
    });
  }

  async joinRoom(body) {
    const code = String(body?.code || "");
    const room = this.rooms[code];
    if (!room) {
      return json({ ok: false, message: "房间不存在" }, 404);
    }
    if (room.whiteToken) {
      return json({ ok: false, message: "房间已满" }, 409);
    }

    room.whiteToken = crypto.randomUUID();
    room.updatedAt = Date.now();
    await this.saveState();

    return json({
      ok: true,
      code,
      player: WHITE,
      token: room.whiteToken
    });
  }

  async getRoom(searchParams) {
    const code = String(searchParams.get("code") || "");
    const token = String(searchParams.get("token") || "");
    const room = this.rooms[code];

    if (!room) {
      return json({ ok: false, message: "房间不存在" }, 404);
    }

    const player = getPlayerByToken(room, token);
    if (!player) {
      return json({ ok: false, message: "身份无效" }, 403);
    }

    return json({
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
  }

  async makeMove(body) {
    const code = String(body?.code || "");
    const token = String(body?.token || "");
    const row = Number(body?.row);
    const col = Number(body?.col);
    const room = this.rooms[code];

    if (!room) {
      return json({ ok: false, message: "房间不存在" }, 404);
    }

    const player = getPlayerByToken(room, token);
    if (!player) {
      return json({ ok: false, message: "身份无效" }, 403);
    }
    if (room.gameOver) {
      return json({ ok: false, message: "游戏已结束" }, 409);
    }
    if (room.currentPlayer !== player) {
      return json({ ok: false, message: "还没轮到你" }, 409);
    }
    if (!isValidMove(room.board, row, col)) {
      return json({ ok: false, message: "无效落子" }, 400);
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

    await this.saveState();
    return json({ ok: true });
  }

  async restartRoom(body) {
    const code = String(body?.code || "");
    const token = String(body?.token || "");
    const room = this.rooms[code];

    if (!room) {
      return json({ ok: false, message: "房间不存在" }, 404);
    }
    if (!getPlayerByToken(room, token)) {
      return json({ ok: false, message: "身份无效" }, 403);
    }

    room.board = emptyBoard();
    room.currentPlayer = BLACK;
    room.gameOver = false;
    room.winner = null;
    room.winLine = null;
    room.updatedAt = Date.now();
    await this.saveState();

    return json({ ok: true });
  }

  async leaveRoom(body) {
    const code = String(body?.code || "");
    const token = String(body?.token || "");
    const room = this.rooms[code];

    if (!room) {
      return json({ ok: true });
    }
    if (!getPlayerByToken(room, token)) {
      return json({ ok: false, message: "身份无效" }, 403);
    }

    delete this.rooms[code];
    await this.saveState();
    return json({ ok: true });
  }

  generateCode() {
    let code = "";
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
    } while (this.rooms[code]);
    return code;
  }
}

function getPlayerByToken(room, token) {
  if (token && token === room.blackToken) return BLACK;
  if (token && token === room.whiteToken) return WHITE;
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
    if (line.length >= 5) return line;
  }
  return [[row, col]];
}

function countLine(board, row, col, player, dx, dy) {
  const cells = [[row, col]];

  for (let step = 1; step < 5; step++) {
    const r = row + dx * step;
    const c = col + dy * step;
    if (!sameStone(board, r, c, player)) break;
    cells.push([r, c]);
  }

  for (let step = 1; step < 5; step++) {
    const r = row - dx * step;
    const c = col - dy * step;
    if (!sameStone(board, r, c, player)) break;
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

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
