import os
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://cmujeaptbinntqqffkny.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def get_supabase_headers(upsert: bool = False) -> Dict[str, str]:
    headers = dict(HEADERS)
    if upsert:
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    return headers

def fetch_branches() -> List[Dict[str, Any]]:
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/branches?select=*", headers=HEADERS, timeout=8)
        if r.status_code == 200:
            branches = r.json()
            return [
                {
                    "name": b["name"],
                    "address": b["address"],
                    "machines_count": b.get("machines_count", 4),
                    "operator": b.get("operator_name", "Operator")
                }
                for b in branches
            ]
    except Exception as e:
        print(f"Error fetching branches from Supabase: {e}")
    return []

def fetch_machines_by_branch() -> Dict[str, List[Dict[str, Any]]]:
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/machines?select=*&order=code.asc", headers=HEADERS, timeout=8)
        if r.status_code == 200:
            machines = r.json()
            result: Dict[str, List[Dict[str, Any]]] = {}
            for m in machines:
                branch = m["branch_name"]
                if branch not in result:
                    result[branch] = []
                result[branch].append({
                    "id": m["id"],
                    "code": m["code"],
                    "type": m.get("type", "Washing Machine"),
                    "capacity": m.get("capacity", "10kg"),
                    "status": m.get("status", "Available"),
                    "currentOrderId": m.get("current_order_id"),
                    "timeRemainingMinutes": m.get("time_remaining_minutes")
                })
            return result
    except Exception as e:
        print(f"Error fetching machines from Supabase: {e}")
    return {}

def fetch_orders(branch: Optional[str] = None) -> List[Dict[str, Any]]:
    try:
        url = f"{SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc"
        if branch:
            url += f"&branch=eq.{branch}"
        r = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code == 200:
            rows = r.json()
            return [
                {
                    "id": str(row.get("id")),
                    "timestamp": row.get("timestamp") or "",
                    "branch": row.get("branch"),
                    "staffName": row.get("staff_name") or "",
                    "machineCode": row.get("machine_code") or "",
                    "customerName": row.get("customer_name") or "",
                    "customerPhone": row.get("customer_phone") or "",
                    "unitNumber": row.get("unit_number"),
                    "serviceName": row.get("service_name") or "",
                    "ratePerUnit": float(row.get("rate_per_unit") or 0),
                    "weightOrQty": float(row.get("weight_or_qty") or 0),
                    "unit": row.get("unit") or "kg",
                    "itemsBreakdown": row.get("items_breakdown") or {},
                    "totalItemCount": int(row.get("total_item_count") or 0),
                    "itemsReturned": int(row.get("items_returned") or 0),
                    "paymentMethod": row.get("payment_method") or "",
                    "paymentStatus": row.get("payment_status") or "",
                    "amount": float(row.get("amount") or 0),
                    "status": row.get("status") or "Awaiting Start",
                    "customerSignedOff": bool(row.get("customer_signed_off")),
                    "signedOffAt": row.get("signed_off_at"),
                    "smsSent": bool(row.get("sms_sent")),
                    "startedAt": row.get("started_at"),
                    "durationMinutes": row.get("duration_minutes"),
                    "proofOfPayment": row.get("proof_of_payment")
                }
                for row in rows
            ]
    except Exception as e:
        print(f"Error fetching orders from Supabase: {e}")
    return []

def upsert_orders(orders: List[Dict[str, Any]]) -> bool:
    if not orders:
        return True
    try:
        payload = []
        for o in orders:
            payload.append({
                "id": str(o.get("id")),
                "timestamp": o.get("timestamp") or "",
                "branch": o.get("branch"),
                "staff_name": o.get("staffName") or o.get("staff_name") or "",
                "machine_code": o.get("machineCode") or o.get("machine_code") or "",
                "customer_name": o.get("customerName") or o.get("customer_name") or "",
                "customer_phone": o.get("customerPhone") or o.get("customer_phone") or "",
                "unit_number": o.get("unitNumber") or o.get("unit_number"),
                "service_name": o.get("serviceName") or o.get("service_name") or "",
                "rate_per_unit": float(o.get("ratePerUnit") or o.get("rate_per_unit") or 0),
                "weight_or_qty": float(o.get("weightOrQty") or o.get("weight_or_qty") or 0),
                "unit": o.get("unit") or "kg",
                "items_breakdown": o.get("itemsBreakdown") or o.get("items_breakdown") or {},
                "total_item_count": int(o.get("totalItemCount") or o.get("total_item_count") or 0),
                "items_returned": int(o.get("itemsReturned") or o.get("items_returned") or 0),
                "payment_method": o.get("paymentMethod") or o.get("payment_method") or "",
                "payment_status": o.get("paymentStatus") or o.get("payment_status") or "",
                "amount": float(o.get("amount") or 0),
                "status": o.get("status") or "Awaiting Start",
                "customer_signed_off": bool(o.get("customerSignedOff") or o.get("customer_signed_off") or False),
                "signed_off_at": o.get("signedOffAt") or o.get("signed_off_at"),
                "sms_sent": bool(o.get("smsSent") or o.get("sms_sent") or False),
                "started_at": o.get("startedAt") or o.get("started_at"),
                "duration_minutes": o.get("durationMinutes") or o.get("duration_minutes"),
                "proof_of_payment": o.get("proofOfPayment") or o.get("proof_of_payment")
            })
        
        headers = get_supabase_headers(upsert=True)
        r = requests.post(f"{SUPABASE_URL}/rest/v1/orders", headers=headers, json=payload, timeout=8)
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"Error upserting orders to Supabase: {e}")
        return False

def update_machines(machines_dict: Dict[str, List[Dict[str, Any]]]) -> bool:
    if not machines_dict:
        return True
    try:
        payload = []
        for branch_name, machine_list in machines_dict.items():
            for m in machine_list:
                payload.append({
                    "id": m.get("id"),
                    "branch_name": branch_name,
                    "code": m.get("code"),
                    "type": m.get("type", "Washing Machine"),
                    "capacity": m.get("capacity", "10kg"),
                    "status": m.get("status", "Available"),
                    "current_order_id": m.get("currentOrderId") or m.get("current_order_id"),
                    "time_remaining_minutes": m.get("timeRemainingMinutes") or m.get("time_remaining_minutes")
                })
        
        headers = get_supabase_headers(upsert=True)
        r = requests.post(f"{SUPABASE_URL}/rest/v1/machines", headers=headers, json=payload, timeout=8)
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"Error updating machines to Supabase: {e}")
        return False

def create_reconciliation(rec: Dict[str, Any]) -> bool:
    try:
        headers = get_supabase_headers(upsert=False)
        payload = {
            "branch": rec.get("branch"),
            "operator_name": rec.get("operatorName") or rec.get("operator_name") or "Operator",
            "speedpoint_cash_total": float(rec.get("speedpointCashTotal") or rec.get("speedpoint_cash_total") or 0),
            "eft_payshap_total": float(rec.get("eftPayshapTotal") or rec.get("eft_payshap_total") or 0),
            "pending_total": float(rec.get("pendingTotal") or rec.get("pending_total") or 0),
            "orders_count": int(rec.get("ordersCount") or rec.get("orders_count") or 0),
            "notes": rec.get("notes") or ""
        }
        r = requests.post(f"{SUPABASE_URL}/rest/v1/shift_reconciliations", headers=headers, json=payload, timeout=8)
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"Error creating reconciliation in Supabase: {e}")
        return False

# In-memory session fallback cache
IN_MEMORY_SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_active_session(email: str) -> Optional[Dict[str, Any]]:
    clean_email = email.lower().strip()
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/user_sessions?email=eq.{clean_email}&select=*", headers=HEADERS, timeout=5)
        if r.status_code == 200:
            rows = r.json()
            if rows:
                row = rows[0]
                return {
                    "email": row["email"],
                    "session_token": row["session_token"],
                    "device_name": row.get("device_name", "Unknown Device"),
                    "is_active": bool(row.get("is_active", True)),
                    "last_heartbeat": row.get("last_heartbeat")
                }
    except Exception as e:
        pass
    return IN_MEMORY_SESSIONS.get(clean_email)

def save_active_session(email: str, session_token: str, device_name: str) -> bool:
    from datetime import datetime, timezone
    clean_email = email.lower().strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    session_data = {
        "email": clean_email,
        "session_token": session_token,
        "device_name": device_name or "Station Device",
        "is_active": True,
        "last_heartbeat": now_iso
    }
    IN_MEMORY_SESSIONS[clean_email] = session_data

    try:
        headers = get_supabase_headers(upsert=True)
        r = requests.post(f"{SUPABASE_URL}/rest/v1/user_sessions", headers=headers, json=session_data, timeout=5)
        return r.status_code in (200, 201)
    except Exception as e:
        return True

def update_session_heartbeat(email: str, session_token: str) -> bool:
    from datetime import datetime, timezone
    clean_email = email.lower().strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    if clean_email in IN_MEMORY_SESSIONS:
        if IN_MEMORY_SESSIONS[clean_email]["session_token"] == session_token:
            IN_MEMORY_SESSIONS[clean_email]["last_heartbeat"] = now_iso
            IN_MEMORY_SESSIONS[clean_email]["is_active"] = True

    try:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/user_sessions?email=eq.{clean_email}&session_token=eq.{session_token}",
            headers=HEADERS,
            json={"last_heartbeat": now_iso, "is_active": True},
            timeout=5
        )
        return r.status_code in (200, 204)
    except Exception:
        return True

def clear_session(email: str) -> bool:
    clean_email = email.lower().strip()
    if clean_email in IN_MEMORY_SESSIONS:
        IN_MEMORY_SESSIONS[clean_email]["is_active"] = False

    try:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/user_sessions?email=eq.{clean_email}",
            headers=HEADERS,
            json={"is_active": False},
            timeout=5
        )
        return r.status_code in (200, 204)
    except Exception:
        return True

def get_all_active_sessions() -> List[Dict[str, Any]]:
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/user_sessions?select=*", headers=HEADERS, timeout=5)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return list(IN_MEMORY_SESSIONS.values())

