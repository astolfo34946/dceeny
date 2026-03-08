# Construction 360 – Project Overview

This document gives you a **full understanding** of the codebase so you can make changes safely.

---

## 1. What the app does

**Construction 360** is a private portal where:

- **Builders (admins)** create projects, upload 360° photos by week, add hotspots to navigate between rooms, and assign clients to projects.
- **Clients (customers)** sign up, get assigned to a project, then view a 360° walk-through by week with clickable hotspots.

Tech: **React + Vite + TypeScript**, **Tailwind**, **Firebase** (Auth, Firestore, Functions, Hosting), **Cloudinary** (image uploads), **Pannellum** (360° viewer).

---

## 2. Repository layout

```
360/
├── client/                 # React SPA (Vite)
│   ├── src/
│   │   ├── auth/           # Auth context, login, signup, protected routes
│   │   ├── admin/          # Admin console (customers, projects, scenes, analytics)
│   │   ├── customer/       # Customer portal (waiting screen, project dashboard)
│   │   ├── viewer/         # 360° viewer: ReadOnlyPanorama, EditorPanorama
│   │   ├── lib/            # firebase.ts, analytics.ts
│   │   ├── App.tsx         # Routes and role-based layout
│   │   └── main.tsx        # Entry, service worker registration
│   ├── public/             # manifest, service-worker.js
│   └── dist/               # Build output (served by Firebase Hosting)
├── functions/              # Firebase Cloud Functions (TypeScript)
│   └── src/index.ts        # getCloudinarySignature, trackProjectView, onNewSceneNotify
├── firebase.json           # Hosting + Functions config
└── PROJECT_OVERVIEW.md     # This file
```

---

## 3. Routing and roles

| Path       | Who can access | What it does |
|-----------|----------------|--------------|
| `/login`  | Anyone         | Email/password login |
| `/signup` | Anyone         | New customer account |
| `/app/*`  | **customer**   | Customer layout → project dashboard or waiting screen |
| `/admin/*`| **admin**      | Admin layout → Customers / Projects / Scenes / Analytics |
| `*`       | —              | Redirect to `/login` |

- **Admin**: determined by **Firebase custom claims** (`role: "admin"`). Not stored in Firestore; set via Admin SDK.
- **Customer**: Firestore `users/{uid}` has `role: "customer"` and optional `projectId`.

Role check is in `ProtectedRoute`; user profile is in `AuthContext` (reads `users/{uid}` from Firestore after Firebase Auth).

---

## 4. Data model (Firestore)

- **`users/{userId}`**  
  `name`, `email`, `role` (`"admin"` | `"customer"`), `projectId` (optional).  
  Created on signup; admin/customer assignment is via `projectId` and/or `projects.clientId`.

- **`projects/{projectId}`**  
  `name`, `address`, `clientId` (user id of assigned customer), `totalViews`, `lastViewedAt`.  
  Admin creates/edits in Admin Projects; analytics uses `totalViews` / `lastViewedAt`.

- **`projects/{projectId}/scenes/{sceneId}`**  
  `imageUrl`, `roomName`, `weekNumber`, `order`, `hotspots[]`.  
  Each hotspot: `pitch`, `yaw`, `targetSceneId`, `type` (`"circle"` | `"arrow"`), optional `rotation`.  
  Subcollection `scenes/{sceneId}/versions` stores hotspot snapshots for history.

- **`users/{userId}/notifications`**  
  Written by Cloud Function when a new scene is added (e.g. `type: 'new_week'`, `message`, `projectId`, `sceneId`, `read`).

---

## 5. Main frontend flows

### 5.1 Auth

- **Login** (`LoginPage.tsx`): `signInWithEmailAndPassword` → redirect to `/admin` or `/app` (or `from` state).
- **Signup** (`SignupPage.tsx`): `createUserWithEmailAndPassword` + `setDoc(users/{uid}, { name, email, role: 'customer', projectId: null })` → redirect to `/app`.
- **ProtectedRoute**: uses `useAuth()`; if no user → redirect to `/login`; if role not in `allowedRoles` → “Access restricted”.

### 5.2 Customer

- **CustomerLayout**:  
  Resolves “my project” from `user.projectId` or first project where `clientId === user.id`.  
  If none → **CustomerWaitingScreen** (“Project not yet assigned”).  
  If project exists → **CustomerProjectDashboard** with that `projectId`.

- **CustomerProjectDashboard**:  
  Loads project doc and `projects/{projectId}/scenes` (ordered by `weekNumber`, `order`).  
  Week selector; sidebar lists “Rooms this week”; main area is **ReadOnlyPanorama** with hotspots to change scene.  
  Calls `trackProjectView(projectId)` when dashboard loads (see “Gaps” below).

### 5.3 Admin

- **AdminLayout**: Sidebar nav → Customers, Projects, Scenes & Hotspots, Analytics.
- **AdminCustomers**: List customers (Firestore `users` where `role === 'customer'`), assign/drop `projectId` per user.
- **AdminProjects**: CRUD projects; set `name`, `address`, `clientId` (dropdown of customers).
- **AdminScenes**:  
  Pick project → upload 360° JPGs (room name + week) via **Cloudinary signed upload** (see “Gaps” below).  
  List scenes by week; select scene → **EditorPanorama** to add/move/delete hotspots (circle/arrow, target scene), then save (writes to Firestore + `versions`).
- **AdminAnalytics**: Reads `projects` and shows `totalViews`, `lastViewedAt` per project.

### 5.4 360° viewer

- **ReadOnlyPanorama** (`viewer/ReadOnlyPanorama.tsx`):  
  Pannellum viewer; `scenes` and `initialSceneId`; hotspots trigger scene change. Used on customer dashboard.

- **EditorPanorama** (`viewer/EditorPanorama.tsx`):  
  Single scene; click to add hotspot, drag to move; type (circle/arrow), target scene, rotation for arrows.  
  “Save hotspots” calls parent `onChangeHotspots` → AdminScenes writes to Firestore.

---

## 6. Backend (Cloud Functions)

In `functions/src/index.ts`:

1. **getCloudinarySignature** (callable)  
   Auth required; `projectId`, `fileName`. Returns `timestamp`, `signature`, `apiKey`, `cloudName` for client-side Cloudinary upload.

2. **trackProjectView** (callable)  
   Auth required; `projectId`. Increments `projects/{projectId}` `totalViews` and sets `lastViewedAt`.

3. **onNewSceneNotify** (Firestore trigger)  
   On `projects/{projectId}/scenes/{sceneId}` create → if project has `clientId`, adds a doc to `users/{clientId}/notifications`.

Cloud Functions use **secrets** (or env) for Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

## 7. Configuration and env

- **Client** (`client/.env`):  
  `VITE_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).  
  Optional: `VITE_CLOUDINARY_SIGN_URL`, `VITE_SUPABASE_ANON_KEY` (if using a separate sign endpoint instead of the callable).

- **Firebase**:  
  `firebase.json` → hosting serves `client/dist`; rewrites to `ssrApp` (SSR function; may be optional if you only use SPA).  
  Functions source: `functions`, Node 18.

- **Admin role**: Set in Firebase Auth **custom claims** (e.g. `role: "admin"`), not in Firestore. Use Admin SDK or a one-off script/function.

---

## 8. Gaps / wiring to fix when making changes

1. **Cloudinary upload (AdminScenes)**  
   Code uses `VITE_CLOUDINARY_SIGN_URL` (POST) and optionally `VITE_SUPABASE_ANON_KEY`.  
   The backend provides **getCloudinarySignature** as a **Firebase callable**. To use the callable instead: call `httpsCallable(functions, 'getCloudinarySignature', { projectId, fileName })` and use the returned `timestamp`, `signature`, `apiKey`, `cloudName` in the Cloudinary upload form (no separate sign URL needed).

2. **Analytics (customer dashboard)**  
   `lib/analytics.ts` → `trackProjectView(projectId)` only does `console.debug`.  
   To persist views: call the Firebase callable `trackProjectView` from the client (e.g. `httpsCallable(functions, 'trackProjectView', { projectId })`) when the customer opens their project dashboard.

---

## 9. Where to change what

| Change | Where to look |
|--------|----------------|
| Routes, role checks | `App.tsx`, `ProtectedRoute.tsx`, `AuthContext.tsx` |
| Login/signup UI or logic | `auth/LoginPage.tsx`, `auth/SignupPage.tsx` |
| Customer “my project” resolution | `customer/CustomerLayout.tsx` |
| Customer 360° experience | `customer/CustomerProjectDashboard.tsx`, `viewer/ReadOnlyPanorama.tsx` |
| Admin customers/projects | `admin/AdminCustomers.tsx`, `admin/AdminProjects.tsx` |
| Scene upload + hotspot editor | `admin/AdminScenes.tsx`, `viewer/EditorPanorama.tsx` |
| Analytics UI | `admin/AdminAnalytics.tsx` |
| Analytics tracking | `lib/analytics.ts` (+ call `trackProjectView` callable) |
| Cloudinary upload | `admin/AdminScenes.tsx` (handleUpload); optionally switch to `getCloudinarySignature` callable |
| Firestore schema / rules | `firestore.rules`; any `collection()` / `doc()` in client and functions |
| New Cloud Functions | `functions/src/index.ts` |
| Styling / theme | `client/src/index.css`, `client/tailwind.config.js` |
| PWA / offline | `client/public/`, `main.tsx` (service worker) |

---

## 10. Quick commands

```bash
# Client
cd client && npm install && npm run dev    # dev server :5173
cd client && npm run build                 # build for hosting

# Functions
cd functions && npm install && npm run build && firebase deploy --only functions

# Full deploy (hosting + functions)
cd client && npm run build && cd .. && firebase deploy
```

Use this overview as the map: follow the flows above, respect the Firestore shape and roles, and fix the two wiring points (Cloudinary sign + trackProjectView) when you need them to work end-to-end.
