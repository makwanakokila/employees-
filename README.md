# SEUnits Backend

Node.js + Express + MongoDB backend for the SEUnits Employee Management System.

## Tech Stack
- Node.js, Express.js
- MongoDB, Mongoose
- JWT Auth (admin/employee)
- Multer for uploads

## Getting Started
```
cd backend
npm install
cp .env.example .env
# edit .env
npm run dev
```

Server: http://localhost:5000
Frontend (CORS allowed): http://localhost:3000

## Environment Variables
See `.env.example` for required vars:
- PORT
- MONGO_URI
- JWT_SECRET

## Folder Structure
```
backend/
  config/db.js
  controllers/
  models/
  routes/
  middleware/
  uploads/
  app.js
  package.json
```

## API
- Auth: `/api/auth`
  - POST `/register` { name, email, password, role }
  - POST `/login` { email, password }
  - POST `/logout`
- Employees: `/api/employees` (admin only)
  - POST `/` create
  - GET `/` list
  - GET `/:id` get
  - PUT `/:id` update
  - DELETE `/:id` delete
- Groups: `/api/groups` (admin only)
  - POST `/` create
  - GET `/` list
  - PUT `/:id` update name
  - DELETE `/:id` delete
  - POST `/:id/members` { memberIds: [] } assign
- Attendance: `/api/attendance`
  - POST `/` (admin/employee) { employeeId, status, date? }
  - GET `/summary?date=YYYY-MM-DD` (admin)
- Uploads: `/api/uploads`
  - POST `/` (admin/employee) multipart field `file`, body `uploadedBy`
  - GET `/` list

JWT: Send `Authorization: Bearer <token>` header for protected endpoints.

## Notes
- Uploaded files are stored under `backend/uploads` and served at `/uploads`.
- Passwords are hashed with bcrypt.
- JWT is stateless; logout is handled client-side by discarding the token.
