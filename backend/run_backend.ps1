# LaundryLab Backend Startup Script (FastAPI)
Write-Host "Starting LaundryLab FastAPI Backend on port 8001..." -ForegroundColor Cyan

if (Test-Path ".\venv\Scripts\python.exe") {
    & ".\venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
} else {
    python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
}
