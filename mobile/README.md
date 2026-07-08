# LUCY Mobile

Flutter dashboard cho tài khoản `LUCY_PRO`/`LUCY_SUPER` quản lý học viên trong phòng realtime.

## Chức năng

- Login flow và session shell cho tài khoản Pro.
- Bottom navigation: Tổng quan, Phòng live, Tài liệu, Hồ sơ.
- Bộ UI Kit dùng chung với theme, colors, spacing và component.
- Kết nối phòng qua Socket.IO.
- Nhận danh sách học viên bằng event `room:state`.
- Theo dõi mic, trạng thái giơ tay, audience/speaker.
- Duyệt học viên thành speaker.
- Chuyển speaker về audience.
- Theo dõi chủ đề hiện tại và chủ đề tiếp theo.

Chi tiết UI Kit: `UI_KIT.md`.

## Tạo platform files

Workspace hiện không chứa Flutter SDK, nên các file Android/iOS sinh tự động chưa được tạo. Sau khi cài Flutter:

```powershell
cd mobile
flutter create --org com.lucy --project-name lucy_mobile --platforms=android,ios .
flutter pub get
```

Lệnh `flutter create` giữ nguyên mã trong `lib/` và bổ sung các project runner cần thiết.

## Chạy Android emulator

Realtime URL mặc định:

```text
http://10.0.2.2:3001
```

```powershell
flutter run
```

Thiết bị thật cần dùng IP LAN của máy chạy Node.js:

```powershell
flutter run --dart-define=REALTIME_BASE_URL=http://192.168.1.10:3001
```

## Đăng nhập

Dashboard cần access token của tài khoản `LUCY_PRO` hoặc `LUCY_SUPER`, lấy từ:

```http
POST http://localhost:8080/api/auth/login
```

Sau đó nhập:

- Realtime URL.
- Mã phòng.
- Tên hiển thị.
- Access token Pro.

## Realtime events

Nhận:

- `room:state`
- `timeline:updated`
- `stage:changed`
- `realtime:error`
- `gift:received`

Gửi:

- `room:join`
- `moderation:approve-speaker`
- `moderation:move-to-audience`

## Kiểm tra

```powershell
flutter format lib test
flutter analyze
flutter test
```

Week 8-9 adds a Podcast playback tab and an animated gift overlay. Configure
`WALLET_BASE_URL` for wallet clients; the Android emulator default is
`http://10.0.2.2:5002`.

## Microphone permission

The dashboard requests microphone permission before joining a room. After
generating Android/iOS runners with `flutter create`, apply the snippets in
`platform-permissions/`:

- Copy the permissions into `android/app/src/main/AndroidManifest.xml`.
- Add `NSMicrophoneUsageDescription` to `ios/Runner/Info.plist`.
- For CocoaPods integration, enable `PERMISSION_MICROPHONE=1` in `ios/Podfile`.

If a user permanently denies access, the app offers a shortcut to system app
settings. Local HTTP audio development also requires Android cleartext traffic;
production should use HTTPS.
