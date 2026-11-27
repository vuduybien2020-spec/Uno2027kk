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

## V9 – Bộ lá bài 3D Tết theo ảnh mẫu
- Đã cắt và tích hợp 24 hình lá bài từ ảnh mẫu được duyệt vào `public/assets/cards/`.
- Các lá có hình trùng khớp trong bộ mẫu sẽ hiển thị bằng ảnh 3D; những số chưa có trong ảnh mẫu vẫn dùng kiểu lá bài CSS hiện tại để không hiển thị sai số.
- Lá Wild hiển thị dấu màu đã chọn ở góc bài sau khi người chơi chọn màu.
- Đã tăng phiên bản cache CSS/JS lên v9.


## V11 – rà soát và sửa lỗi giao diện/luồng chơi
- Lá bài không có ảnh 3D tương ứng vẫn có mặt bài đầy đủ theo màu, không còn chỉ hiện số/chữ trơ.
- Chỉ cho phép người đang đến lượt và còn đúng 1 lá chưa hô UNO mới gọi UNO.
- Chặn socket cũ tiếp tục thao tác sau khi cùng người chơi kết nối lại.
- Nếu bộ bài thực sự hết và không thể rút thêm, tự chuyển lượt để tránh kẹt bàn.
- Chỉ cho bắt đầu khi có ít nhất 2 người đang kết nối; trang chủ phòng cũng khóa nút tương ứng.
- Chuẩn hóa URL QR để tránh dấu gạch chéo kép.
- Tăng phiên bản cache CSS/JS lên V11.

### Giới hạn kiểm thử
Đã kiểm tra cú pháp JavaScript và đối chiếu các ID HTML/tài nguyên ảnh. Chưa chạy kiểm thử đa thiết bị thực tế hoặc mô phỏng toàn bộ ván qua trình duyệt; cần thử bằng ít nhất hai điện thoại sau khi Railway triển khai.


## V12 – sửa lỗi bài và xác nhận tham gia
- Bổ sung đủ 54 mặt bài UNO 3D đồng bộ, không còn fallback nền phẳng cho các lá hợp lệ.
- Mỗi khách quét QR phải tự nhập tên, chọn giới tính/chibi và bấm Vào phòng; không tự tham gia khi Socket.IO vừa kết nối.
- Không tự điền tên cũ từ phiên trình duyệt; vẫn giữ lựa chọn giới tính/chibi để thao tác nhanh.
- Khi đã vào thành công, tự kết nối lại sẽ khôi phục phiên chơi hiện tại.


## V14 – sửa luồng vào phòng
- QR đọc mã từ tham số `room` hoặc `code`, hiển thị mã đã nhận và khóa ô mã.
- Nhập mã thủ công không còn bắt tải lại trang; nút VÀO PHÒNG gửi yêu cầu ngay sau khi xác nhận tên/chibi.
- Tăng phiên bản app.js/style.css để tránh trình duyệt dùng cache cũ.
- Thêm hướng dẫn rõ trên màn hình vào phòng.
