# 🌐 Geospatial Service Registry

A beginner-friendly REST API for managing service providers with geographic locations and finding providers whose service radius covers a given point — powered by **Node.js**, **Express**, and **MongoDB Atlas**.

---

## ✨ Features

- Full CRUD (Create, Read, Update, Delete) for users
- Geospatial search using the **Haversine formula**
- Consistent JSON responses
- Robust input validation & sanitization
- CORS enabled for seamless frontend integration

---

## 📁 Project Structure

```
project/
├── controllers/
│   └── userController.js   # Request handlers and validation logic
├── models/
│   └── User.js             # Mongoose schema for the database
├── routes/
│   └── userRoutes.js       # API endpoint maps
├── utils/
│   └── distance.js         # Math utility (Haversine formula)
├── server.js               # Main application entry point
├── .env                    # Cloud database credentials
├── package.json            # Dependencies & scripts
└── README.md               # You are here
```

---

## 🚀 How to Run

Before starting, ensure your `.env` file contains your **MongoDB Atlas** connection string mapping to your `MONGO_URI` variable:
```env
PORT=5000
MONGO_URI="mongodb+srv://<your_username>:<your_password>@cluster0.abcde.mongodb.net/geo-registry?retryWrites=true&w=majority"
```

### Option 1: Run Locally (Node.js)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

### Option 2: Run with Docker (Recommended)
You do not need to install Node/NPM. Just build the API container mapping the ports and `.env`:
1. Build and start the container:
   ```bash
   docker-compose up --build
   ```

You should see:
```text
✅ Connected to MongoDB
🚀 Server running on http://localhost:5000
```

---

## 📡 API Endpoints Reference

### 1. Create a User
```bash
POST /users
```
**Body (JSON):**
```json
{
  "name": "LA Distribution Hub",
  "latitude": 34.0522,
  "longitude": -118.2437,
  "service_radius": 50
}
```

### 2. Get All Users
```bash
GET /users
```

### 3. Update User
```bash
PATCH /users/:id
```
**Body (JSON):**
```json
{
  "service_radius": 100
}
```

### 4. Search by Location
```bash
GET /search?lat=34.05&long=-118.24
```
*This calculates the Haversine distance between your coordinates and all providers, returning only the ones near you!*

### 5. Delete User
```bash
DELETE /users/:id
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB Atlas (Cloud) + Mongoose |

---

## 📝 License

MIT
