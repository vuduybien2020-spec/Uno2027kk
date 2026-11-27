
const socket = io();

const $ = (id) => document.getElementById(id);

let me = null;
let isHost = false;
let room = null;
let myHand = [];
let joined = false;

const query = new URLSearchParams(location.search);
const roomFromUrl = query.get("room");
const hostIdFromUrl = query.get("host");

const colors = {
  red: "ĐỎ 🔴",
  yellow: "VÀNG 🟡",
  green: "XANH LÁ 🟢",
  blue: "XANH DƯƠNG 🔵"
};

const labels = {
  skip: "CẤM",
  reverse: "ĐẢO",
  draw2: "+2",
  wild: "WILD",
  draw4: "+4"
};

function toast(message) {
  const box = $("toast");
  if (!box) return alert(message);

  box.textContent = message;
  box.style.display = "block";

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function joinRoom() {
  if (joined) return;

  const code = roomFromUrl || $("code").value.trim();
  const hostId = hostIdFromUrl;

  const name = hostId
    ? "Chủ phòng"
    : ($("name").value.trim() || "Khách");

  if (!code) {
    toast("Anh hãy nhập mã phòng.");
    return;
  }

  socket.emit("room:join", {
    code: code.toUpperCase(),
    name,
    hostId: hostId || undefined
  });
}

$("join").addEventListener("click", joinRoom);

// Tự vào phòng khi chủ phòng được chuyển từ Admin sang bàn chơi.
if (roomFromUrl) {
  $("code").value = roomFromUrl;

  if (hostIdFromUrl) {
    $("name").value = "Chủ phòng";
    joinRoom();
  }
}

socket.on("room:joined", (data) => {
  joined = true;
  me = data.playerId;
  isHost = data.host;

  $("lobby").classList.add("hidden");
  $("table").classList.remove("hidden");

  if (isHost) {
    $("start").classList.remove("hidden");
  }

  toast(isHost
    ? "Chủ phòng đã vào bàn chơi!"
    : "Bạn đã vào phòng thành công!");
});

socket.on("game:error", (message) => {
  toast(message);
});

// Nhận bài riêng của người chơi từ máy chủ.
socket.on("hand:state", (hand) => {
  myHand = Array.isArray(hand) ? hand : [];
  renderHand();
});

// Nhận trạng thái bàn chơi.
socket.on("room:state", (state) => {
  room = state;
  renderRoom();
});

function renderRoom() {
  if (!room) return;

  $("players").innerHTML = "";

  room.players.forEach((player) => {
    const seat = document.createElement("div");

    seat.className = "seat";
    if (player.id === room.currentPlayerId) {
      seat.classList.add("active");
    }

    seat.dataset.pid = player.id;

    seat.innerHTML = `
      <div class="avatar">${escapeHTML(player.avatar || "👤")}</div>
      <div class="pname">
        ${escapeHTML(player.name)}
        ${player.host ? "👑" : ""}
      </div>
      <div class="count">
        ${player.count} lá ·
        ${player.connected ? "Online" : "Offline"}
      </div>
    `;

    $("players").appendChild(seat);
  });

  const current = room.players.find(
    (player) => player.id === room.currentPlayerId
  );

  $("turnText").textContent =
    room.status === "lobby"
      ? "Đang chờ chủ phòng bắt đầu"
      : room.status === "finished"
        ? "🏆 Ván chơi đã kết thúc"
        : "Lượt của: " + (current?.name || "—");

  $("notice").textContent = room.notice || "";
  $("deckCount").textContent = "Bộ rút: " + room.deckCount;
  $("activeColor").textContent = colors[room.activeColor] || "-";

  if (room.top) {
    $("topCard").className = "bigcard " + room.top.color;
    $("topCard").textContent =
      labels[room.top.value] || room.top.value;
  }

  if (isHost && room.status === "lobby") {
    $("start").classList.remove("hidden");
  } else {
    $("start").classList.add("hidden");
  }
}

function renderHand() {
  $("hand").innerHTML = "";

  myHand.forEach((card) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "card " + card.color;
    button.textContent = labels[card.value] || card.value;

    button.addEventListener("click", () => {
      playCard(card);
    });

    $("hand").appendChild(button);
  });
}

function playCard(card) {
  if (!room || room.status !== "playing") {
    return toast("Ván chơi chưa bắt đầu.");
  }

  if (room.currentPlayerId !== me) {
    return toast("Chưa đến lượt anh.");
  }

  let color;

  if (card.color === "wild") {
    color = prompt(
      "Chọn màu: red, yellow, green hoặc blue",
      "red"
    );

    if (!["red", "yellow", "green", "blue"].includes(color)) {
      return toast("Màu không hợp lệ.");
    }
  }

  socket.emit("card:play", {
    cardId: card.id,
    color
  });
}

// Nút bắt đầu ván dành cho chủ phòng.
$("start").addEventListener("click", () => {
  if (!isHost) return toast("Chỉ chủ phòng mới được bắt đầu.");

  socket.emit("game:start");
});

// Các nút chơi bài.
$("draw").addEventListener("click", () => {
  socket.emit("card:draw");
});

$("pass").addEventListener("click", () => {
  socket.emit("turn:pass");
});

$("uno").addEventListener("click", () => {
  socket.emit("uno:call");
});

$("catch").addEventListener("click", () => {
  if (!room) return;

  const target = room.players.find(
    (player) =>
      player.id !== me &&
      player.count === 1 &&
      !player.saidUno
  );

  if (!target) {
    return toast("Không có người chơi nào để bắt UNO.");
  }

  socket.emit("uno:catch", {
    targetId: target.id
  });
});

// Biểu tượng cảm xúc.
const emojis = ["😂", "👍", "❤️", "😱", "👏", "😭", "🔥", "🎉"];

$("emojis").innerHTML = emojis.map(
  (emoji) => `<button type="button">${emoji}</button>`
).join("");

Array.from($("emojis").children).forEach((button, index) => {
  button.addEventListener("click", () => {
    socket.emit("reaction:send", {
      emoji: emojis[index]
    });
  });
});

// Hiển thị cảm xúc trên vị trí người chơi.
socket.on("reaction:show", (data) => {
  const seat = Array.from(
    $("players").children
  ).find((element) => element.dataset.pid === data.playerId);

  if (!seat) return;

  const floating = document.createElement("span");
  floating.className = "float";
  floating.textContent = data.emoji;

  seat.appendChild(floating);

  setTimeout(() => floating.remove(), 2000);
});

// Chat.
$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const message = $("chatInput").value.trim();
  if (!message) return;

  socket.emit("chat:send", { message });
  $("chatInput").value = "";
});

socket.on("chat:message", (data) => {
  const item = document.createElement("div");

  item.textContent = data.name + ": " + data.message;

  $("messages").appendChild(item);
  $("messages").scrollTop = $("messages").scrollHeight;
});

socket.on("connect_error", () => {
  toast("Không kết nối được máy chủ. Hãy tải lại trang.");
});
