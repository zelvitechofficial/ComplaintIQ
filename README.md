# ComplaintIQ — Customer Complaint Analysis System

AI-powered complaint analysis platform with NLP sentiment detection, priority classification, and category tagging. Now secured with **Clerk** and powered by **Neon PostgreSQL**.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![Flask](https://img.shields.io/badge/Flask-3.1-green)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF)
![Neon](https://img.shields.io/badge/DB-Neon_PostgreSQL-00E599)

---

## Features

- **Secure Authentication** — Enterprise-grade auth via **Clerk** (Login, Sign-up, Profile tracking)
- **Cloud Database** — Scalable PostgreSQL hosting on **Neon**
- **NLP Sentiment Analysis** — VADER-based compound scoring (Positive / Negative / Neutral)
- **Priority Detection** — Rule-based keyword matching (High / Medium / Low)
- **Category Classification** — Auto-tags: Billing, Technical, Delivery, Service Quality, Product, Other
- **Dashboard** — Live stats with 30s auto-refresh, KPI cards, bar-chart breakdowns
- **Complaint Management** — Sortable/paginated table, detail modals, mark-as-resolved
- **CSV Export** — Server-side export via `/api/export`
- **Dark / Light Mode** — Toggle with localStorage persistence
- **Mobile Responsive** — Sidebar collapses to hamburger menu on small screens

---

## Project Structure

```
complaint-analysis/
├── backend/
│   ├── app.py              # Flask entry point, global error handling
│   ├── auth.py             # Clerk JWT verification middleware
│   ├── routes.py           # API Blueprint (protected endpoints)
│   ├── models.py           # SQLAlchemy Complaint model
│   ├── nlp_engine.py       # VADER sentiment + keyword priority/category
│   ├── seed.py             # Seed script (20 sample complaints)
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # DATABASE_URL configuration
│
├── frontend/
│   ├── .env.example        # VITE_CLERK_PUBLISHABLE_KEY configuration
│   ├── src/
│   │   ├── main.jsx        # ClerkProvider setup
│   │   ├── App.jsx         # Auth-guarded routing
│   │   ├── api.js          # Auth-aware Axios client (JWT headers)
│   │   └── components/
│   │       ├── Dashboard.jsx
│   │       ├── ComplaintForm.jsx
│   │       └── ComplaintsTable.jsx
│   └── ...
└── README.md
```

---

## Setup & Run

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Clerk Account** (for Authentication)
- **Neon Account** (for PostgreSQL)

### 1. Environment Configuration

#### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@ep-hostname.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=5000
```

#### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Backend Installation

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python app.py
```

### 3. Frontend Installation

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints (Protected)

| Method | Endpoint                          | Auth | Description                |
|--------|-----------------------------------|------|----------------------------|
| GET    | `/api/health`                     | No   | Health check               |
| POST   | `/api/complaints`                 | Yes  | Submit new complaint       |
| GET    | `/api/complaints`                 | Yes  | List all complaints        |
| GET    | `/api/complaints/<id>`            | Yes  | Get single complaint       |
| PUT    | `/api/complaints/<id>/status`     | Yes  | Update complaint status    |
| GET    | `/api/stats`                      | Yes  | Dashboard statistics       |
| GET    | `/api/export`                     | Yes  | Download complaints as CSV |

---

## Tech Stack

| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| **Frontend**   | React 19, Vite, Tailwind CSS, Clerk Frontend |
| **Backend**    | Python 3.10+, Flask, Clerk SDK, PyJWT        |
| **Database**   | Neon (PostgreSQL Serverless)                 |
| **ORM**        | SQLAlchemy / Flask-SQLAlchemy                |
| **NLP**        | NLTK (VADER Sentiment Analyzer)              |
| **Networking** | Axios (with JWT Interceptors)                |
| **UI/UX**      | Lucide React, react-hot-toast, Framer Motion |

