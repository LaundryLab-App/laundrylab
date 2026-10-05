import os
import json
import uuid
from fastapi import FastAPI, HTTPException, Body, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import db

app = FastAPI(
    title="LaundryLab Multi-Branch API",
    description="Backend API for 6 Laundry Mat branches with 4 Washing Machines each (backed by Supabase PostgreSQL).",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE_FILE = os.path.join(os.path.dirname(__file__), "laundry_state.json")

# Standardized User Accounts (Owner: Mpho, updated Operators)
ACCOUNTS = {
    "towers@laundrylab.com": {
        "id": "usr-absa",
        "name": "Nokulunga",
        "role": "Operator",
        "assignedBranch": "Absa Towers",
        "email": "towers@laundrylab.com",
        "password": "Towers@2026"
    },
    "encore@laundrylab.com": {
        "id": "usr-encore",
        "name": "Smiso",
        "role": "Operator",
        "assignedBranch": "The Encore",
        "email": "encore@laundrylab.com",
        "password": "Encore@2026"
    },
    "zuri@laundrylab.com": {
        "id": "usr-zuri",
        "name": "Ntombi",
        "role": "Operator",
        "assignedBranch": "Zuri",
        "email": "zuri@laundrylab.com",
        "password": "Zuri@2026"
    },
    "nala@laundrylab.com": {
        "id": "usr-nala",
        "name": "Nokulunga",
        "role": "Operator",
        "assignedBranch": "Nala",
        "email": "nala@laundrylab.com",
        "password": "Nala@2026"
    },
    "georgia@laundrylab.com": {
        "id": "usr-georgia",
        "name": "Unassigned",
        "role": "Operator",
        "assignedBranch": "Georgia",
        "email": "georgia@laundrylab.com",
        "password": "Georgia@2026"
    },
    "centurion@laundrylab.com": {
        "id": "usr-centurion",
        "name": "Unassigned",
        "role": "Operator",
        "assignedBranch": "Centurion",
        "email": "centurion@laundrylab.com",
        "password": "Centurion@2026"
    },
    "mpho@laundylab.com": {
        "id": "usr-admin",
        "name": "Mpho (Owner)",
        "role": "Owner",
        "assignedBranch": "All Branches",
        "email": "mpho@laundylab.com",
        "password": "Mpho@2026"
    }
}

@app.on_event("startup")
def init_db_tables():
    """Attempts direct PostgreSQL initialization for user_sessions if direct DB access is available."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url, connect_timeout=5)
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        email VARCHAR(150) PRIMARY KEY,
                        session_token VARCHAR(100) NOT NULL,
                        device_name VARCHAR(150),
                        is_active BOOLEAN DEFAULT TRUE,
                        last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """)
            conn.commit()
            conn.close()
            print("Successfully initialized user_sessions table in Supabase PostgreSQL")
        except Exception as e:
            print(f"PostgreSQL direct table init bypassed: {e}")

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
    orders = db.fetch_orders()
    machines = db.fetch_machines_by_branch()
    if not machines:
        machines = {}
    reconcile_machines_with_orders(machines, orders)
    return {"orders": orders, "machines": machines}

# ----------------- AUTH & CONCURRENT SESSION LOCKING -----------------

@app.post("/api/auth/login")
def auth_login(payload: Dict[str, Any] = Body(...)):
    email = payload.get("email", "").lower().strip()
    password = payload.get("password", "").strip()
    device_name = payload.get("deviceName", "Browser / Mobile")

    account = ACCOUNTS.get(email)
    if not account or account["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")

    # Check for active existing session (First-device priority rule)
    existing_session = db.get_active_session(email)
    if existing_session and existing_session.get("is_active"):
        last_hb = existing_session.get("last_heartbeat")
        if last_hb:
            try:
                hb_dt = datetime.fromisoformat(str(last_hb).replace("Z", "+00:00"))
                now_dt = datetime.now(timezone.utc) if hb_dt.tzinfo else datetime.now()
                diff_sec = (now_dt - hb_dt).total_seconds()
                
                # If active heartbeat within the last 90 seconds, reject the 2nd device
                if diff_sec < 90:
                    device_desc = existing_session.get("device_name") or "another station device"
                    return JSONResponse(
                        status_code=409,
                        content={
                            "error": "CONCURRENT_SESSION_LOCKED",
                            "message": f"This account is currently active on {device_desc}. Preference is given to the first device. Please log out on that device first, or contact management to release the session lock."
                        }
                    )
            except Exception:
                pass

    # Grant login to this device and lock the seat
    new_token = str(uuid.uuid4())
    db.save_active_session(email, new_token, device_name)

    user_info = {
        "id": account["id"],
        "name": account["name"],
        "role": account["role"],
        "assignedBranch": account["assignedBranch"],
        "email": account["email"]
    }
    return {
        "success": True,
        "user": user_info,
        "sessionToken": new_token
    }

@app.post("/api/auth/heartbeat")
def auth_heartbeat(payload: Dict[str, Any] = Body(...)):
    email = payload.get("email", "").lower().strip()
    token = payload.get("sessionToken", "").strip()
    if not email or not token:
        return {"valid": False, "reason": "missing_credentials"}

    current = db.get_active_session(email)
    if not current or not current.get("is_active"):
        return {"valid": False, "reason": "session_inactive"}

    if current.get("session_token") != token:
        return {"valid": False, "reason": "superseded_or_locked"}

    db.update_session_heartbeat(email, token)
    return {"valid": True}

@app.post("/api/auth/logout")
def auth_logout(payload: Dict[str, Any] = Body(...)):
    email = payload.get("email", "").lower().strip()
    token = payload.get("sessionToken", "").strip()
    current = db.get_active_session(email)
    if current and current.get("session_token") == token:
        db.clear_session(email)
    return {"success": True}

@app.post("/api/auth/admin-force-unlock")
def admin_force_unlock(payload: Dict[str, Any] = Body(...)):
    """Allows Owner/Admin to unlock any branch if tablet was shut down without logging out."""
    email = payload.get("email", "").lower().strip()
    db.clear_session(email)
    return {"success": True, "message": f"Session lock successfully released for {email}"}

@app.get("/api/auth/sessions")
def get_all_sessions():
    """Returns all session statuses for Owner administration overview."""
    sessions = db.get_all_active_sessions()
    now_dt = datetime.now(timezone.utc)
    results = []
    for s in sessions:
        is_live = False
        last_hb = s.get("last_heartbeat")
        if last_hb and s.get("is_active"):
            try:
                hb_dt = datetime.fromisoformat(str(last_hb).replace("Z", "+00:00"))
                if (now_dt - hb_dt).total_seconds() < 90:
                    is_live = True
            except Exception:
                pass
        results.append({
            "email": s.get("email"),
            "deviceName": s.get("device_name"),
            "isActive": is_live,
            "lastHeartbeat": last_hb
        })
    return {"sessions": results}

# ----------------- STANDARD LAUNDRYLAB ENDPOINTS -----------------

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
        branches = [
            {"name": "Absa Towers", "address": "Ground Floor, Absa Towers Main", "machines_count": 4, "operator": "Nokulunga"},
            {"name": "Zuri", "address": "Ground Floor, Zuri Towers", "machines_count": 4, "operator": "Ntombi"},
            {"name": "Nala", "address": "Ground Floor, Nala Suites", "machines_count": 4, "operator": "Nokulunga"},
            {"name": "The Encore", "address": "Ground Floor, The Encore Plaza", "machines_count": 4, "operator": "Smiso"},
            {"name": "Georgia", "address": "Ground Floor, Georgia House", "machines_count": 4, "operator": "Unassigned"},
            {"name": "Centurion", "address": "Ground Floor, Centurion Center", "machines_count": 4, "operator": "Unassigned"},
        ]
    return {"branches": branches}

@app.get("/api/state")
def get_state():
    return get_current_state_from_db()

@app.post("/api/state")
def update_state(payload: Dict[str, Any] = Body(...)):
    if "orders" in payload and isinstance(payload["orders"], list):
        # Fetch current DB state to prevent stale client snapshots from regressing verified or rejected payment statuses
        existing_orders = {str(o.get("id")): o for o in db.fetch_orders()}
        merged_orders = []
        for incoming in payload["orders"]:
            inc_id = str(incoming.get("id"))
            existing = existing_orders.get(inc_id)
            if existing:
                # Deep merge with existing order so partial payloads never blank out fields
                merged = dict(existing)
                for k, v in incoming.items():
                    if v is not None and v != "":
                        merged[k] = v
                db_status = str(existing.get("paymentStatus") or "")
                inc_status = str(incoming.get("paymentStatus") or "")
                # If DB has Rejected or Verified, never let a stale client regress it to pending or unpaid
                if ("Rejected" in db_status or "Verified" in db_status) and inc_status != db_status:
                    merged["paymentStatus"] = existing.get("paymentStatus")
                    merged["proofOfPayment"] = existing.get("proofOfPayment")
                merged_orders.append(merged)
            else:
                merged_orders.append(incoming)
        db.upsert_orders(merged_orders)

    if "machines" in payload and isinstance(payload["machines"], dict):
        db.update_machines(payload["machines"])

    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass

    return {"success": True, "ordersCount": len(payload.get("orders", []))}

@app.post("/api/orders")
def create_order(payload: Dict[str, Any] = Body(...)):
    db.upsert_orders([payload])
    return {"success": True, "order": payload}

@app.patch("/api/orders/{order_id}")
def update_order(order_id: str, payload: Dict[str, Any] = Body(...)):
    clean_id = str(order_id).strip().replace(" ", "").replace("#", "")
    orders = db.fetch_orders()
    target_order = None
    for o in orders:
        if str(o.get("id")) == clean_id:
            target_order = o
            break
    if not target_order:
        raise HTTPException(status_code=404, detail="Order not found")
    target_order.update(payload)
    db.upsert_orders([target_order])
    return {"success": True, "order": target_order}

@app.post("/api/machines")
def save_machines(payload: Dict[str, Any] = Body(...)):
    db.update_machines(payload)
    return {"success": True}

@app.get("/api/orders", response_model=List[Dict])
def get_orders(branch: Optional[str] = None):
    return db.fetch_orders(branch=branch)

@app.get("/api/orders/{order_id}")
def get_order(order_id: str):
    clean_id = str(order_id).strip().replace(" ", "").replace("#", "")
    orders = db.fetch_orders()
    for o in orders:
        o_id = str(o.get("id", "")).strip().replace(" ", "").replace("#", "")
        o_phone = str(o.get("customerPhone", "")).strip().replace(" ", "")
        if o_id == clean_id or (clean_id and o_phone.endswith(clean_id[-9:])):
            return o
    raise HTTPException(status_code=404, detail="Order not found")

@app.post("/api/orders/{order_id}/pop")
def submit_order_pop(order_id: str, payload: Dict[str, Any] = Body(...)):
    clean_id = str(order_id).strip().replace(" ", "").replace("#", "")
    orders = db.fetch_orders()
    target_order = None
    for o in orders:
        if str(o.get("id")) == clean_id:
            target_order = o
            break

    if not target_order:
        raise HTTPException(status_code=404, detail="Order not found")

    pop_data = {
        "fileData": payload.get("fileData"),
        "fileName": payload.get("fileName", "receipt.png"),
        "uploadedAt": payload.get("uploadedAt", datetime.now().strftime("%H:%M")),
        "reference": payload.get("reference", ""),
        "paymentChannel": payload.get("paymentChannel", "Nedbank EFT"),
        "verified": False
    }

    target_order["paymentStatus"] = "POP Uploaded (Pending Verification)"
    target_order["paymentMethod"] = "Pay Later (EFT / PayShap / Proof of Payment)"
    target_order["proofOfPayment"] = pop_data

    # Persist updated order to Supabase
    db.upsert_orders([target_order])
    return {"success": True, "order": target_order}

@app.post("/api/orders/{order_id}/verify")
def verify_order_pop(order_id: str, payload: Dict[str, Any] = Body(...)):
    clean_id = str(order_id).strip().replace(" ", "").replace("#", "")
    orders = db.fetch_orders()
    target_order = None
    for o in orders:
        if str(o.get("id")) == clean_id:
            target_order = o
            break

    if not target_order:
        raise HTTPException(status_code=404, detail="Order not found")

    verified_by = payload.get("verifiedBy", "Mpho (Owner)")
    now_time = datetime.now().strftime("%H:%M")

    pop = target_order.get("proofOfPayment") or {}
    pop["verified"] = True
    pop["verifiedAt"] = now_time
    pop["verifiedBy"] = verified_by
    pop["rejected"] = False

    target_order["paymentStatus"] = "Paid (EFT/PayShap Verified)"
    target_order["proofOfPayment"] = pop

    db.upsert_orders([target_order])
    return {"success": True, "order": target_order}

@app.post("/api/orders/{order_id}/reject")
def reject_order_pop(order_id: str, payload: Dict[str, Any] = Body(...)):
    clean_id = str(order_id).strip().replace(" ", "").replace("#", "")
    orders = db.fetch_orders()
    target_order = None
    for o in orders:
        if str(o.get("id")) == clean_id:
            target_order = o
            break

    if not target_order:
        raise HTTPException(status_code=404, detail="Order not found")

    reason = payload.get("reason", "Receipt reference not matching statement or incorrect amount.")
    rejected_by = payload.get("rejectedBy", "Mpho (Owner)")
    now_time = datetime.now().strftime("%H:%M")

    pop = target_order.get("proofOfPayment") or {}
    pop["rejected"] = True
    pop["rejectionReason"] = reason
    pop["rejectedAt"] = now_time
    pop["rejectedBy"] = rejected_by
    pop["verified"] = False

    target_order["paymentStatus"] = "POP Rejected (Re-upload Required)"
    target_order["proofOfPayment"] = pop

    db.upsert_orders([target_order])
    return {"success": True, "order": target_order}

@app.post("/api/shift_reconciliations")
def save_shift_reconciliation(payload: Dict[str, Any] = Body(...)):
    ok = db.create_reconciliation(payload)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save shift reconciliation to database")
    return {"success": True}
