const BOARD_SIZE = 19;
const EMPTY = null;
const BLACK = "black";
const WHITE = "white";
const AXIS_LABELS = "ABCDEFGHJKLMNOPQRST".split("");

const state = {
  screen: "menu",
  mode: null,
  board: [],
  currentPlayer: BLACK,
  gameOver: false,
  lastMove: null,
  winLine: null,
  moveHistory: [],
  pendingMove: null,
  ws: null,
  roomCode: null,
  myColor: null,
  isMyTurn: false,
  connected: false,
  wakeLock: null,
  blockBoardUntil: 0
};

const ui = {};

let ctx;
let canvasSize = 0;
let gridStart = 0;
let cellSize = 0;
let stoneRadius = 0;
let coordPad = 0;
let lastTapAt = 0;

function initBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function setup() {
  cacheDom();
  bindEvents();
  state.board = initBoard();
  showScreen("menu");
  updateServerInput();
  updateUI();
  unregisterServiceWorkers();
}

function cacheDom() {
  ui.canvas = document.getElementById("board-canvas");
  ui.ctx = ui.canvas.getContext("2d");
  ctx = ui.ctx;

  ui.screens = {
    menu: document.getElementById("menu-screen"),
    online: document.getElementById("online-screen"),
    waiting: document.getElementById("waiting-screen"),
    game: document.getElementById("game-screen")
  };

  ui.localBtn = document.getElementById("local-btn");
  ui.onlineBtn = document.getElementById("online-btn");
  ui.serverUrl = document.getElementById("server-url");
  ui.roomCodeInput = document.getElementById("room-code-input");
  ui.createRoomBtn = document.getElementById("create-room-btn");
  ui.joinRoomBtn = document.getElementById("join-room-btn");
  ui.onlineBackBtn = document.getElementById("online-back-btn");
  ui.waitingCancelBtn = document.getElementById("waiting-cancel-btn");
  ui.roomCodeDisplay = document.getElementById("room-code-display");
  ui.gameModeLabel = document.getElementById("game-mode-label");
  ui.roomCodeBadge = document.getElementById("room-code-badge");
  ui.connStatus = document.getElementById("conn-status");
  ui.turnStone = document.getElementById("turn-stone");
  ui.turnText = document.getElementById("turn-text");
  ui.menuBtn = document.getElementById("menu-btn");
  ui.gameMenu = document.getElementById("game-menu");
  ui.undoBtn = document.getElementById("undo-btn");
  ui.restartBtn = document.getElementById("restart-btn");
  ui.quitBtn = document.getElementById("quit-btn");
  ui.overlay = document.getElementById("game-over-overlay");
  ui.resultTitle = document.getElementById("result-title");
  ui.resultSubtitle = document.getElementById("result-subtitle");
  ui.overlayRestartBtn = document.getElementById("overlay-restart-btn");
  ui.overlayMenuBtn = document.getElementById("overlay-menu-btn");
}

function bindEvents() {
  bindTap(ui.localBtn, startLocalGame);
  bindTap(ui.onlineBtn, showOnlineMenu);
  bindTap(ui.createRoomBtn, createRoom);
  bindTap(ui.joinRoomBtn, joinRoom);
  bindTap(ui.onlineBackBtn, showMenu);
  bindTap(ui.waitingCancelBtn, leaveOnlineFlow);
  bindTap(ui.menuBtn, toggleGameMenu);
  bindTap(ui.undoBtn, () => {
    hideGameMenu();
    undoMove();
  });
  bindTap(ui.restartBtn, () => {
    hideGameMenu();
    restartGame();
  });
  bindTap(ui.quitBtn, () => {
    hideGameMenu();
    confirmLeave();
  });
  bindTap(ui.overlayRestartBtn, restartGame);
  bindTap(ui.overlayMenuBtn, confirmLeave);

  ui.roomCodeInput.addEventListener("input", () => {
    ui.roomCodeInput.value = ui.roomCodeInput.value.replace(/\D/g, "").slice(0, 4);
  });

  ui.canvas.addEventListener("pointerup", handleBoardPointer);
  window.addEventListener("resize", () => {
    if (state.screen === "game") {
      resizeCanvas();
    }
  });

  document.addEventListener("click", (event) => {
    if (!ui.gameMenu.classList.contains("show")) {
      return;
    }
    if (ui.gameMenu.contains(event.target) || ui.menuBtn.contains(event.target)) {
      return;
    }
    hideGameMenu();
  });
}

function bindTap(element, handler) {
  if (!element) {
    return;
  }

  element.addEventListener("click", (event) => {
    const now = Date.now();
    if (now - lastTapAt < 350) {
      return;
    }
    lastTapAt = now;
    handler(event);
  });

  element.addEventListener("touchend", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - lastTapAt < 350) {
      return;
    }
    lastTapAt = now;
    handler(event);
  }, { passive: false });

  element.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now - lastTapAt < 350) {
        return;
      }
      lastTapAt = now;
      handler(event);
    }
  });
}

function showScreen(name) {
  state.screen = name;
  Object.entries(ui.screens).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });
  hideGameMenu();
  if (name === "game") {
    requestAnimationFrame(() => requestAnimationFrame(resizeCanvas));
  }
}

function showMenu() {
  closeOverlay();
  state.pendingMove = null;
  showScreen("menu");
}

function showOnlineMenu() {
  closeOverlay();
  ui.roomCodeInput.value = "";
  updateServerInput();
  showScreen("online");
}

function updateServerInput() {
  const saved = localStorage.getItem("gomoku_server_url") || "";
  const suggested = getDefaultServerUrl();
  ui.serverUrl.value = saved || suggested;
}

function startLocalGame() {
  closeSocket(false);
  state.mode = "local";
  resetGameState();
  state.connected = false;
  state.blockBoardUntil = Date.now() + 450;
  showScreen("game");
  updateUI();
  requestWakeLock();
}

function resetGameState() {
  state.board = initBoard();
  state.currentPlayer = BLACK;
  state.gameOver = false;
  state.lastMove = null;
  state.winLine = null;
  state.moveHistory = [];
  state.pendingMove = null;
  closeOverlay();
}

function updateUI() {
  ui.undoBtn.style.display = state.mode === "local" ? "block" : "none";

  if (state.mode === "online") {
    ui.gameModeLabel.textContent = "联机";
    ui.roomCodeBadge.classList.remove("hidden");
    ui.roomCodeBadge.textContent = "房间 " + (state.roomCode || "----");
    ui.connStatus.classList.remove("hidden");
    ui.connStatus.textContent = state.connected ? "已连接" : "未连接";
    ui.connStatus.classList.toggle("conn-ok", state.connected);
    ui.connStatus.classList.toggle("conn-bad", !state.connected);
  } else {
    ui.gameModeLabel.textContent = "本地";
    ui.roomCodeBadge.classList.add("hidden");
    ui.connStatus.classList.add("hidden");
  }

  const playerText = state.currentPlayer === BLACK ? "黑棋" : "白棋";
  ui.turnStone.className = "stone-dot " + state.currentPlayer;

  if (state.gameOver) {
    ui.turnText.textContent = "对局结束";
    return;
  }

  if (state.mode === "online") {
    ui.turnText.textContent = state.isMyTurn
      ? playerText + "回合，点击两次确认落子"
      : "等待对手落子";
  } else if (state.pendingMove) {
    ui.turnText.textContent = playerText + "预落子，点同一格确认";
  } else {
    ui.turnText.textContent = playerText + "回合";
  }
}

function resizeCanvas() {
  const parent = ui.canvas.parentElement.getBoundingClientRect();
  const size = Math.max(120, Math.floor(Math.min(parent.width, parent.height)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  ui.canvas.style.width = size + "px";
  ui.canvas.style.height = size + "px";
  ui.canvas.width = Math.floor(size * dpr);
  ui.canvas.height = Math.floor(size * dpr);

  canvasSize = size;
  coordPad = Math.max(16, size * 0.045);
  cellSize = (size - 2 * (coordPad + 2)) / (BOARD_SIZE - 1 + 0.84);
  stoneRadius = cellSize * 0.42;
  gridStart = coordPad + stoneRadius + 2;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderBoard();
}

function boardToPixel(row, col) {
  return {
    x: gridStart + col * cellSize,
    y: gridStart + row * cellSize
  };
}

function pixelToBoard(x, y) {
  const col = Math.round((x - gridStart) / cellSize);
  const row = Math.round((y - gridStart) / cellSize);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }
  const point = boardToPixel(row, col);
  if (Math.hypot(x - point.x, y - point.y) > cellSize * 0.48) {
    return null;
  }
  return { row, col };
}

function renderBoard() {
  if (!ctx || !canvasSize) {
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
  gradient.addColorStop(0, "#efcda4");
  gradient.addColorStop(0.45, "#e2b988");
  gradient.addColorStop(1, "#c78f68");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  drawWoodLines();
  drawCoordinates();
  drawGrid();
  drawStars();
  drawStones();
  drawLastMove();
  drawPendingMove();
  drawWinLine();
}

function drawWoodLines() {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#513726";
  for (let i = 0; i < 10; i++) {
    const y = (canvasSize / 10) * i + Math.sin(i * 0.6) * 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvasSize; x += 8) {
      ctx.lineTo(x, y + Math.sin((x + i * 17) * 0.025) * 2.2);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoordinates() {
  ctx.save();
  ctx.fillStyle = "#7f5a43";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < BOARD_SIZE; i++) {
    const pointTop = boardToPixel(0, i);
    const pointLeft = boardToPixel(i, 0);
    ctx.fillText(AXIS_LABELS[i], pointTop.x, coordPad * 0.6);
    ctx.fillText(String(i + 1), coordPad * 0.55, pointLeft.y);
  }

  ctx.restore();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "#8b664f";
  ctx.lineWidth = 1;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const startH = boardToPixel(i, 0);
    const endH = boardToPixel(i, BOARD_SIZE - 1);
    ctx.beginPath();
    ctx.moveTo(startH.x, startH.y);
    ctx.lineTo(endH.x, endH.y);
    ctx.stroke();

    const startV = boardToPixel(0, i);
    const endV = boardToPixel(BOARD_SIZE - 1, i);
    ctx.beginPath();
    ctx.moveTo(startV.x, startV.y);
    ctx.lineTo(endV.x, endV.y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#704f3d";
  ctx.lineWidth = 2;
  const topLeft = boardToPixel(0, 0);
  const bottomRight = boardToPixel(BOARD_SIZE - 1, BOARD_SIZE - 1);
  ctx.strokeRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y
  );
  ctx.restore();
}

function drawStars() {
  const stars = [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15]
  ];
  ctx.save();
  ctx.fillStyle = "#6b4935";
  stars.forEach(([row, col]) => {
    const point = boardToPixel(row, col);
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2.4, cellSize * 0.12), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawStones() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (state.board[row][col] !== EMPTY) {
        drawStone(row, col, state.board[row][col], 1);
      }
    }
  }
}

function drawStone(row, col, color, alpha) {
  const point = boardToPixel(row, col);
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.arc(point.x + 1.4, point.y + 1.8, stoneRadius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fill();

  const gradient = ctx.createRadialGradient(
    point.x - stoneRadius * 0.25,
    point.y - stoneRadius * 0.3,
    stoneRadius * 0.2,
    point.x,
    point.y,
    stoneRadius
  );

  if (color === BLACK) {
    gradient.addColorStop(0, "#a0897d");
    gradient.addColorStop(0.45, "#6c5447");
    gradient.addColorStop(1, "#3d2f28");
  } else {
    gradient.addColorStop(0, "#fffef8");
    gradient.addColorStop(0.45, "#fff0c8");
    gradient.addColorStop(1, "#f0d071");
  }

  ctx.beginPath();
  ctx.arc(point.x, point.y, stoneRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = color === BLACK ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.08)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(point.x - stoneRadius * 0.2, point.y - stoneRadius * 0.25, stoneRadius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = color === BLACK ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.62)";
  ctx.fill();

  ctx.restore();
}

function drawLastMove() {
  if (!state.lastMove) {
    return;
  }
  const point = boardToPixel(state.lastMove.row, state.lastMove.col);
  ctx.save();
  ctx.fillStyle = "#ff7b71";
  ctx.beginPath();
  ctx.arc(point.x, point.y, Math.max(3, stoneRadius * 0.18), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPendingMove() {
  if (!state.pendingMove || state.gameOver) {
    return;
  }
  drawStone(state.pendingMove.row, state.pendingMove.col, state.currentPlayer, 0.42);
}

function drawWinLine() {
  if (!state.gameOver || !state.winLine || state.winLine.length === 0) {
    return;
  }
  ctx.save();
  ctx.strokeStyle = "rgba(255, 106, 96, 0.75)";
  ctx.lineWidth = Math.max(2, cellSize * 0.14);
  state.winLine.forEach(([row, col]) => {
    const point = boardToPixel(row, col);
    ctx.beginPath();
    ctx.arc(point.x, point.y, stoneRadius + 3, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

function getEventPoint(event) {
  const rect = ui.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvasSize,
    y: ((event.clientY - rect.top) / rect.height) * canvasSize
  };
}

function handleBoardPointer(event) {
  event.preventDefault();

  if (state.screen !== "game" || state.gameOver) {
    return;
  }

  if (Date.now() < state.blockBoardUntil) {
    return;
  }

  if (state.mode === "online") {
    if (!state.connected) {
      showToast("尚未连接到服务器");
      return;
    }
    if (!state.isMyTurn) {
      showToast("还没轮到你");
      return;
    }
  }

  const point = getEventPoint(event);
  const cell = pixelToBoard(point.x, point.y);

  if (!cell || state.board[cell.row][cell.col] !== EMPTY) {
    return;
  }

  if (state.pendingMove &&
      state.pendingMove.row === cell.row &&
      state.pendingMove.col === cell.col) {
    confirmPlacement(cell.row, cell.col);
    return;
  }

  state.pendingMove = cell;
  updateUI();
  renderBoard();
}

function confirmPlacement(row, col) {
  state.pendingMove = null;

  if (state.mode === "online") {
    sendMessage({ type: "make_move", row, col });
    pulseFeedback();
    updateUI();
    renderBoard();
    return;
  }

  state.board[row][col] = state.currentPlayer;
  state.lastMove = { row, col };
  state.moveHistory.push({ row, col, player: state.currentPlayer });

  const player = state.currentPlayer;
  if (checkWin(row, col, player)) {
    state.gameOver = true;
    state.winLine = getWinLine(row, col, player);
    renderBoard();
    showGameOver(player);
    return;
  }

  if (isBoardFull()) {
    state.gameOver = true;
    renderBoard();
    showGameOver(null);
    return;
  }

  state.currentPlayer = state.currentPlayer === BLACK ? WHITE : BLACK;
  pulseFeedback();
  updateUI();
  renderBoard();
}

function pulseFeedback() {
  if (navigator.vibrate) {
    navigator.vibrate(12);
  }
}

function checkWin(row, col, player) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return directions.some(([dx, dy]) => countLine(row, col, dx, dy, player) >= 5);
}

function countLine(row, col, dx, dy, player) {
  let count = 1;
  count += walk(row, col, dx, dy, player).length;
  count += walk(row, col, -dx, -dy, player).length;
  return count;
}

function getWinLine(row, col, player) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dx, dy] of directions) {
    const cells = [
      ...walk(row, col, -dx, -dy, player).reverse(),
      [row, col],
      ...walk(row, col, dx, dy, player)
    ];
    if (cells.length >= 5) {
      return cells;
    }
  }
  return [[row, col]];
}

function walk(row, col, dx, dy, player) {
  const cells = [];
  for (let step = 1; step < 5; step++) {
    const nextRow = row + dx * step;
    const nextCol = col + dy * step;
    if (
      nextRow < 0 ||
      nextRow >= BOARD_SIZE ||
      nextCol < 0 ||
      nextCol >= BOARD_SIZE ||
      state.board[nextRow][nextCol] !== player
    ) {
      break;
    }
    cells.push([nextRow, nextCol]);
  }
  return cells;
}

function isBoardFull() {
  return state.board.every((row) => row.every((cell) => cell !== EMPTY));
}

function showGameOver(winner) {
  state.gameOver = true;
  updateUI();

  if (winner === null || winner === "draw") {
    ui.resultTitle.textContent = "平局";
    ui.resultSubtitle.textContent = "棋盘已满，再来一局吧";
  } else if (state.mode === "online") {
    const won = winner === state.myColor;
    ui.resultTitle.textContent = won ? "你赢了" : "你输了";
    ui.resultSubtitle.textContent = won ? "这步棋很漂亮" : "下一局继续";
  } else {
    ui.resultTitle.textContent = winner === BLACK ? "黑棋获胜" : "白棋获胜";
    ui.resultSubtitle.textContent = "五子连珠，精彩";
  }

  ui.overlay.classList.add("show");
}

function closeOverlay() {
  ui.overlay.classList.remove("show");
}

function toggleGameMenu() {
  ui.gameMenu.classList.toggle("show");
}

function hideGameMenu() {
  ui.gameMenu.classList.remove("show");
}

function undoMove() {
  if (state.mode !== "local" || state.gameOver) {
    return;
  }

  if (state.moveHistory.length === 0) {
    showToast("没有可悔的棋");
    return;
  }

  const last = state.moveHistory.pop();
  state.board[last.row][last.col] = EMPTY;
  state.currentPlayer = last.player;
  state.lastMove = state.moveHistory.length
    ? state.moveHistory[state.moveHistory.length - 1]
    : null;
  state.pendingMove = null;
  state.winLine = null;
  updateUI();
  renderBoard();
}

function restartGame() {
  closeOverlay();
  state.pendingMove = null;
  if (state.mode === "online") {
    sendMessage({ type: "restart" });
    return;
  }
  resetGameState();
  updateUI();
  renderBoard();
}

function confirmLeave() {
  releaseWakeLock();
  leaveOnlineFlow();
}

function leaveOnlineFlow() {
  if (state.mode === "online" && state.connected) {
    sendMessage({ type: "leave_room" });
  }
  closeSocket(false);
  state.connected = false;
  state.mode = null;
  state.roomCode = null;
  state.myColor = null;
  state.isMyTurn = false;
  state.pendingMove = null;
  closeOverlay();
  showScreen("menu");
}

function createRoom() {
  const url = saveServerUrl();
  if (!url) {
    showToast("请先输入服务器地址");
    return;
  }

  openSocket(url, () => {
    sendMessage({ type: "create_room" });
  });
}

function joinRoom() {
  const url = saveServerUrl();
  if (!url) {
    showToast("请先输入服务器地址");
    return;
  }

  const code = ui.roomCodeInput.value.trim();
  if (!/^\d{4}$/.test(code)) {
    showToast("请输入 4 位房间号");
    return;
  }

  openSocket(url, () => {
    sendMessage({ type: "join_room", code });
  });
}

function saveServerUrl() {
  const normalized = normalizeServerUrl(ui.serverUrl.value);
  if (!normalized) {
    return "";
  }
  ui.serverUrl.value = normalized;
  localStorage.setItem("gomoku_server_url", normalized);
  return normalized;
}

function normalizeServerUrl(raw) {
  const value = (raw || "").trim();
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http/i, "ws");
  }

  if (/^wss?:\/\//i.test(value)) {
    return value;
  }

  const useSecure = !/^(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(value);
  return (useSecure ? "wss://" : "ws://") + value;
}

function getDefaultServerUrl() {
  const browserDefault = getBrowserDefaultServerUrl();
  if (browserDefault) {
    return browserDefault;
  }

  try {
    if (typeof Android !== "undefined" && Android.getServerUrl) {
      return Android.getServerUrl() || "";
    }
  } catch (error) {
    return "";
  }
  return "";
}

function getBrowserDefaultServerUrl() {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  const { protocol, host, hostname } = window.location;
  if (!host) {
    return "";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "";
  }

  if (protocol === "https:") {
    return "wss://" + host;
  }

  if (protocol === "http:") {
    return "ws://" + host;
  }

  return "";
}

function openSocket(url, onOpen) {
  closeSocket(false);
  showToast("正在连接服务器...");

  try {
    const ws = new WebSocket(url);
    state.ws = ws;
    state.connected = false;
    updateUI();

    ws.onopen = () => {
      if (state.ws !== ws) {
        ws.close();
        return;
      }
      state.connected = true;
      updateUI();
      onOpen();
    };

    ws.onclose = () => {
      if (state.ws === ws) {
        state.connected = false;
        state.ws = null;
        updateUI();
      }
    };

    ws.onerror = () => {
      showToast("连接失败，请检查服务器地址");
      state.connected = false;
      updateUI();
    };

    ws.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data));
      } catch (error) {
        showToast("收到无法解析的数据");
      }
    };
  } catch (error) {
    showToast("服务器地址无效");
  }
}

function closeSocket(sendLeave) {
  if (!state.ws) {
    return;
  }

  const ws = state.ws;
  state.ws = null;

  if (sendLeave && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "leave_room" }));
  }

  try {
    ws.close();
  } catch (error) {
    // ignore close failures
  }
}

function sendMessage(message) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    showToast("未连接到服务器");
    return;
  }
  state.ws.send(JSON.stringify(message));
}

function handleMessage(message) {
  switch (message.type) {
    case "room_created":
      state.mode = "online";
      state.roomCode = message.code;
      state.myColor = BLACK;
      state.isMyTurn = true;
      ui.roomCodeDisplay.textContent = message.code;
      showScreen("waiting");
      break;

    case "room_joined":
      state.mode = "online";
      state.roomCode = message.code;
      state.myColor = WHITE;
      state.isMyTurn = false;
      enterOnlineGame();
      break;

    case "opponent_joined":
      enterOnlineGame();
      break;

    case "board_state":
      state.board = message.board;
      state.currentPlayer = message.currentPlayer;
      state.isMyTurn = state.myColor === state.currentPlayer;
      updateUI();
      renderBoard();
      break;

    case "move_made":
      state.board[message.row][message.col] = message.player;
      state.currentPlayer = message.currentPlayer;
      state.lastMove = { row: message.row, col: message.col };
      state.pendingMove = null;
      state.isMyTurn = state.myColor === state.currentPlayer;
      pulseFeedback();
      updateUI();
      renderBoard();
      break;

    case "game_over":
      state.board[message.row][message.col] = message.player;
      state.lastMove = { row: message.row, col: message.col };
      state.pendingMove = null;
      state.winLine = message.winLine || null;
      renderBoard();
      showGameOver(message.winner === "draw" ? null : message.winner);
      break;

    case "restarted":
      resetGameState();
      state.isMyTurn = state.myColor === BLACK;
      updateUI();
      renderBoard();
      break;

    case "opponent_disconnected":
      state.connected = false;
      updateUI();
      showToast("对手断开连接");
      break;

    case "opponent_left":
      showToast("对手已离开房间");
      leaveOnlineFlow();
      break;

    case "error":
      showToast(message.message || "发生错误");
      break;

    default:
      break;
  }
}

function enterOnlineGame() {
  resetGameState();
  state.mode = "online";
  state.isMyTurn = state.myColor === BLACK;
  state.blockBoardUntil = Date.now() + 450;
  showScreen("game");
  updateUI();
  requestWakeLock();
}

function showToast(message) {
  const old = document.querySelector(".toast");
  if (old) {
    old.remove();
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      state.wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (error) {
    // ignore
  }
}

function releaseWakeLock() {
  if (!state.wakeLock) {
    return;
  }
  state.wakeLock.release().catch(() => {});
  state.wakeLock = null;
}

function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  }).catch(() => {});
}

document.addEventListener("DOMContentLoaded", setup);
