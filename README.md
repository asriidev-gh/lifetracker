# LifeTrack

A SaaS-ready web app to track daily activities and generate life analytics.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **MongoDB Atlas** + Mongoose
- **NextAuth** (Email/password + Google)
- **Recharts** for analytics
- **Zustand** for state
- **shadcn/ui** (Radix) components

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and set:

   - `MONGODB_URI` – MongoDB Atlas connection string
   - `NEXTAUTH_SECRET` – e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL` – e.g. `http://localhost:3000`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – optional, for Google login

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. **Seed example data (optional)**

   ```bash
   npm run seed
   ```

   Creates user `demo@lifetrack.app` / `demo1234` and sample activities.

## Features

- **Dashboard** – Today’s activities, total hours, category breakdown, Life Score, productivity summary
- **Add Activity** – Title, category, tags, date, time, duration (auto), energy, notes
- **Activity List** – Table with filters (date, category, search), edit, delete
- **Calendar** – Monthly view, click a date to see that day’s activities
- **Analytics** – Weekly/monthly category breakdown, monthly trend (Recharts)
- **Heatmap** – GitHub-style activity intensity by day
- **Insights** – Auto insights (e.g. exercise count, work hours, most active day)
- **Productivity** – Coding / meetings / learning from tags
- **Life Score** – Daily balance across pillars (exercise, work, social, spiritual, etc.)
- **Settings** – Theme (light/dark/system)

## Project structure

- `app/(dashboard)/` – Authenticated routes (dashboard, activities, calendar, analytics, insights, heatmap, settings)
- `app/api/` – API routes (auth, activities CRUD)
- `components/` – UI and charts
- `lib/` – MongoDB, auth, utils
- `models/` – User, Activity (Mongoose)
- `store/` – Zustand activity store
- `types/` – Shared TypeScript types

## Deployment

- Set `NEXTAUTH_URL` to your production URL.
- Ensure `MONGODB_URI` and `NEXTAUTH_SECRET` are set in your host’s env.
- Build: `npm run build` then `npm start`.
