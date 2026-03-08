## Construction 360 Portal

Private 360° construction progress viewer for builders (admin) and clients (customers), built with **React + Vite**, **Tailwind CSS**, **Firebase (Auth, Firestore, Functions, Hosting)**, **Cloudinary** (signed uploads), and **Pannellum** for 360° scenes.

### 1. Tech stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS, black & white design system
- **Backend**: Firebase
  - Authentication (email/password)
  - Firestore (users, projects, scenes, analytics, notifications)
  - Cloud Functions (Cloudinary signed uploads, analytics, notifications)
  - Hosting
- **Media**: Cloudinary (signed uploads from admin only)
- **360 viewer**: Pannellum
- **PWA**: basic offline support, installable on mobile

### 2. Project structure

- `client/` – React app
  - `src/auth` – auth context, protected routes, login/signup
  - `src/customer` – waiting screen, project dashboard, 360° viewer
  - `src/admin` – admin console (customers, projects, scenes/hotspots, analytics)
  - `src/viewer` – Pannellum wrappers (read-only + hotspot editor)
  - `src/lib` – Firebase client, analytics helper
- `functions/` – Firebase Cloud Functions (TypeScript)
- `firebase.json`, `.firebaserc`, `firestore.rules` – Firebase config

### 3. Environment variables

Create `.env` inside `client/` (already scaffolded) with:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=construction_360
```

For **Cloud Functions**, set secrets (never commit these) using:

```bash
cd functions
firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
```

Or configure them as environment variables in your deployment environment.

### 4. Firebase setup

1. Create a Firebase project (or reuse the one from `.firebaserc`).
2. Enable:
   - **Email/Password Auth**
   - **Firestore (native mode)**
   - **Cloud Functions**
   - **Hosting**
3. In Firestore:
   - `users/{userId}`: `{ name, email, role, projectId }`
   - `projects/{projectId}`: `{ name, address, clientId, totalViews, lastViewedAt }`
   - `projects/{projectId}/scenes/{sceneId}`: `{ imageUrl, roomName, weekNumber, order, hotspots[] }`
4. Deploy security rules:

```bash
firebase deploy --only firestore:rules
```

### 5. Cloud Functions

From the project root:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Provided functions:

- `getCloudinarySignature` – callable; returns a signed payload to upload images to Cloudinary securely from the admin UI.
- `trackProjectView` – callable; increments per-project `totalViews` and `lastViewedAt`.
- `onNewSceneNotify` – Firestore trigger; when a new scene is created, writes a notification into the client’s `users/{userId}/notifications` subcollection.

### 6. Running the frontend locally

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

### 7. Deployment (Hosting)

Build the client and deploy via Firebase Hosting:

```bash
cd client
npm run build
cd ..
firebase deploy --only hosting
```

Hosting is configured in `firebase.json` to serve the SPA from `client/dist`.

### 8. Roles and access

- **Admin (builder)**:
  - Defined via **custom claims** (`role: "admin"`) on Auth users.
  - Firestore rules grant admins full read/write to `projects`, `scenes`, and internal collections.
- **Customer (client)**:
  - Created via public signup form → Firebase Auth user + Firestore `users/{userId}` with `role: "customer"`, `projectId: null`.
  - Can only read:
    - Their own user document.
    - Their assigned project and scenes.

Set admin roles using the Admin SDK (script or one-off Cloud Function) by writing `role: "admin"` to the user’s custom claims.

### 9. UX flows

- **Customer signup**
  - Fills `Full Name / Email / Password`.
  - Creates Auth user + `users/{userId}` with `role: "customer"`, `projectId: null`.
  - Redirected to `/app`.
  - If `projectId` is still `null`, the **Waiting Screen** appears.

- **Customer dashboard**
  - Once an admin assigns a project:
    - Customer sees `Project name`, `address`, and a **week selector**.
    - 360° viewer (Pannellum) loads the current week’s scenes with smooth transitions.
    - Hotspots allow moving between rooms; all read-only.
    - Scenes are lazy-loaded with skeleton loaders.

- **Admin console**
  - `Customers`: list all customers, see assignment status, assign/reassign `projectId`.
  - `Projects`: create/edit/delete projects, set `clientId`.
  - `Scenes & Hotspots`:
    - Choose a project.
    - Upload 360 JPG per week via **Cloudinary signed upload**.
    - Visual editor (Pannellum-based):
      - Click to add hotspot.
      - Drag to reposition.
      - Choose hotspot type (circle/arrow) and target scene.
      - Save hotspots; a version snapshot is stored for undo/restore.
  - `Analytics`:
    - Shows `totalViews`, `lastViewedAt` per project.
    - Backed by `trackProjectView` callable function.

### 10. PWA

- `public/manifest.webmanifest` and `public/service-worker.js` provide:
  - Installable experience on mobile.
  - Basic offline caching of shell assets.
- Service worker is registered in `src/main.tsx`.

### 11. Notes and extensions

- **Multi-project per customer**: extend `users/{userId}` with an array of project IDs and add a simple project switcher on the customer dashboard.
- **Email delivery**: wire `onNewSceneNotify` into an email provider (e.g. SendGrid) for production email notifications.
- **Export snapshots**: add a button in the viewer to capture canvas frames and send to a Cloud Function that assembles PDF/image reports per week.

