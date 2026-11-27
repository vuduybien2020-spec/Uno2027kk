
const socket = io();
const $ = (id) => document.getElementById(id);

let me = null;
let isHost = false;
let room = null;
let myHand = [];

const emojis = ["😂", "👍", "❤️", "😱", "👏", "😭", "🔥", "🎉"];

const names = {
  skip: "CẤM",
  reverse: "ĐẢO",
  draw2: "+2",
  wild: "WILD",
  draw4: "+4"
};

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    box.style.display = "none";
  }, 2600);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const query = new URLSearchParams(location.search);

if (query.get("room")) {
  $("code").value = query.get("room");
}

function joinRoom() {
  const code = $("code").value.trim().toUpperCase();
  const hostId = query.get("host");
  const name = hostId
    ? "Chủ phòng"
    : ($("name").value.trim() || "Khách");

  if (!code) return toast("Anh nhập mã phòng trước nhé.");

  socket.emit("room:join", {
    code,
    name,
    hostId: hostId || undefined
  });
}

$("join").onclick = joinRoom;

// Tự động đăng nhập chủ phòng khi Admin chuyển sang bàn chơi.
if (query.get("room") && query.get("host")) {
  $("name").value = "Chủ phòng";
  joinRoom();
}

socket.on("room:joined", (data) => {
  me = data.playerId;
  isHost = data.host;

  $("lobby").classList.add("hidden");
  $("table").classList.remove("hidden");

  if (isHost) {
    $("start").classList.remove("hidden");
  }

  toast("Đã vào phòng " + data.code +
    (isHost ? " · Chủ phòng" : ""));
});

socket.on("game:error", toast);

socket.on("hand:state", (hand) => {
  myHand = Array.isArray(hand) ? hand : [];
  renderHand();
});

socket.on("room:state", (state) => {
  room = state;
  render();
});

function cardLabel(card) {
  return names[card.value] || card.value;
}

function render() {
  if (!room) return;

  $("players").innerHTML = "";

  room.players.forEach((player) => {
    const seat = document.createElement("div");

    seat.className =
      "seat" +
      (player.id === room.currentPlayerId ? " active" : "");

    seat.dataset.pid = player.id;

    seat.innerHTML = `
      <div class="avatar">${esc(player.avatar || "🧑")}</div>
      <div class="pname">
        ${esc(player.name)} ${player.host ? "👑" : ""}
      </div>
      <div class="count">
        ${player.count} lá · ${player.connected ? "Online" : "Offline"}
      </div>
    `;

    $("players").append(seat);
  });

  const currentPlayer = room.players.find(
    (player) => player.id === room.currentPlayerId
  );

  $("turnText").textContent =
    room.status === "lobby"
      ? "Đang chờ chủ phòng bắt đầu"
      : room.status === "finished"
        ? "🏆 Ván đã kết thúc"
        : `Lượt của: ${currentPlayer?.name || "—"}`;

  $("notice").textContent = room.notice || "";
  $("deckCount").textContent = room.deckCount + " lá";

  $("activeColor").textContent = ({
    red: "ĐỎ 🔴",
    yellow: "VÀNG 🟡",
    green: "XANH LÁ 🟢",
    blue: "XANH DƯƠNG 🔵"
  })[room.activeColor] || "-";

  if (room.top) {
    $("topCard").className = "bigcard " + room.top.color;
    $("topCard").textContent = cardLabel(room.top);
  }
}

function renderHand() {
  $("hand").innerHTML = "";

  myHand.forEach((card) => {
    const button = document.createElement("button");

    button.className = "card " + card.color;
    button.textContent = cardLabel(card);

    button.onclick = () => {
      let color;

      if (card.color === "wild") {
        color = prompt(
          "Chọn màu: red, yellow, green hoặc blue",
          "red"
        )?.toLowerCase();

        if (!color) return;
      }

      socket.emit("card:play", {
        cardId: card.id,
        color
      });
    };

    $("hand").append(button);
  });
}

$("draw").onclick = () => socket.emit("card:draw");
$("pass").onclick = () => socket.emit("turn:pass");
$("uno").onclick = () => socket.emit("uno:call");
$("start").onclick = () => {
  if (isHost) socket.emit("game:start");
};

$("catch").onclick = () => {
  const player = room?.players.find(
    (item) => item.id !== me &&
      item.count === 1 &&
      !item.saidUno
  );

  if (player) {
    socket.emit("uno:catch", { targetId: player.id });
  } else {
    toast("Không có ai để bắt UNO.");
  }
};

$("emojis").innerHTML = emojis
  .map((emoji) => `<button type="button">${emoji}</button>`)
  .join("");

[...$("emojis").children].forEach((button, index) => {
  button.onclick = () => {
    socket.emit("reaction:send", {
      emoji: emojis[index]
    });
  };
});

socket.on("reaction:show", (data) => {
  const seat = document.querySelector(
    `[data-pid="${data.playerId}"]`
  );

  if (!seat) return;

  const floating = document.createElement("span");
  floating.className = "float";
  floating.textContent = data.emoji;

  seat.append(floating);

  setTimeout(() => floating.remove(), 2000);
});

$("chatForm").onsubmit = (event) => {
  event.preventDefault();

  socket.emit("chat:send", {
    message: $("chatInput").value
  });

  $("chatInput").value = "";
};

socket.on("chat:message", (message) => {
  const item = document.createElement("div");

  item.textContent =
    message.name + ": " + message.message;

  $("messages").append(item);
  $("messages").scrollTop = $("messages").scrollHeight;
});
