
const socket = io();
const $ = (id) => document.getElementById(id);

let code = "";
let hostId = "";
let inviteUrl = "";
let hostPlayUrl = "";
let openingGame = false;

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    box.style.display = "none";
  }, 2500);
}

$("create").onclick = async () => {
  try {
    const response = await fetch("/api/room/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("hostName").value })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không tạo được phòng.");

    code = data.code;
    hostId = data.hostId;

    socket.emit("room:join", {
      code,
      name: $("hostName").value,
      hostId
    });
  } catch (error) {
    toast(error.message || "Không kết nối được máy chủ.");
  }
};

socket.on("room:joined", async (data) => {
  $("created").classList.remove("hidden");
  $("roomCode").textContent = "MÃ PHÒNG: " + data.code;

  hostPlayUrl =
    "/?room=" + encodeURIComponent(code) +
    "&host=" + encodeURIComponent(hostId);

  $("hostPlay").href = hostPlayUrl;

  try {
    const response = await fetch("/api/room/" + data.code + "/qr");
    const qrData = await response.json();

    if (!response.ok) {
      throw new Error(qrData.error || "Không tạo được QR.");
    }

    $("qr").src = qrData.qr;
    inviteUrl = qrData.url;
    $("url").textContent = inviteUrl;
  } catch (error) {
    toast(error.message || "Lỗi tạo mã QR.");
  }
});

socket.on("room:state", (state) => {
  $("roster").innerHTML = state.players.map((player) =>
    `<p>${player.avatar} ${player.name} ${player.host ? "👑" : ""} · ${player.connected ? "Online" : "Offline"}</p>`
  ).join("");

  $("start").disabled =
    state.players.length < 2 || state.status !== "lobby";

  if (openingGame && state.status === "playing") {
    openingGame = false;
    window.location.href = hostPlayUrl;
  }
});

socket.on("game:error", (message) => {
  openingGame = false;
  toast(message);
});

$("start").onclick = () => {
  if (!hostPlayUrl) return toast("Anh cần tạo phòng trước.");
  if ($("start").disabled) return;

  openingGame = true;
  toast("Đang chia bài, mở bàn chơi...");
  socket.emit("game:start");
};

$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(inviteUrl);
    toast("Đã sao chép link mời người chơi.");
  } catch (error) {
    toast(inviteUrl || "Chưa có link mời.");
  }
};
