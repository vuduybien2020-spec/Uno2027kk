
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

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Tạo phòng.
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
      throw new Error(
        data.error || "Không tạo được phòng."
      );
    }

    roomCode = data.code;
    hostId = data.hostId;

    hostPlayUrl =
      "/?room=" + encodeURIComponent(roomCode) +
      "&host=" + encodeURIComponent(hostId);

    // Đợi Socket.IO kết nối rồi mới cho chủ phòng vào.
    if (!socket.connected) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Không kết nối được máy chủ."));
        }, 10000);

        socket.once("connect", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

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

// Chủ phòng vào phòng thành công.
socket.on("room:joined", async (data) => {
  if (data.host !== true) return;

  roomCode = data.code;

  hostPlayUrl =
    "/?room=" + encodeURIComponent(roomCode) +
    "&host=" + encodeURIComponent(hostId);

  $("created").classList.remove("hidden");

  $("roomCode").textContent =
    "MÃ PHÒNG: " + roomCode;

  try {
    const response = await fetch(
      "/api/room/" + encodeURIComponent(roomCode) + "/qr"
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Không tạo được QR."
      );
    }

    $("qr").src = result.qr;
    $("url").textContent = result.url;

  } catch (error) {
    toast(error.message);
  }
});

// Cập nhật danh sách người chơi.
socket.on("room:state", (state) => {
  $("roster").innerHTML = state.players.map((player) => {
    return `
      <p>
        ${escapeHTML(player.avatar || "👤")}
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
});

// Bắt đầu chia bài.
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

// Máy chủ xác nhận đã chia bài và bắt đầu ván.
// Chỉ khi nhận được sự kiện này mới chuyển chủ phòng sang bàn chơi.
socket.on("game:started", (data) => {
  if (!openingGame) return;

  if (!data || data.status !== "playing") {
    openingGame = false;
    $("start").disabled = false;
    toast("Chưa thể bắt đầu ván.");
    return;
  }

  toast("Đã chia bài! Đang mở bàn chơi...");

  openingGame = false;

  // Chuyển chủ phòng sang bàn chơi với đúng hostId.
  window.location.replace(hostPlayUrl);
});

// Máy chủ báo lỗi.
socket.on("game:error", (message) => {
  openingGame = false;

  $("start").disabled = false;

  toast(message);
});

// Sao chép link mời.
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
    toast(
      "Không sao chép được. Anh hãy giữ link để sao chép."
    );
  }
});

// Lỗi kết nối.
socket.on("connect_error", () => {
  toast("Không kết nối được máy chủ.");
});
