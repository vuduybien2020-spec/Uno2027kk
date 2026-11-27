# UNO Tết 2027

- Online rooms up to six players including host, QR invitations and Socket.IO.
- Classic UNO core: seven-card deal, matching by color/value, Skip, Reverse, Draw Two, Wild and Wild Draw Four, UNO call, draw and pass.
- Wild cards open four visible color buttons; no typed color prompt.
- Chat bubbles over player avatars, reactions, win counters and leaderboard.
- PostgreSQL persistence for win totals when `DATABASE_URL` is configured.

## Local run
`npm install && npm start` then open http://localhost:8080.

## Railway deployment
1. Upload this folder's contents to a new GitHub repository/branch.
2. Railway > New Project > Deploy from GitHub Repo.
3. Add a PostgreSQL service in the Railway project.
4. Add the PostgreSQL `DATABASE_URL` reference to the Node service.
5. Generate a public domain and verify `/api/health` returns `database: true`.

Room state is held in process memory; a server restart closes active rooms. Win totals persist in PostgreSQL. Test on two or more phones before public use.


## Tính năng chọc người chơi (mới)
- Mỗi avatar có nút 👉 CHỌC; không thể tự chọc chính mình.
- Chọc một người chơi sẽ phát hiệu ứng bong bóng và rung avatar cho toàn bộ người trong phòng.
- Máy chủ giới hạn mỗi người gửi một lần chọc mỗi 2 giây để tránh spam.


## Hình ảnh và âm thanh V4
- Nền Tết: `public/assets/tet-background.png` đã được đóng gói sẵn.
- Ảnh avatar: các PNG trong `public/assets/`.
- Nhạc xuân và hiệu ứng âm thanh được tạo trực tiếp bằng Web Audio API, không cần tải MP3 hoặc dùng nhạc có bản quyền. Người chơi cần chạm nút bật nhạc một lần trên Android để cho phép phát âm thanh.
- Nút bật/tắt nhạc và hiệu ứng nằm trên đầu màn hình game.


## V8 — cập nhật giao diện điện thoại
- Ưu tiên màn hình dọc Android, bàn và bài được xếp theo luồng dọc.
- Bộ chọn chibi lọc theo giới tính: nữ (long/lan/an/mai), nam (huy/nam).
- Thanh emoji giữ một hàng ngang; emoji hiển thị tại avatar người gửi, không phủ toàn màn hình.
- Chat mở bằng nút biểu tượng; nội dung chat hiện thành bong bóng trên avatar người gửi.
- Bài trên tay xếp thành một hàng có cuộn ngang, không chồng lấn.
- Nền Tết tối giản, hoa mai rơi nhẹ; hiệu ứng không chặn thao tác.
- Lá Wild tiếp tục dùng màu đã chọn từ trạng thái phòng do máy chủ phát.

Kiểm tra đã chạy: kiểm tra cú pháp JavaScript Node cho server và app. Chưa kiểm thử đa thiết bị hoặc tải thực tế trên Railway; cần deploy và kiểm tra bằng hai điện thoại.
