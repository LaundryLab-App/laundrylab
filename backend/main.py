import os
import json
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import db

app = FastAPI(
    title="LaundryLab Multi-Branch API",
    description="Backend API for 6 Laundry Mat branches with 4 Washing Machines each (backed by Supabase PostgreSQL).",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE_FILE = os.path.join(os.path.dirname(__file__), "laundry_state.json")

def reconcile_machines_with_orders(machines_dict: Dict[str, List[Dict[str, Any]]], orders: List[Dict[str, Any]]):
    """Ensures machines accurately reflect any active in-progress wash cycles."""
    for o in orders:
        if o.get("status") == "In Progress" and o.get("startedAt") and o.get("durationMinutes"):
            try:
                raw_started = str(o["startedAt"]).replace("Z", "+00:00")
                start_dt = datetime.fromisoformat(raw_started)
                now_dt = datetime.now(timezone.utc) if start_dt.tzinfo else datetime.now()
                elapsed_sec = (now_dt - start_dt).total_seconds()
                dur_sec = float(o["durationMinutes"]) * 60
                remaining_sec = dur_sec - elapsed_sec
                
                branch = o.get("branch")
                machine_code = o.get("machineCode")
                if branch and branch in machines_dict:
                    for m in machines_dict[branch]:
                        if m.get("code") == machine_code:
                            if remaining_sec > 0:
                                m["status"] = "In Use"
                                m["currentOrderId"] = str(o.get("id"))
                                m["timeRemainingMinutes"] = max(1, int(remaining_sec // 60) + 1)
                            else:
                                m["status"] = "Cycle Completed"
                                m["currentOrderId"] = str(o.get("id"))
                                m["timeRemainingMinutes"] = 0
            except Exception:
                pass

def get_current_state_from_db() -> Dict[str, Any]:
    # 1. Fetch from Supabase
    orders = db.fetch_orders()
    machines = db.fetch_machines_by_branch()

    # If Supabase machines are empty, populate fallback machines
    if not machines:
        machines = {}

    # Ensure machines are reconciled with running orders
    reconcile_machines_with_orders(machines, orders)
    return {"orders": orders, "machines": machines}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "LaundryLab API",
        "database": "Supabase PostgreSQL",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/branches")
def get_branches():
    branches = db.fetch_branches()
    if not branches:
        # Fallback list of 6 branches
        branches = [
            {"name": "Absa Towers", "address": "Ground Floor, Absa Towers Main", "machines_count": 4, "operator": "Clyde"},
            {"name": "Zuri", "address": "Ground Floor, Zuri Towers", "machines_count": 4, "operator": "Nkateko"},
            {"name": "Nala", "address": "Ground Floor, Nala Suites", "machines_count": 4, "operator": "Skhathi"},
            {"name": "The Encore", "address": "Ground Floor, The Encore Plaza", "machines_count": 4, "operator": "Mpho"},
            {"name": "Georgia", "address": "Ground Floor, Georgia House", "machines_count": 4, "operator": "Pops"},
            {"name": "Centurion", "address": "Ground Floor, Centurion Center", "machines_count": 4, "operator": "Kairo"},
        ]
    return {"branches": branches}

@app.get("/api/state")
def get_state():
    return get_current_state_from_db()

@app.post("/api/state")
def update_state(payload: Dict[str, Any] = Body(...)):
    if "orders" in payload and isinstance(payload["orders"], list):
        db.upsert_orders(payload["orders"])
    if "machines" in payload and isinstance(payload["machines"], dict):
        db.update_machines(payload["machines"])

    # Also mirror to local file backup
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass

    return {"success": True, "ordersCount": len(payload.get("orders", []))}

@app.get("/api/orders", response_model=List[Dict])
def get_orders(branch: Optional[str] = None):
    return db.fetch_orders(branch=branch)

@app.get("/api/orders/{order_id}")
def get_order(order_id: str):
    orders = db.fetch_orders()
    for o in orders:
        if str(o.get("id")) == str(order_id):
            return o
    raise HTTPException(status_code=404, detail="Order not found")

@app.post("/api/shift_reconciliations")
def save_shift_reconciliation(payload: Dict[str, Any] = Body(...)):
    ok = db.create_reconciliation(payload)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save shift reconciliation to database")
    return {"success": True}
