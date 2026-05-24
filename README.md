# Study Chinese

Web học tiếng Trung theo HSK 1-6 với giao diện pastel, sidebar điều hướng, từ vựng đầy đủ theo cấp, ngữ pháp, test trình độ, flashcard và luyện viết chữ.

## Tính năng

- Trang chủ giới thiệu các tính năng chính của web.
- Sidebar gồm: Trang chủ, Tìm kiếm, Từ vựng, Ngữ pháp, Test cấp độ, Card học thuộc, Luyện viết.
- Dữ liệu từ vựng HSK 1-6: 4991 từ, có chữ Hán, pinyin, từ loại, Hán Việt, nghĩa, chủ đề.
- Lọc từ theo cấp HSK, chủ đề và từ khóa.
- Flashcard để học thuộc và đánh dấu từ đã nhớ.
- Luyện viết chữ bằng canvas.
- Backend đăng ký/đăng nhập, role mặc định `user`.
- Đăng nhập Google qua backend verify Google credential.
- Lưu database MySQL nếu cấu hình `DATABASE_URL`; nếu chưa có DB thì backend dùng file local để dev.

## Công nghệ

- Frontend: React, Vite
- Backend: Express
- Auth: Google Identity Services, JWT, bcrypt
- Database: MySQL qua `mysql2`

## Cấu trúc

```text
client/   Frontend React/Vite
backend/  Backend Express auth API
```

## Chạy frontend

```bash
cd client
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://127.0.0.1:5173/
```

Tạo file `client/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000/api
```

## Chạy backend

```bash
cd backend
npm install
npm run dev
```

Backend mặc định chạy tại:

```text
http://localhost:3000
```

Tạo file `backend/.env`:

```env
PORT=3000
CLIENT_ORIGIN=http://127.0.0.1:5173
JWT_SECRET=change-this-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
DATABASE_URL=mysql://root:password@localhost:3306/chinese_learning_app
```

Nếu chưa có MySQL, có thể bỏ `DATABASE_URL`; backend sẽ dùng file local trong `backend/data/` để test.

## API chính

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
```

Register body:

```json
{
  "username": "user01",
  "password": "123456",
  "googleAccount": "user01@gmail.com",
  "role": "user"
}
```

Google login body:

```json
{
  "credential": "google-id-token"
}
```

## Ghi chú Google OAuth

Để đăng nhập Google hoạt động, cần tạo OAuth Client ID trong Google Cloud Console và cấu hình cùng một client id cho cả:

- `client/.env`: `VITE_GOOGLE_CLIENT_ID`
- `backend/.env`: `GOOGLE_CLIENT_ID`

Authorized JavaScript origins nên có:

```text
http://127.0.0.1:5173
http://localhost:5173
```

## Kiểm tra

Frontend:

```bash
cd client
npm run lint
npm run build
```

Backend:

```bash
cd backend
node --check src/server.js
node --check src/storage.js
```
