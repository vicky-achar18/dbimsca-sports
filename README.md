# 🏆 DBIMSCA Sports — Registration Portal
## Full-Stack App (Frontend + Backend)

---

## 📁 Project Structure

```
dbimsca_sports/
├── backend/
│   ├── server.js          ← Express API server
│   └── package.json       ← Node dependencies
├── frontend/
│   ├── user/
│   │   └── index.html     ← Student registration portal
│   └── admin/
│       └── index.html     ← Admin dashboard
├── data/
│   └── registrations.json ← JSON database (auto-managed)
└── README.md
```

---

## 🚀 Step-by-Step Setup Guide

### Prerequisites
- **Node.js** (v16 or higher) — Download from https://nodejs.org
- A modern web browser (Chrome, Firefox, Edge)

---

### Step 1 — Extract the ZIP
Unzip `dbimsca_sports.zip` to any folder on your computer.
Example: `C:\Projects\dbimsca_sports\`  or  `~/Projects/dbimsca_sports/`

---

### Step 2 — Install Dependencies
Open a **Terminal** (Mac/Linux) or **Command Prompt / PowerShell** (Windows).

Navigate into the `backend` folder:
```bash
cd dbimsca_sports/backend
```

Install Node packages:
```bash
npm install
```
This installs Express and CORS automatically.

---

### Step 3 — Start the Server
Still in the `backend` folder, run:
```bash
node server.js
```

You should see:
```
✅  DBIMSCA Sports server running at http://localhost:3000
👤  User portal  → http://localhost:3000/user
🔐  Admin panel  → http://localhost:3000/admin
🔑  Admin pass   → kaiswa1823
```

> **Keep this terminal window open** while using the app.

---

### Step 4 — Open the User Portal
Open your browser and go to:
```
http://localhost:3000/user
```
Students can:
- Browse all 12 sports events
- Select multiple events
- Fill in their registration form
- Submit and get a confirmation

---

### Step 5 — Open the Admin Panel
In your browser, go to:
```
http://localhost:3000/admin
```

Login with the default password:
```
kaiswa1823
```

Admins can:
- View all registration stats (total, pending, approved, rejected, revenue)
- Search & filter registrations by name, ID, department, status
- Approve / Reject individual registrations
- Bulk approve all pending registrations
- View full student details in a modal
- Delete a registration
- Export all data as CSV

---

## 🔑 Changing the Admin Password
Open `backend/server.js` and edit line:
```js
const ADMIN_PASSWORD = 'kaiswa1823';
```
Change it to any password you like, then restart the server.

---

## 🌐 API Endpoints

| Method | Route                          | Description                  |
|--------|--------------------------------|------------------------------|
| GET    | /api/events                    | List all events               |
| POST   | /api/register                  | Submit a registration         |
| POST   | /api/admin/login               | Admin login                   |
| GET    | /api/admin/registrations       | Get all registrations         |
| PATCH  | /api/admin/registrations/:id   | Update status/fields          |
| DELETE | /api/admin/registrations/:id   | Delete a registration         |
| GET    | /api/admin/stats               | Dashboard stats               |
| GET    | /api/admin/export.csv          | Download CSV export           |

---

## 🛑 Stopping the Server
Press `Ctrl + C` in the terminal.

---

## 📝 Notes
- All registration data is saved in `data/registrations.json`
- No external database is needed — it works out of the box
- For production use, replace the simple password auth with JWT tokens
