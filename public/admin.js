
const socket = io();

const $ = (id) => document.getElementById(id);

let roomCode = "";
let hostId = "";
let hostPlayUrl = "";
let openingGame = false;

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

// Tạo phòng
$("create").addEventListener("click", async () => {
  try {
    $("create").disabled = true;

    const response = await fetch("/api/room/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: $("hostName").value.trim() || "Chủ phòng"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không tạo được phòng.");
    }

    roomCode = data.code;
    hostId = data.hostId;

    socket.emit("room:join", {
      code: roomCode,
      name: $("hostName").value.trim() || "Chủ phòng",
      hostId
    });

  } catch (error) {
    $("create").disabled = false;
    toast(error.message);
  }
});

// Chủ phòng vào phòng thành công
socket.on("room:joined", async (data) => {
  roomCode = data.code;

  hostPlayUrl =
    "/?room=" + encodeURIComponent(roomCode) +
    "&host=" + encodeURIComponent(hostId);

  $("created").classList.remove("hidden");
  $("roomCode").textContent = "MÃ PHÒNG: " + roomCode;

  try {
    const response = await fetch(
      "/api/room/" + encodeURIComponent(roomCode) + "/qr"
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Không tạo được QR.");
    }

    $("qr").src = result.qr;
    $("url").textContent = result.url;

  } catch (error) {
    toast(error.message);
  }
});

// Cập nhật danh sách người chơi
socket.on("room:state", (state) => {
  $("roster").innerHTML = state.players.map((player) => {
    return `
      <p>
        ${player.avatar || "👤"}
        ${escapeHTML(player.name)}
        ${player.host ? "👑 Chủ phòng" : ""}
        · ${player.connected ? "Online" : "Offline"}
        · ${player.count} lá
      </p>
    `;
  }).join("");

  $("start").disabled =
    state.players.length < 2 ||
    state.status !== "lobby";

  // Khi máy chủ xác nhận đã bắt đầu ván,
  // chuyển chủ phòng sang giao diện chơi.
  if (openingGame && state.status === "playing") {
    openingGame = false;
    window.location.href = hostPlayUrl;
  }
});

// Bắt đầu chia bài
$("start").addEventListener("click", () => {
  if (!roomCode || !hostId) {
    toast("Anh hãy tạo phòng trước.");
    return;
  }

  if (openingGame) return;

  openingGame = true;
  $("start").disabled = true;

  toast("Đang chia bài cho mọi người...");

  socket.emit("game:start");
});

// Máy chủ báo lỗi
socket.on("game:error", (message) => {
  openingGame = false;
  $("start").disabled = false;
  toast(message);
});

// Sao chép link mời
$("copy").addEventListener("click", async () => {
  const url = $("url").textContent.trim();

  if (!url) {
    toast("Chưa có link phòng.");
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast("Đã sao chép link mời!");
  } catch (error) {
    toast("Không sao chép được. Anh hãy giữ link để sao chép.");
  }
});

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Lỗi kết nối
socket.on("connect_error", () => {
  toast("Không kết nối được máy chủ.");
});
