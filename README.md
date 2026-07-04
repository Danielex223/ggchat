# GGCHAT

A full-stack, real-time messaging platform inspired by WhatsApp and Discord — built solo from scratch.

**Live demo:** https://ggchat-git-main-danielex223s-projects.vercel.app/

## Features

- Real-time 1-on-1 and group messaging with live sync
- Firebase Authentication (email/password)
- Online/offline presence, typing indicators, read receipts
- Media sharing (images/video) via Cloudinary, with captions and a lightbox viewer
- YouTube link previews + fully synced **Watch Together** (host controls, live scrub bar, viewer count)
- Reply-to-message threading
- Message edit, delete, and pin
- Group chats with admin roles (max 2 admins), freeze mode, cosmetic member role tags
- Friends system with requests (send/accept/decline)
- Archive and delete chats/groups per-user, with a dedicated Archived view
- Editable profile (photo, bio, display name), email privacy toggle
- Fully responsive — desktop and mobile layouts

## Tech Stack

- **Frontend:** React (Vite), CSS
- **Backend:** Firebase Authentication, Cloud Firestore (real-time listeners)
- **Media:** Cloudinary
- **Deployment:** Vercel

## Running locally

```bash
git clone https://github.com/Danielex223/ggchat.git
cd ggchat
npm install
```

Create a `.env` file in the root with your own Firebase and Cloudinary keys:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

```bash
npm run dev
```

## Author

Built by [Daniel (Inyene Udo-Akang)](https://github.com/Danielex223)
