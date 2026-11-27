
const socket = io();

const $ = (id) => document.getElementById(id);

let me = null;
let isHost = false;
let room = null;
let myHand = [];
let joined = false;
let joinRequested = false;

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

  if (!box) {
    alert(message);
    return;
  }

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

// Gửi yêu cầu vào phòng sau khi Socket.IO đã kết nối.
function emitJoin() {
  if (!joinRequested || joined || !socket.connected) return;

  const code = roomFromUrl || $("code").value.trim();
  const hostId = hostIdFromUrl;

  const name = hostId
    ? "Chủ phòng"
    : ($("name").value.trim() || "Khách");

  if (!code) {
    toast("Anh hãy nhập mã phòng.");
    joinRequested = false;
    return;
  }

  socket.emit("room:join", {
    code: code.toUpperCase(),
    name,
    hostId: hostId || undefined
  });
}

// Người chơi bấm nút vào phòng.
function joinRoom() {
  if (joined || joinRequested) return;

  const code = roomFromUrl || $("code").value.trim();

  if (!code) {
    toast("Anh hãy nhập mã phòng.");
    return;
  }

  joinRequested = true;
  emitJoin();

  if (!socket.connected) {
    toast("Đang kết nối máy chủ...");
  }
}

$("join").addEventListener("click", joinRoom);

// Khi Socket.IO kết nối hoặc kết nối lại.
socket.on("connect", () => {
  if (joinRequested && !joined) {
    emitJoin();
  }
});

// Khi mất kết nối, cho phép kết nối lại và vào phòng lần nữa.
socket.on("disconnect", () => {
  joined = false;
});

// Tự động điền thông tin khi mở link phòng.
if (roomFromUrl) {
  $("code").value = roomFromUrl;

  if (hostIdFromUrl) {
    $("name").value = "Chủ phòng";
    joinRequested = true;

    // Nếu máy chủ đã kết nối thì vào ngay.
    // Nếu chưa, sự kiện connect sẽ tự gửi yêu cầu.
    emitJoin();
  }
}

// Máy chủ xác nhận đã vào phòng.
socket.on("room:joined", (data) => {
  joined = true;
  joinRequested = true;

  me = data.playerId;
  isHost = data.host === true;

  $("lobby").classList.add("hidden");
  $("table").classList.remove("hidden");

  if (isHost) {
    $("start").classList.remove("hidden");
    toast("👑 Chủ phòng đã vào bàn chơi!");
  } else {
    $("start").classList.add("hidden");
    toast("Bạn đã vào phòng thành công!");
  }
});

// Lỗi từ máy chủ.
socket.on("game:error", (message) => {
  toast(message);

  // Cho phép thử vào lại nếu yêu cầu vào phòng bị từ chối.
  if (!joined) {
    joinRequested = false;
  }
});

// Nhận bài riêng của người chơi từ máy chủ.
socket.on("hand:state", (hand) => {
  myHand = Array.isArray(hand) ? hand : [];

  renderHand();

  if (isHost && myHand.length > 0) {
    toast("🧧 Chủ phòng đã nhận " + myHand.length + " lá bài!");
  }
});

// Nhận trạng thái bàn chơi.
socket.on("room:state", (state) => {
  room = state;
  renderRoom();
});

// Hiển thị thông tin bàn chơi.
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
      <div class="avatar">
        ${escapeHTML(player.avatar || "👤")}
      </div>

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

  $("deckCount").textContent =
    "Bộ rút: " + room.deckCount;

  $("activeColor").textContent =
    colors[room.activeColor] || "-";

  if (room.top) {
    $("topCard").className =
      "bigcard " + room.top.color;

    $("topCard").textContent =
      labels[room.top.value] || room.top.value;
  }

  if (isHost && room.status === "lobby") {
    $("start").classList.remove("hidden");
  } else {
    $("start").classList.add("hidden");
  }
}

// Hiển thị bài trên tay người chơi.
function renderHand() {
  $("hand").innerHTML = "";

  myHand.forEach((card) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "card " + card.color;
    button.textContent =
      labels[card.value] || card.value;

    button.addEventListener("click", () => {
      playCard(card);
    });

    $("hand").appendChild(button);
  });
}

// Đánh bài.
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

// Chủ phòng bắt đầu ván.
$("start").addEventListener("click", () => {
  if (!isHost) {
    return toast("Chỉ chủ phòng mới được bắt đầu.");
  }

  if (!room || room.status !== "lobby") {
    return toast("Phòng chưa sẵn sàng.");
  }

  socket.emit("game:start");
});

// Rút bài.
$("draw").addEventListener("click", () => {
  socket.emit("card:draw");
});

// Bỏ lượt.
$("pass").addEventListener("click", () => {
  socket.emit("turn:pass");
});

// Báo UNO.
$("uno").addEventListener("click", () => {
  socket.emit("uno:call");
});

// Bắt người chưa báo UNO.
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
const emojis = [
  "😂", "👍", "❤️", "😱",
  "👏", "😭", "🔥", "🎉"
];

$("emojis").innerHTML = emojis.map(
  (emoji) => `<button type="button">${emoji}</button>`
).join("");

Array.from($("emojis").children).forEach(
  (button, index) => {
    button.addEventListener("click", () => {
      socket.emit("reaction:send", {
        emoji: emojis[index]
      });
    });
  }
);

// Hiển thị cảm xúc tại vị trí người chơi.
socket.on("reaction:show", (data) => {
  const seat = Array.from(
    $("players").children
  ).find(
    (element) => element.dataset.pid === data.playerId
  );

  if (!seat) return;

  const floating = document.createElement("span");

  floating.className = "float";
  floating.textContent = data.emoji;

  seat.appendChild(floating);

  setTimeout(() => {
    floating.remove();
  }, 2000);
});

// Gửi tin nhắn chat.
$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const message = $("chatInput").value.trim();

  if (!message) return;

  socket.emit("chat:send", { message });

  $("chatInput").value = "";
});

// Nhận tin nhắn chat.
socket.on("chat:message", (data) => {
  const item = document.createElement("div");

  item.textContent =
    data.name + ": " + data.message;

  $("messages").appendChild(item);

  $("messages").scrollTop =
    $("messages").scrollHeight;
});

// Báo lỗi kết nối.
socket.on("connect_error", () => {
  toast("Không kết nối được máy chủ. Hãy kiểm tra mạng và tải lại trang.");
});
