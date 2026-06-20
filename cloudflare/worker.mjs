import { DurableObject } from "cloudflare:workers";

const BOARD_SIZE = 19;
const BLACK = "black";
const WHITE = "white";
const decoder = new TextDecoder();

export default {
  async fetch(request, env) {
    if (request.headers.get("Upgrade") === "websocket") {
      const id = env.GOMOKU_LOBBY.idFromName("global");
      const stub = env.GOMOKU_LOBBY.get(id);
      return stub.fetch(request);
    }

    return new Response(JSON.stringify({
      name: "gomoku-online",
      status: "ok",
      transport: "durable-objects",
      websocket: true
    }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};

export class GomokuLobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.socketMeta = new Map();
    this.socketById = new Map();
    this.rooms = new Map();
    this.ready = this.restoreState();
  }

  async restoreState() {
    const storedRooms = await this.ctx.storage.get("rooms");
    if (storedRooms && typeof storedRooms === "object") {
      for (const [code, room] of Object.entries(storedRooms)) {
        this.rooms.set(code, room);
      }
    }

    for (const ws of this.ctx.getWebSockets()) {
      const meta = ws.deserializeAttachment() || this.createMeta();
      if (!meta.socketId) {
        meta.socketId = crypto.randomUUID();
        ws.serializeAttachment(meta);
      }
      this.socketMeta.set(ws, meta);
      this.socketById.set(meta.socketId, ws);
    }

    this.pruneRooms();
    await this.persistRooms();
  }

  createMeta() {
    return {
      socketId: crypto.randomUUID(),
      roomCode: null,
      player: null
    };
  }

  pruneRooms() {
    const liveIds = new Set(this.socketById.keys());

    for (const [code, room] of this.rooms.entries()) {
      if (room.black && !liveIds.has(room.black)) {
        room.black = null;
      }
      if (room.white && !liveIds.has(room.white)) {
        room.white = null;
      }
      if (!room.black && !room.white) {
        this.rooms.delete(code);
      }
    }
  }

  async persistRooms() {
    const snapshot = {};
    for (const [code, room] of this.rooms.entries()) {
      snapshot[code] = room;
    }
    await this.ctx.storage.put("rooms", snapshot);
  }

  async fetch(request) {
    await this.ready;

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const meta = this.createMeta();

    server.serializeAttachment(meta);
    this.ctx.acceptWebSocket(server);
    this.socketMeta.set(server, meta);
    this.socketById.set(meta.socketId, server);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async webSocketMessage(ws, message) {
    await this.ready;

    let parsed;
    try {
      const text = typeof message === "string" ? message : decoder.decode(message);
      parsed = JSON.parse(text);
    } catch (error) {
      this.send(ws, { type: "error", message: "无效消息" });
      return;
    }

    await this.handleMessage(ws, parsed);
  }

  async webSocketClose(ws, code, reason) {
    await this.ready;
    await this.handleDisconnect(ws, "opponent_disconnected");
    ws.close(code, reason);
  }

  async webSocketError(ws) {
    await this.ready;
    await this.handleDisconnect(ws, "opponent_disconnected");
  }

  async handleMessage(ws, message) {
    const meta = this.getMeta(ws);
    if (!meta) {
      this.send(ws, { type: "error", message: "连接状态异常" });
      return;
    }

    switch (message.type) {
      case "create_room":
        await this.createRoom(ws, meta);
        return;

      case "join_room":
        await this.joinRoom(ws, meta, String(message.code || ""));
        return;

      case "make_move":
        await this.makeMove(ws, meta, message);
        return;

      case "restart":
        await this.restartRoom(meta);
        return;

      case "leave_room":
        await this.leaveRoom(meta, "opponent_left");
        return;

      default:
        this.send(ws, { type: "error", message: "未知操作" });
    }
  }

  async createRoom(ws, meta) {
    if (meta.roomCode) {
      await this.leaveRoom(meta, "opponent_left");
    }

    const code = this.generateCode();
    const room = {
      code,
      black: meta.socketId,
      white: null,
      board: emptyBoard(),
      currentPlayer: BLACK,
      gameOver: false
    };

    meta.roomCode = code;
    meta.player = BLACK;
    this.saveMeta(ws, meta);
    this.rooms.set(code, room);
    await this.persistRooms();

    this.send(ws, { type: "room_created", code, player: BLACK });
  }

  async joinRoom(ws, meta, code) {
    const room = this.rooms.get(code);
    if (!room) {
      this.send(ws, { type: "error", message: "房间不存在" });
      return;
    }

    if (room.white || !room.black) {
      this.send(ws, { type: "error", message: "房间已满" });
      return;
    }

    if (meta.roomCode) {
      await this.leaveRoom(meta, "opponent_left");
    }

    room.white = meta.socketId;
    meta.roomCode = code;
    meta.player = WHITE;
    this.saveMeta(ws, meta);
    await this.persistRooms();

    this.send(ws, { type: "room_joined", code, player: WHITE });
    this.sendToSocketId(room.black, { type: "opponent_joined" });
    this.broadcastRoom(room, {
      type: "board_state",
      board: room.board,
      currentPlayer: room.currentPlayer
    });
  }

  async makeMove(ws, meta, message) {
    const room = this.rooms.get(meta.roomCode);
    if (!room) {
      this.send(ws, { type: "error", message: "房间不存在" });
      return;
    }

    if (room.gameOver) {
      this.send(ws, { type: "error", message: "游戏已结束" });
      return;
    }

    if (room.currentPlayer !== meta.player) {
      this.send(ws, { type: "error", message: "还没轮到你" });
      return;
    }

    const row = Number(message.row);
    const col = Number(message.col);

    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= BOARD_SIZE ||
      col < 0 ||
      col >= BOARD_SIZE ||
      room.board[row][col] !== null
    ) {
      this.send(ws, { type: "error", message: "无效落子" });
      return;
    }

    room.board[row][col] = meta.player;

    if (checkWin(room.board, row, col, meta.player)) {
      room.gameOver = true;
      await this.persistRooms();
      this.broadcastRoom(room, {
        type: "game_over",
        winner: meta.player,
        player: meta.player,
        row,
        col,
        winLine: getWinLine(room.board, row, col, meta.player)
      });
      return;
    }

    if (isFull(room.board)) {
      room.gameOver = true;
      await this.persistRooms();
      this.broadcastRoom(room, {
        type: "game_over",
        winner: "draw",
        player: meta.player,
        row,
        col
      });
      return;
    }

    room.currentPlayer = meta.player === BLACK ? WHITE : BLACK;
    await this.persistRooms();
    this.broadcastRoom(room, {
      type: "move_made",
      row,
      col,
      player: meta.player,
      currentPlayer: room.currentPlayer
    });
  }

  async restartRoom(meta) {
    const room = this.rooms.get(meta.roomCode);
    if (!room) {
      return;
    }

    room.board = emptyBoard();
    room.currentPlayer = BLACK;
    room.gameOver = false;
    await this.persistRooms();
    this.broadcastRoom(room, { type: "restarted" });
  }

  async leaveRoom(meta, notifyType) {
    const room = this.rooms.get(meta.roomCode);
    const ws = this.socketById.get(meta.socketId);

    if (!room) {
      if (ws) {
        meta.roomCode = null;
        meta.player = null;
        this.saveMeta(ws, meta);
      }
      return;
    }

    const opponentId = meta.player === BLACK ? room.white : room.black;
    if (opponentId) {
      this.sendToSocketId(opponentId, { type: notifyType });
      const opponentWs = this.socketById.get(opponentId);
      const opponentMeta = opponentWs ? this.getMeta(opponentWs) : null;
      if (opponentWs && opponentMeta) {
        opponentMeta.roomCode = null;
        opponentMeta.player = null;
        this.saveMeta(opponentWs, opponentMeta);
      }
    }

    this.rooms.delete(room.code);
    await this.persistRooms();

    if (ws) {
      meta.roomCode = null;
      meta.player = null;
      this.saveMeta(ws, meta);
    }
  }

  async handleDisconnect(ws, notifyType) {
    const meta = this.getMeta(ws);
    if (meta && meta.roomCode) {
      await this.leaveRoom(meta, notifyType);
    }

    if (meta) {
      this.socketById.delete(meta.socketId);
    }
    this.socketMeta.delete(ws);
    this.pruneRooms();
    await this.persistRooms();
  }

  getMeta(ws) {
    return this.socketMeta.get(ws) || ws.deserializeAttachment() || null;
  }

  saveMeta(ws, meta) {
    ws.serializeAttachment(meta);
    this.socketMeta.set(ws, meta);
    this.socketById.set(meta.socketId, ws);
  }

  generateCode() {
    let code = "";
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
    } while (this.rooms.has(code));
    return code;
  }

  broadcastRoom(room, payload) {
    if (room.black) {
      this.sendToSocketId(room.black, payload);
    }
    if (room.white) {
      this.sendToSocketId(room.white, payload);
    }
  }

  sendToSocketId(socketId, payload) {
    if (!socketId) {
      return;
    }
    const ws = this.socketById.get(socketId);
    if (!ws) {
      return;
    }
    this.send(ws, payload);
  }

  send(ws, payload) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (error) {
      // Ignore failed sends to closing sockets.
    }
  }
}

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function isFull(board) {
  return board.every((row) => row.every((cell) => cell !== null));
}

function checkWin(board, row, col, player) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

  for (const [dx, dy] of directions) {
    let count = 1;

    for (let step = 1; step < 5; step++) {
      const nextRow = row + dx * step;
      const nextCol = col + dy * step;
      if (
        nextRow < 0 ||
        nextRow >= BOARD_SIZE ||
        nextCol < 0 ||
        nextCol >= BOARD_SIZE ||
        board[nextRow][nextCol] !== player
      ) {
        break;
      }
      count += 1;
    }

    for (let step = 1; step < 5; step++) {
      const nextRow = row - dx * step;
      const nextCol = col - dy * step;
      if (
        nextRow < 0 ||
        nextRow >= BOARD_SIZE ||
        nextCol < 0 ||
        nextCol >= BOARD_SIZE ||
        board[nextRow][nextCol] !== player
      ) {
        break;
      }
      count += 1;
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

function getWinLine(board, row, col, player) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

  for (const [dx, dy] of directions) {
    const cells = [[row, col]];

    for (let step = 1; step < 5; step++) {
      const nextRow = row + dx * step;
      const nextCol = col + dy * step;
      if (
        nextRow < 0 ||
        nextRow >= BOARD_SIZE ||
        nextCol < 0 ||
        nextCol >= BOARD_SIZE ||
        board[nextRow][nextCol] !== player
      ) {
        break;
      }
      cells.push([nextRow, nextCol]);
    }

    for (let step = 1; step < 5; step++) {
      const nextRow = row - dx * step;
      const nextCol = col - dy * step;
      if (
        nextRow < 0 ||
        nextRow >= BOARD_SIZE ||
        nextCol < 0 ||
        nextCol >= BOARD_SIZE ||
        board[nextRow][nextCol] !== player
      ) {
        break;
      }
      cells.push([nextRow, nextCol]);
    }

    if (cells.length >= 5) {
      return cells;
    }
  }

  return [[row, col]];
}
