# UNO Tết 2027 — bản giao diện bàn chơi 6 người

## Tính năng
- Phòng trực tuyến tối đa 6 người, gồm cả chủ phòng.
- Tạo phòng, mã phòng, QR và link mời.
- Chủ phòng vào bàn chơi bằng định danh `hostId`, không tạo ghế trùng.
- Chia 7 lá cho từng người; bài riêng chỉ gửi về đúng người chơi.
- Luật UNO cơ bản: đánh theo màu/số/ký hiệu, Wild, +2, +4, Cấm, Đảo, Rút bài, Bỏ lượt, Báo UNO và Bắt UNO.
- Chat phòng; nội dung chat nổi thành bong bóng phía trên avatar người gửi.
- Biểu cảm nổi cạnh avatar.
- Huy hiệu số ván thắng cạnh avatar; số thắng tăng khi người chơi về hết bài.
- Chủ phòng có thể bắt đầu ván mới sau khi ván trước kết thúc.
- Giao diện Tết đỏ-vàng, bàn xanh, bố cục 6 người; tự co giãn trên Android dọc/ngang.

## Chạy local
1. Cài Node.js 18 trở lên.
2. Trong thư mục dự án chạy `npm install`.
3. Chạy `npm start`.
4. Mở `http://localhost:8080`.

## Triển khai Railway
1. Đẩy toàn bộ nội dung thư mục dự án lên GitHub repository `Uno2027kk`.
2. Railway deploy từ repository đó, dùng lệnh start mặc định `npm start`.
3. Không cần tự đặt PORT; Railway cấp biến `PORT`.
4. Sau khi deploy thành công, mở `/api/health` để kiểm tra máy chủ trả về `ok: true`.
5. Tạo phòng mới sau mỗi lần deploy để kiểm tra bằng hai điện thoại.

## Quy trình thử nghiệm
1. Điện thoại 1 mở `/admin.html`, nhập tên và tạo phòng.
2. Điện thoại 2 quét QR hoặc mở link mời, nhập tên và tham gia.
3. Khi có ít nhất hai người, điện thoại 1 nhấn bắt đầu.
4. Kiểm tra mỗi người nhận 7 lá, chủ phòng chỉ có một ghế.
5. Gửi chat từ điện thoại 2; bong bóng phải xuất hiện trên avatar điện thoại 2 ở cả hai máy.
6. Chơi hết một ván; huy hiệu thắng của người thắng tăng 1 và chủ phòng có thể mở ván mới.

## Lưu ý kỹ thuật
- Danh sách phòng và số ván thắng hiện lưu trong bộ nhớ tiến trình Node.js. Nếu Railway khởi động lại hoặc deploy lại, phòng và số thắng trong phiên sẽ mất. Muốn lưu lâu dài cần thêm cơ sở dữ liệu như PostgreSQL/Redis.
- Đây là bản UNO cơ bản; một số biến thể giải đấu (cộng dồn +2/+4, thách thức +4, giới hạn thời gian lượt) chưa được triển khai.
- Kiểm tra cú pháp JavaScript bằng `node --check`. Cần cài dependencies bằng `npm install` trước khi chạy server.
