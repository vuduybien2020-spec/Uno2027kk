
const express = require("express");
const http = require("http");
const helmet = require("helmet");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 6;

const COLORS = ["red", "yellow", "green", "blue"];
const REACTIONS = ["😂", "👍", "❤️", "😱", "👏", "😭", "🔥", "🎉"];

const rooms = new Map();

const makeId = () => crypto.randomUUID();

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createDeck() {
  const cards = [];

  for (const color of COLORS) {
    cards.push({
      id: makeId(),
      color,
      value: "0"
    });

    for (let number = 1; number <= 9; number++) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: makeId(),
          color,
          value: String(number)
        });
      }
    }

    for (const value of ["skip", "reverse", "draw2"]) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: makeId(),
          color,
          value
        });
      }
    }
  }

  for (let copy = 0; copy < 4; copy++) {
    cards.push({
      id: makeId(),
      color: "wild",
      value: "wild"
    });

    cards.push({
      id: makeId(),
      color: "wild",
      value: "draw4"
    });
  }

  return shuffle(cards);
}

function getPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId);
}

function currentIndex(room) {
  return room.players.findIndex(
    (player) => player.id === room.currentPlayerId
  );
}

function nextIndex(room, index, steps = 1) {
  return (
    index +
    room.direction * steps +
    room.players.length * 2
  ) % room.players.length;
}

function drawCards(room, player, count = 1) {
  for (let i = 0; i < count; i++) {
    if (room.deck.length === 0) {
      if (room.discard.length <= 1) break;

      const topCard = room.discard.pop();

      room.deck = shuffle(room.discard.splice(0));
      room.discard = [topCard];
    }

    const card = room.deck.pop();

    if (card) {
      player.hand.push(card);
    }
  }
}

function advanceTurn(room, steps = 1) {
  const index = currentIndex(room);

  if (index < 0 || room.players.length === 0) return;

  room.currentPlayerId =
    room.players[nextIndex(room, index, steps)].id;

  room.turnNumber += 1;
}

function publicRoomState(room) {
  return {
    code: room.code,
    status: room.status,

    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      host: player.host,
      connected: player.connected,
      count: player.hand.length,
      saidUno: player.saidUno
    })),

    currentPlayerId: room.currentPlayerId,
    direction: room.direction,
    top: room.discard[room.discard.length - 1] || null,
    activeColor: room.activeColor,
    deckCount: room.deck.length,
    winner: room.winner,
    notice: room.notice,
    turnNumber: room.turnNumber
  };
}

function broadcastRoom(room) {
  io.to(room.code).emit(
    "room:state",
    publicRoomState(room)
  );
}

function sendHand(player) {
  if (!player || !player.socketId) return;

  io.to(player.socketId).emit(
    "hand:state",
    player.hand
  );
}

function sendError(socket, message) {
  socket.emit("game:error", message);
}

function startGame(room) {
  if (room.status !== "lobby") {
    throw new Error("Ván chơi đã được bắt đầu.");
  }

  if (room.players.length < 2) {
    throw new Error("Cần ít nhất 2 người để bắt đầu.");
  }

  room.deck = createDeck();
  room.discard = [];
  room.direction = 1;
  room.winner = null;
  room.status = "playing";
  room.turnNumber = 1;

  for (const player of room.players) {
    player.hand = [];
    player.saidUno = false;
    player.drawnId = null;
  }

  // Chia 7 lá cho từng người, bao gồm cả chủ phòng.
  for (let cardNo = 0; cardNo < 7; cardNo++) {
    for (const player of room.players) {
      drawCards(room, player, 1);
    }
  }

  let firstCard = room.deck.pop();

  while (firstCard && firstCard.color === "wild") {
    room.deck.unshift(firstCard);
    firstCard = room.deck.pop();
  }

  room.discard.push(firstCard);
  room.activeColor = firstCard.color;
  room.currentPlayerId = room.players[0].id;

  room.notice =
    "Ván mới bắt đầu! Chúc mọi người năm mới may mắn!";

  if (firstCard.value === "skip") {
    advanceTurn(room, 2);
  } else if (firstCard.value === "reverse") {
    room.direction = -1;
  } else if (firstCard.value === "draw2") {
    const target = room.players[1];

    drawCards(room, target, 2);
    room.currentPlayerId = target.id;

    advanceTurn(room, 1);
  }
}

function createRoomCode() {
  let code;

  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(code));

  return code;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size
  });
});

app.post("/api/room/create", (req, res) => {
  const code = createRoomCode();
  const hostId = makeId();

  const hostName =
    String(req.body?.name || "Chủ phòng")
      .trim()
      .slice(0, 22) || "Chủ phòng";

  const room = {
    code,
    hostId,

    players: [{
      id: hostId,
      name: hostName,
      avatar: "👑",
      host: true,
      hand: [],
      connected: false,
      saidUno: false,
      socketId: null,
      drawnId: null
    }],

    status: "lobby",
    deck: [],
    discard: [],
    direction: 1,
    currentPlayerId: null,
    activeColor: null,
    winner: null,
    notice: "Mời bạn bè tham gia bàn UNO!",
    turnNumber: 0
  };

  rooms.set(code, room);

  res.json({
    code,
    hostId
  });
});

app.get("/api/room/:code/qr", async (req, res) => {
  try {
    const room = rooms.get(
      String(req.params.code || "").toUpperCase()
    );

    if (!room) {
      return res.status(404).json({
        error: "Không tìm thấy phòng."
      });
    }

    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get("host")}`;

    const url = `${baseUrl}/?room=${room.code}`;

    const qr = await QRCode.toDataURL(url, {
      width: 420,
      margin: 1
    });

    return res.json({
      url,
      qr
    });

  } catch (error) {
    console.error("QR generation error:", error);

    return res.status(500).json({
      error: "Không tạo được mã QR."
    });
  }
});

io.on("connection", (socket) => {

  // Vào phòng hoặc chủ phòng kết nối lại bằng hostId.
  socket.on("room:join", (payload = {}) => {
    const code = String(payload.code || "")
      .trim()
      .toUpperCase();

    const room = rooms.get(code);

    if (!room) {
      return sendError(socket, "Không tìm thấy phòng.");
    }

    let player;

    if (
      payload.hostId &&
      payload.hostId === room.hostId
    ) {
      // Nhận diện lại đúng chủ phòng cũ.
      player = getPlayer(room, room.hostId);

    } else {
      if (room.status !== "lobby") {
        return sendError(
          socket,
          "Ván đã bắt đầu, không thể tham gia lúc này."
        );
      }

      if (room.players.length >= MAX_PLAYERS) {
        return sendError(socket, "Phòng đã đủ 6 người.");
      }

      player = {
        id: socket.id,
        name:
          String(payload.name || "Khách")
            .trim()
            .slice(0, 22) || "Khách",
        avatar: ["🌸", "🐐", "🧧", "🐲", "🏮", "🌼"][
          room.players.length
        ],
        host: false,
        hand: [],
        connected: false,
        saidUno: false,
        socketId: null,
        drawnId: null
      };

      room.players.push(player);
    }

    if (!player) {
      return sendError(
        socket,
        "Không xác định được người chơi."
      );
    }

    // Gắn socket mới cho đúng người chơi.
    player.connected = true;
    player.socketId = socket.id;

    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;

    socket.join(room.code);

    socket.emit("room:joined", {
      code: room.code,
      playerId: player.id,
      host: player.host
    });

    // Nếu ván đã bắt đầu, gửi lại bài cho người vừa kết nối.
    if (room.status === "playing") {
      sendHand(player);
    }

    broadcastRoom(room);
  });

  // Bắt đầu ván.
  socket.on("game:start", () => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    if (!room || !player || !player.host) {
      return sendError(
        socket,
        "Chỉ chủ phòng mới được bắt đầu."
      );
    }

    try {
      startGame(room);

      // Gửi bài riêng cho từng người chơi đang kết nối.
      room.players.forEach((member) => {
        sendHand(member);
      });

      broadcastRoom(room);

      // Xác nhận riêng cho trang quản trị biết đã bắt đầu.
      socket.emit("game:started", {
        code: room.code,
        status: room.status
      });

    } catch (error) {
      sendError(socket, error.message);
    }
  });

  // Đánh bài.
  socket.on("card:play", (payload = {}) => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    if (!room || !player) return;

    if (
      room.status !== "playing" ||
      room.currentPlayerId !== player.id
    ) {
      return sendError(socket, "Chưa đến lượt bạn.");
    }

    const cardIndex = player.hand.findIndex(
      (card) => card.id === payload.cardId
    );

    if (cardIndex < 0) {
      return sendError(socket, "Không tìm thấy lá bài.");
    }

    const card = player.hand[cardIndex];

    const topCard =
      room.discard[room.discard.length - 1];

    const isPlayable =
      card.color === "wild" ||
      card.color === room.activeColor ||
      card.value === topCard.value;

    if (!isPlayable) {
      return sendError(socket, "Lá bài không hợp lệ.");
    }

    if (
      card.value === "draw4" &&
      player.hand.some(
        (item) => item.color === room.activeColor
      )
    ) {
      return sendError(
        socket,
        "Không được đánh +4 khi còn lá cùng màu."
      );
    }

    if (
      card.color === "wild" &&
      !COLORS.includes(payload.color)
    ) {
      return sendError(
        socket,
        "Hãy chọn màu cho lá Wild."
      );
    }

    player.hand.splice(cardIndex, 1);
    player.drawnId = null;

    // Chưa tự động báo UNO; người chơi phải bấm nút UNO.
    player.saidUno = false;

    room.discard.push(card);

    room.activeColor =
      card.color === "wild"
        ? payload.color
        : card.color;

    if (player.hand.length === 0) {
      room.status = "finished";
      room.winner = player.id;
      room.notice = `🎉 ${player.name} chiến thắng!`;

      room.players.forEach(sendHand);
      return broadcastRoom(room);
    }

    let steps = 1;

    if (card.value === "skip") {
      steps = 2;
    }

    if (card.value === "reverse") {
      room.direction *= -1;

      if (room.players.length === 2) {
        steps = 2;
      }
    }

    if (
      card.value === "draw2" ||
      card.value === "draw4"
    ) {
      const target =
        room.players[
          nextIndex(room, currentIndex(room))
        ];

      const penalty =
        card.value === "draw2" ? 2 : 4;

      drawCards(room, target, penalty);
      sendHand(target);

      steps = 2;

      room.notice =
        `${target.name} rút ${penalty} lá và mất lượt.`;

    } else {
      room.notice =
        `${player.name} đã đánh ${card.value}.`;
    }

    advanceTurn(room, steps);

    room.players.forEach(sendHand);
    broadcastRoom(room);
  });

  // Rút bài.
  socket.on("card:draw", () => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    if (!room || !player) return;

    if (
      room.status !== "playing" ||
      room.currentPlayerId !== player.id
    ) {
      return sendError(socket, "Chưa đến lượt bạn.");
    }

    if (player.drawnId) {
      return sendError(
        socket,
        "Bạn đã rút bài trong lượt này."
      );
    }

    drawCards(room, player, 1);

    player.drawnId =
      player.hand[player.hand.length - 1]?.id || null;

    sendHand(player);

    room.notice = `${player.name} đã rút một lá.`;

    broadcastRoom(room);
  });

  // Bỏ lượt.
  socket.on("turn:pass", () => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    if (!room || !player) return;

    if (
      room.status !== "playing" ||
      room.currentPlayerId !== player.id ||
      !player.drawnId
    ) {
      return sendError(
        socket,
        "Bạn cần rút bài trước khi bỏ lượt."
      );
    }

    player.drawnId = null;

    advanceTurn(room);

    room.notice = `${player.name} kết thúc lượt.`;

    broadcastRoom(room);
  });

  // Báo UNO.
  socket.on("uno:call", () => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    if (
      !room ||
      !player ||
      player.hand.length !== 1
    ) {
      return sendError(
        socket,
        "Chỉ hô UNO khi còn đúng 1 lá."
      );
    }

    player.saidUno = true;

    room.notice = `${player.name} hô UNO!`;

    broadcastRoom(room);
  });

  // Bắt người chưa báo UNO.
  socket.on("uno:catch", (payload = {}) => {
    const room = rooms.get(socket.data.roomCode);

    const target =
      room && getPlayer(room, payload.targetId);

    if (
      !room ||
      !target ||
      target.hand.length !== 1 ||
      target.saidUno
    ) {
      return sendError(
        socket,
        "Không thể bắt UNO người chơi này."
      );
    }

    if (room.currentPlayerId === target.id) {
      return sendError(
        socket,
        "Không thể bắt UNO khi người đó đang tới lượt."
      );
    }

    drawCards(room, target, 2);

    target.saidUno = true;

    sendHand(target);

    room.notice =
      `${target.name} bị phạt rút 2 lá!`;

    broadcastRoom(room);
  });

  // Gửi biểu tượng cảm xúc.
  socket.on("reaction:send", (payload = {}) => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    const emoji = payload.emoji;

    if (
      !room ||
      !player ||
      !REACTIONS.includes(emoji)
    ) {
      return;
    }

    const now = Date.now();

    if (
      now - (socket.data.lastReactionAt || 0) < 700
    ) {
      return;
    }

    socket.data.lastReactionAt = now;

    io.to(room.code).emit("reaction:show", {
      playerId: player.id,
      emoji
    });
  });

  // Chat.
  socket.on("chat:send", (payload = {}) => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    const message =
      String(payload.message || "")
        .trim()
        .slice(0, 120);

    if (!room || !player || !message) return;

    io.to(room.code).emit("chat:message", {
      name: player.name,
      message
    });
  });

  // Ngắt kết nối.
  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomCode);

    const player =
      room && getPlayer(room, socket.data.playerId);

    // Chỉ đánh dấu offline nếu đây vẫn là socket hiện tại.
    // Tránh socket cũ ngắt kết nối làm mất kết nối socket mới.
    if (
      player &&
      player.socketId === socket.id
    ) {
      player.connected = false;
      player.socketId = null;

      broadcastRoom(room);
    }
  });
});

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `UNO TET 2027 listening on port ${PORT}`
  );
});
