<div align="center">
  <img src="sociogram-frontend/public/icons.svg" alt="Sociogram Logo" width="120" />
  <h1>Sociogram</h1>
  <p><strong>Next-Generation, Privacy-First Social Feed with On-Device Facial Expression Reactions</strong></p>

  [![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](#)
  [![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Prisma-indigo.svg)](#)
  [![Security](https://img.shields.io/badge/Security-Hardened-red.svg)](#)
</div>

<br />

## 📖 Overview

**Sociogram** is a full-stack, cross-platform social media application that reimagines how users interact with content. Instead of manually clicking like buttons, users react with their **face**. Using advanced on-device Machine Learning (`face-api.js`), Sociogram analyzes the user's facial expressions via webcam or mobile camera to seamlessly post emoji reactions in real-time.

**Privacy is the core pillar of Sociogram.** Facial expression detection runs *entirely* on the edge (within the user's browser or device). Video frames never leave the client device; only the computed emotion label (e.g., `happy`, `surprised`) is transmitted to the API.

---

## ✨ Key Features

### 🛡️ Enterprise-Grade Security & Privacy
*   **On-Device ML:** Machine learning inference executes 100% locally.
*   **Account Privacy:** Users can toggle private accounts to restrict visibility of their posts and follower graphs.
*   **Secure Auth Flow:** JWT-based authentication with `accessToken` & `refreshToken` rotation, alongside secure password resets.
*   **Bot Protection:** Strict email verification pipeline via NodeMailer before granting user access.
*   **Backend Hardening:** Protected via Helmet (HTTP headers), strict CORS enforcement, and IP-based Rate Limiting.

### ⚡ Seamless User Experience
*   **Cloudinary CDN Integration:** All images and heavy videos (Reels) are optimized, compressed, and delivered globally.
*   **Real-time Infrastructure:** WebSockets (`socket.io`) power instantaneous notifications, read receipts, and live direct messages.
*   **Optimistic UI:** Like, unlike, and save actions immediately reflect in the React DOM, providing zero-latency perceived performance.
*   **Cursor-based Pagination:** Infinite scrolling implementation on the Feed and heavy Comment sections to ensure buttery-smooth 60fps scrolling.

---

## 🏗️ Architecture & Monorepo Structure

Sociogram utilizes a modern Monorepo structure, cleanly separating concerns between the Web App, the Mobile App, and the RESTful API.

```text
Sociogram/
├── sociogram-frontend/          # Web Platform (React, Vite, TailwindCSS)
│   ├── public/models/           # Pre-compiled face-api.js weights
│   └── src/                     # React application source code
├── sociogram-backend/           # Core API (Node.js, Express, Prisma, PostgreSQL)
│   ├── prisma/                  # Database schema & seeding logic
│   └── src/                     # API controllers, services, and middlewares
└── sociogram-mobile/            # Mobile Platform (React Native, Expo)
    ├── screens/                 # Mobile views
    └── components/              # Reusable React Native components
```

### 💻 Tech Stack
*   **Frontend (Web):** React 19, Vite, TailwindCSS, Axios
*   **Frontend (Mobile):** React Native, Expo, React Navigation, `expo-secure-store`
*   **Backend:** Node.js, Express, Socket.io
*   **Database & ORM:** PostgreSQL (Neon), Prisma ORM
*   **Infrastructure:** Render (API), Vercel (Web), Cloudinary (Media CDN)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **PostgreSQL** (Local instance or Cloud provider like Neon/Supabase)
*   **Cloudinary Account** (For media storage)

### 2. Environment Configuration
Clone the repository and set up your environment variables.

#### Backend
Navigate to the backend and configure `.env`:
```bash
cd sociogram-backend
cp .env.example .env
```
Ensure you populate `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_URL`, and your email SMTP settings inside `.env`.

#### Frontend
Navigate to the frontend and configure `.env`:
```bash
cd ../sociogram-frontend
cp .env.example .env
```

### 3. Install & Seed
Install dependencies for both workspaces and prepare the database.

```bash
# In sociogram-backend
npm install
npx prisma generate
npm run db:push    # Push schema to Postgres
npm run db:seed    # Populate DB with mock data & users

# In sociogram-frontend
cd ../sociogram-frontend
npm install
```

### 4. Ignite the Engines
Run the services concurrently in separate terminal windows:

```bash
# Terminal 1: API Server
cd sociogram-backend
npm run dev
# Server running on http://localhost:3001

# Terminal 2: Web Client
cd sociogram-frontend
npm run dev
# Client running on http://localhost:5173
```

---

## 🌐 Production Deployment

Sociogram is designed for easy, scalable deployment across modern PaaS providers.

### 1. Web App (Vercel)
1. Import the repository into **Vercel**.
2. **Crucial Step:** Navigate to **Settings > General > Root Directory** and set it to `sociogram-frontend`.
3. Add your environment variables (e.g., `VITE_API_URL`).
4. Deploy. Vercel will automatically detect Vite and output to `dist`.

### 2. Backend API (Render)
1. Connect the repository to **Render** as a Web Service.
2. Set the Root Directory to `sociogram-backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Inject your production environment variables (`DATABASE_URL`, `FRONTEND_URL`, etc.) via the Render dashboard.

### 3. Mobile App (Expo)
To test or build the React Native application:
```bash
cd sociogram-mobile
npm install
npx expo start
```
Use the **Expo Go** app on your physical device to scan the QR code and launch the mobile application over your local network.

---

## 🔒 Security & ML Data Flow

1. **Permission Check:** The webcam is initialized *only* after explicit user opt-in (`ExpressionProvider`).
2. **Frame Capture:** A hidden HTML canvas captures periodic video frames.
3. **Inference:** Frames are processed locally via `tinyFaceDetector` and `faceExpressionNet`.
4. **Data Purge:** The raw image frame is instantly destroyed from memory.
5. **API Handshake:** Only the resulting expression literal (`"happy"`, `"surprised"`) is securely transmitted to `POST /api/posts/:id/react`.

---

<div align="center">
  <i>Built with ❤️ for privacy and seamless UX.</i>
</div>
