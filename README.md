# Switchboard — AI Receptionist & Front-Desk SaaS (MongoDB & ElevenLabs Voice Agents)

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database%20%2B%20GridFS-47A248?logo=mongodb)](https://www.mongodb.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Conversational%20AI-000000)](https://elevenlabs.io/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)

> **⚠️ Disclaimer:** This is an **educational SaaS project** built for learning and production reference. "Switchboard" is a demo name — all organization names, offerings, bookings, contacts, and seed data are fictional.

A full-stack, real-time **AI front-desk / receptionist SaaS** — a B2B multi-tenant app where any appointment-based business (barber shop, salon, clinic, consultancy, support team) gets a **branded public booking page** with a built-in **ElevenLabs voice + text concierge** that answers questions and **books, reschedules, and cancels appointments** in a live conversation, while staff manage everything from a **tenant-scoped dashboard**.

---

## ⚡ Tech Stack Architecture

- **Framework**: Next.js 16 (App Router, Server Actions, API Dispatcher routes).
- **Database & Storage**: MongoDB Connection Pool & MongoDB GridFS for binary file & logo uploads.
- **Authentication**: Custom HTTP-only session cookie management (`switchboard_session`) backed by bcrypt password hashing and MongoDB multi-tenant RBAC (`orgMembers`).
- **Billing & Entitlements**: MongoDB-backed plan entitlement manager supporting **Core** ($0/mo), **Engage** ($49/mo), and **Voice** ($149/mo) plans.
- **Conversational AI**: ElevenLabs Conversational AI WebSocket API (`@elevenlabs/react` and `@elevenlabs/elevenlabs-js`) with 6 client booking tools (`get_business_info`, `get_availability`, `book_appointment`, `lookup_appointment`, `reschedule_appointment`, `cancel_appointment`).
- **Styling & UI**: Tailwind CSS v4, Lucide React, Radix UI primitives, shadcn/ui.

---

## ✨ Key Features

### 1. AI Concierge (ElevenLabs Conversational AI)
- 🗣️ **Voice & Text Chat**: Visitors can converse via live text chat or speak directly using browser microphone audio.
- 🧰 **6 Booking Client Tools**: `get_business_info`, `get_availability`, `book_appointment`, `lookup_appointment`, `reschedule_appointment`, and `cancel_appointment` executed in real time against the MongoDB backend.
- 🧠 **Dynamic Context Injection**: Grounded in the tenant's published services, staff availability, business policies, terminology, locale, and timezone.
- 🔐 **Entitlement-Gated Sessions**: Web chat requires the `web_agent` feature entitlement (Engage plan), while microphone browser audio requires `browser_voice` (Voice plan).

### 2. Multi-Tenant Business Dashboard
- 🗂️ **Offerings & Services Catalog**: Configure durations, pricing, buffers, and online bookability.
- 👥 **Team & Weekly Working Hours**: Set member availability rules per day and assign services.
- 📅 **Bookings & Snapshots**: Live management of all appointments with status filters (`pending`, `confirmed`, `completed`, `canceled`, `no_show`).
- 🎨 **Public Site Builder**: Theme customization, templates (`editorial`, `gallery`, `compact`), custom branding, hero banners, and announcements.
- 💳 **Plan & Billing Switcher**: Instant tenant plan upgrades and feature entitlements powered directly by MongoDB.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or later
- pnpm or npm
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster or local MongoDB instance
- An [ElevenLabs](https://elevenlabs.io/) account and API Key

---

### 1. Clone the repository

```bash
git clone https://github.com/thecoachmanuel/ai-receptionist.git
cd ai-receptionist
```

### 2. Install dependencies

```bash
pnpm install
# or
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-receptionist?appName=Cluster0

# ElevenLabs Credentials
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_DEFAULT_AGENT_ID=your_elevenlabs_agent_id_here
```

### 4. Automatically provision the ElevenLabs Agent

Run the automated setup script to create your Conversational AI Agent on ElevenLabs with all client tools pre-configured:

```bash
npm run agent:create
```

*This will automatically generate the agent on ElevenLabs and save `ELEVENLABS_DEFAULT_AGENT_ID` directly into your `.env.local` file.*

### 5. Start the development server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your workspace and start building!

---

## 📁 Project Structure

```text
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # Sign In, Sign Up, Workspace Switcher REST routes
│   │   │   ├── data/            # Data API Dispatcher replacing Convex
│   │   │   ├── storage/         # MongoDB GridFS upload/download route
│   │   │   └── public/          # Gated ElevenLabs Agent Session endpoints
│   │   ├── app/[orgSlug]/       # Multi-tenant Dashboard screens
│   │   └── p/[siteSlug]/        # Public client booking pages
│   ├── components/
│   │   ├── auth/                # Custom UserButton, OrganizationSwitcher & OrgList
│   │   ├── dashboard/           # Offerings, Team, Bookings, Availability, Billing screens
│   │   └── public-site/         # Client Agent Launcher & ElevenLabs Tools
│   └── lib/
│       ├── auth/                # Session cookies & bcrypt password handler
│       ├── db/                  # MongoDB Singleton Connection Pool, GridFS & BSON Types
│       ├── services/            # MongoDB data services (bookings, team, catalog, publicSite)
│       └── billing.ts           # Plan feature entitlement checks (Core, Engage, Voice)
├── scripts/
│   ├── create-elevenlabs-agent.mjs # Automated agent setup script
│   └── create-agent.ps1            # REST API fallback script
└── package.json
```

---

## 📜 License & Disclaimer

This project is shared for educational and starter template purposes. All third-party trademarks (ElevenLabs, MongoDB, Next.js, Vercel, Tailwind CSS) belong to their respective owners.
