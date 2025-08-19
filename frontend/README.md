# 🌱 StudyGarden Frontend (Web)

This is the **frontend web app** for **StudyGarden**, a gamified productivity platform where completing real-life tasks helps you grow a virtual garden.

The frontend is built with **Next.js (React)** and communicates with the [StudyGarden Backend](../backend) running on **Google Cloud Run**.

---

## 🚀 Features

- Task dashboard: add, complete, and track progress
- Interactive garden view (plants grow as you complete tasks)
- Currency/shop system for seeds and upgrades
- Authentication & user profiles
- Future: multiplayer greenhouse with friends

---

## 🛠 Tech Stack

- **Next.js 14** (React)
- **Tailwind CSS** for styling
- **TanStack Query (React Query)** for API data fetching
- **Framer Motion** for animations
- **PixiJS (planned)** for smooth garden rendering
- Hosted on **Vercel** (recommended)

---

## 📦 Local Development

```bash
# Install dependencies
npm install   # or pnpm install

# Run dev server
npm run dev

# Open at http://localhost:3000
```

🔗 Backend Integration

The app expects a backend API running at:

```
https://studygarden-api-<hash>-<region>.a.run.app
```

Configure the API URL via .env.local:

```
NEXT_PUBLIC_API_URL=https://studygarden-api-xxxxxx.a.run.app
```

## ☁️ Deployment (Vercel)

1. Push code to GitHub
2. Import repo in Vercel
3. Add environment variable NEXT_PUBLIC_API_URL
4. Deploy 🚀

## 🔮 Roadmap

• Garden rendered with PixiJS for smoother animations
• Realtime multiplayer support (Socket.IO / Firestore listeners)
• Shared greenhouse with friends
• Custom avatars & achievements
