# LaundryLab - Multi-Branch Laundromat Management Platform

Modern web application for managing commercial laundromat branches with real-time floor machine tracking, automated customer intake, payments reconciliation, and a self-service customer portal.

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Vanilla CSS design system, Lucide icons.
- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic.
- **Database**: Cloud PostgreSQL (Supabase) with real-time state tracking.
- **Hosting Architecture**:
  - Web App: Vercel (`laundrylab.com`)
  - API Service: Render / Koyeb (`api.laundrylab.com`)
  - Database: Supabase PostgreSQL (Ireland `eu-west-1`)

## 🏢 Features

- **Multi-Branch Operations**: 6 branches (Absa Towers, Zuri, Nala, The Encore, Georgia, Centurion).
- **Floor Machine Status**: Strict 4 washing machines per branch with dynamic cycle countdowns and automatic ready-state transitions.
- **Customer Intake Modal**: Auto garment counting, service catalog selection, and WhatsApp tracking link generation.
- **Payment Verification**: Counter cash/card speedpoint, EFT, PayShap, and proof-of-payment (POP) review workflows.
- **End-of-Day Shift Reconcile**: Shift revenue balancing and export capabilities.

## 🛠️ Local Development

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to access the application.
