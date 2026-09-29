/* ==========================================================================
   LAUNDRYLAB - Interactive Platform Logic (Refined SMS Link Workflow)
   ========================================================================== */

const USERS = [
    { id: "u101", name: "Jane Doe", role: "Branch Operator", branch: "Ground Floor - Horizon Towers" },
    { id: "u102", name: "Mike Ross", role: "Branch Operator", branch: "Ground Floor - Campus View" },
    { id: "u103", name: "Sarah Connor", role: "Branch Supervisor", branch: "Ground Floor - Metro Suites" },
    { id: "admin", name: "David Vance (Owner)", role: "Super Admin", branch: "All Branches" }
];

const LAUNDRYLAB_RATES = {
    "Wash, Dry & Iron": { rate: 36, unit: "kg" },
    "Wash, Dry & Fold": { rate: 35, unit: "kg" },
    "Iron Only": { rate: 33, unit: "kg" },
    "Wash Only": { rate: 30, unit: "kg" },
    "Dry Only": { rate: 30, unit: "kg" },
    "Carpet Cleaning": { rate: 60, unit: "kg" },
    "Curtain Cleaning": { rate: 80, unit: "kg" },
    "Blanket Cleaning": { rate: 80, unit: "kg" },
    "Sneaker Wash": { rate: 80, unit: "pair" }
};


const defaultState = {
    currentUser: USERS[0],
    selectedBuilding: "Ground Floor - Horizon Towers",
    selectedMachine: "W-01",
    selectedMachineCapacity: "8kg",
    selectedService: "Wash, Dry & Fold",
    weightKg: 4.5,
    
    orders: [
        {
            id: "1081",
            timestamp: "09:15 AM",
            building: "Ground Floor - Horizon Towers",
            staffName: "Jane Doe",
            machine: "W-01",
            customer: "John Miller (067 555 0192)",
            serviceName: "Wash, Dry & Fold",
            categoriesSummary: "4.5 kg Wash, Dry & Fold",
            totalItemCount: 8,
            itemsReturned: 8,
            paymentType: "Speed Point (Card POS)",
            amount: 112.50,
            status: "In Progress"
        },
        {
            id: "1082",
            timestamp: "10:05 AM",
            building: "Ground Floor - Horizon Towers",
            staffName: "Jane Doe",
            machine: "W-02",
            customer: "Sarah K. (067 888 2341)",
            serviceName: "Sneaker Wash",
            categoriesSummary: "2 Pairs Sneaker Wash",
            totalItemCount: 2,
            itemsReturned: 2,
            paymentType: "Online (SMS Link)",
            amount: 160.00,
            status: "Awaiting Start"
        },
        {
            id: "1083",
            timestamp: "10:30 AM",
            building: "Ground Floor - Campus View",
            staffName: "Mike Ross",
            machine: "W-03",
            customer: "David B.",
            serviceName: "Blanket Cleaning",
            categoriesSummary: "3.0 kg Blanket Cleaning",
            totalItemCount: 1,
            itemsReturned: 1,
            paymentType: "Speed Point (Card POS)",
            amount: 210.00,
            status: "Completed"
        }
    ]
};

let appState = JSON.parse(localStorage.getItem("laundrylab_state")) || defaultState;

function saveState() {
    localStorage.setItem("laundrylab_state", JSON.stringify(appState));
    updateStaffBadge();
    updateShiftTotals();
    renderStaffIntakeList();
    renderStaffFloorMap();
    renderStaffReturnsList();
    renderAdminLedger();
    renderMultiBuildingCards();
}

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    saveState();
});

function setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".view-section");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            navButtons.forEach(b => b.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            btn.classList.add("active");
            const targetId = btn.getAttribute("data-target");
            document.getElementById(targetId).classList.add("active");
        });
    });

    const bldgSelect = document.getElementById("building-select");
    bldgSelect.addEventListener("change", (e) => {
        appState.selectedBuilding = e.target.value;
        saveState();
        showToast(`Switched location to ${appState.selectedBuilding}`);
    });
}

function switchCustomerSubTab(subTabId) {
    document.getElementById("cust-subtab-pay").classList.remove("active");
    document.getElementById("cust-subtab-track").classList.remove("active");
    document.getElementById("btn-cust-pay").classList.remove("active");
    document.getElementById("btn-cust-track").classList.remove("active");

    if (subTabId === 'pay') {
        document.getElementById("cust-subtab-pay").classList.add("active");
        document.getElementById("btn-cust-pay").classList.add("active");
    } else {
        document.getElementById("cust-subtab-track").classList.add("active");
        document.getElementById("btn-cust-track").classList.add("active");
        startCountdownTimer(35 * 60);
    }
}

function processCustomerPayment() {
    showToast("Online Payment Successful via SMS Link!");
    switchCustomerSubTab('track');
}

let countdownInterval;
function startCountdownTimer(durationSeconds) {
    clearInterval(countdownInterval);
    let timer = durationSeconds;
    const display = document.getElementById("countdown-timer");

    countdownInterval = setInterval(() => {
        const minutes = parseInt(timer / 60, 10);
        const seconds = parseInt(timer % 60, 10);
        display.textContent = `${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
        if (--timer < 0) {
            clearInterval(countdownInterval);
            display.textContent = "00:00 - COMPLETED";
        }
    }, 1000);
}

function switchStaffTab(tabId) {
    document.querySelectorAll(".staff-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".staff-tab-content").forEach(content => content.classList.remove("active"));

    event.currentTarget.classList.add("active");
    document.getElementById(tabId).classList.add("active");
}

function renderStaffIntakeList() {
    const listContainer = document.getElementById("staff-intake-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const branchOrders = appState.orders.filter(o => o.building === appState.selectedBuilding);

    if (branchOrders.length === 0) {
        listContainer.innerHTML = `<p style="color: var(--text-muted); padding: 20px; text-align: center;">No orders recorded for ${appState.selectedBuilding} today.</p>`;
        return;
    }

    branchOrders.forEach(order => {
        const item = document.createElement("div");
        item.className = "queue-item";
        
        let statusBadgeClass = "status-paid";
        if (order.status === "In Progress") statusBadgeClass = "status-active";
        if (order.status === "Completed") statusBadgeClass = "status-completed";

        item.innerHTML = `
            <div class="queue-item-info">
                <h4>Order #${order.id} - ${order.serviceName} <span class="status-badge ${statusBadgeClass}">${order.status}</span></h4>
                <p><i class="fa-solid fa-user"></i> ${order.customer} | <strong>Logged by: ${order.staffName}</strong></p>
                <p><i class="fa-solid fa-shirt"></i> Details: <strong>${order.categoriesSummary}</strong> (${order.totalItemCount} items total)</p>
                <p><i class="fa-solid fa-credit-card"></i> ${order.paymentType} - <strong style="color:var(--success);">R${order.amount.toFixed(2)}</strong></p>
            </div>
            <div class="queue-actions">
                ${order.status === "Awaiting Start" ? `<button class="btn btn-primary" onclick="updateOrderStatus('${order.id}', 'In Progress')"><i class="fa-solid fa-play"></i> Start Wash</button>` : ''}
                ${order.status === "In Progress" ? `<button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'Completed')"><i class="fa-solid fa-check"></i> Complete Wash</button>` : ''}
                ${order.status === "Completed" ? `<span style="font-size:12px; color: var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Ready for Pickup</span>` : ''}
            </div>
        `;
        listContainer.appendChild(item);
    });

    document.getElementById("active-washes-count").innerText = branchOrders.filter(o => o.status !== "Handed Over").length;
}

function renderStaffFloorMap() {
    const grid = document.getElementById("staff-floor-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const machines = ["W-01", "W-02", "W-03", "W-04", "D-01", "D-02"];

    machines.forEach(m => {
        const activeOrder = appState.orders.find(o => o.building === appState.selectedBuilding && o.machine === m && o.status !== "Handed Over");
        const card = document.createElement("div");

        let statusClass = "idle";
        let statusText = "Idle / Ready";
        let icon = m.startsWith("W") ? "fa-soap" : "fa-wind";

        if (activeOrder) {
            if (activeOrder.status === "In Progress") {
                statusClass = "running";
                statusText = `Running (#${activeOrder.id})`;
            } else if (activeOrder.status === "Awaiting Start") {
                statusClass = "paid";
                statusText = `Paid (#${activeOrder.id})`;
            }
        }

        card.className = `floor-card ${statusClass}`;
        card.innerHTML = `
            <div class="floor-icon"><i class="fa-solid ${icon}"></i></div>
            <strong>Machine ${m}</strong>
            <small style="display:block; margin-top:4px;">${statusText}</small>
        `;
        grid.appendChild(card);
    });
}

function renderStaffReturnsList() {
    const listContainer = document.getElementById("staff-return-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const readyOrders = appState.orders.filter(o => o.building === appState.selectedBuilding);

    readyOrders.forEach(order => {
        const item = document.createElement("div");
        item.className = "queue-item";
        
        item.innerHTML = `
            <div class="queue-item-info">
                <h4>Order #${order.id} - ${order.customer} (${order.serviceName})</h4>
                <p><i class="fa-solid fa-shirt"></i> Intake Items: <strong>${order.categoriesSummary}</strong></p>
                <p><i class="fa-solid fa-clipboard-check"></i> Total Deposited: <strong>${order.totalItemCount} items</strong> | Payment: ${order.paymentType} (R${order.amount.toFixed(2)})</p>
            </div>
            <div>
                ${order.status === "Handed Over" ? 
                    `<span class="status-badge status-returned"><i class="fa-solid fa-circle-check"></i> Handed Over & 100% Matched</span>` : 
                    `<button class="btn btn-warning" onclick="openReturnModal('${order.id}')"><i class="fa-solid fa-handshake"></i> Verify & Hand Over (${order.totalItemCount} items)</button>`
                }
            </div>
        `;
        listContainer.appendChild(item);
    });
}

let currentReturnOrderId = null;
function openReturnModal(orderId) {
    currentReturnOrderId = orderId;
    const order = appState.orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById("staff-return-modal").style.display = "flex";
    document.getElementById("return-modal-title").innerText = `Order #${order.id} - ${order.customer}`;
    document.getElementById("return-modal-subtitle").innerText = `Verify returning exactly ${order.totalItemCount} items for ${order.serviceName}:`;

    const checklist = document.getElementById("return-checklist-container");
    checklist.innerHTML = `
        <label class="check-item-row">
            <span>👕 Garment Deposit Checklist (${order.totalItemCount} items)</span>
            <input type="checkbox" id="chk-items-all" onchange="checkReturnMatch('${order.id}')">
        </label>
    `;

    document.getElementById("return-match-status").className = "match-status-box match-status-warn";
    document.getElementById("return-match-status").innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Unverified: Check off items given back to customer`;
    document.getElementById("confirm-return-btn").disabled = true;
}

function checkReturnMatch(orderId) {
    const chk = document.getElementById("chk-items-all").checked;
    const statusBox = document.getElementById("return-match-status");
    const confirmBtn = document.getElementById("confirm-return-btn");

    if (chk) {
        statusBox.className = "match-status-box match-status-ok";
        statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> 100% Item Match Confirmed! (Returned Items == Intake Deposit)`;
        confirmBtn.disabled = false;
    } else {
        statusBox.className = "match-status-box match-status-warn";
        statusBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Unverified: All items must be checked off`;
        confirmBtn.disabled = true;
    }
}

function confirmGarmentHandover() {
    if (currentReturnOrderId) {
        const order = appState.orders.find(o => o.id === currentReturnOrderId);
        if (order) {
            order.status = "Handed Over";
            saveState();
            closeReturnModal();
            showToast(`Order #${order.id} Handed Over & 100% Item Match Verified!`);
        }
    }
}

function closeReturnModal() {
    document.getElementById("staff-return-modal").style.display = "none";
}

function openIntakeModal() {
    document.getElementById("staff-intake-modal").style.display = "flex";
    calcModalIntakePrice();
}

function closeIntakeModal() {
    document.getElementById("staff-intake-modal").style.display = "none";
}

function calcModalIntakePrice() {
    const serviceSelect = document.getElementById("modal-intake-service");
    const selectedService = serviceSelect.value;
    const rate = LAUNDRYLAB_RATES[selectedService]?.rate || 25;
    const unit = LAUNDRYLAB_RATES[selectedService]?.unit || "kg";

    const qty = parseFloat(document.getElementById("modal-intake-weight").value) || 1.0;
    const shirts = parseInt(document.getElementById("modal-cnt-shirts").value) || 0;
    const pants = parseInt(document.getElementById("modal-cnt-pants").value) || 0;
    const jackets = parseInt(document.getElementById("modal-cnt-jackets").value) || 0;
    const towels = parseInt(document.getElementById("modal-cnt-towels").value) || 0;

    const totalItems = shirts + pants + jackets + towels;
    const totalPrice = qty * rate;

    document.getElementById("modal-quantity-label").innerText = unit === "pair" ? "Pairs Count" : "Scale Weight (KG)";
    document.getElementById("modal-total-items-disp").innerText = `${totalItems} items`;
    document.getElementById("modal-total-price-disp").innerText = `R${totalPrice.toFixed(2)}`;
}

function saveStaffIntakeOrder() {
    const name = document.getElementById("modal-intake-name").value || "Walk-in Customer";
    const serviceName = document.getElementById("modal-intake-service").value;
    const rate = LAUNDRYLAB_RATES[serviceName]?.rate || 25;
    const unit = LAUNDRYLAB_RATES[serviceName]?.unit || "kg";
    const qty = parseFloat(document.getElementById("modal-intake-weight").value) || 1.0;
    const payMethod = document.getElementById("modal-intake-paymethod").value;
    
    const shirts = parseInt(document.getElementById("modal-cnt-shirts").value) || 0;
    const pants = parseInt(document.getElementById("modal-cnt-pants").value) || 0;
    const jackets = parseInt(document.getElementById("modal-cnt-jackets").value) || 0;
    const towels = parseInt(document.getElementById("modal-cnt-towels").value) || 0;
    const totalItems = shirts + pants + jackets + towels;

    const amount = qty * rate;
    const newOrderId = (1080 + appState.orders.length + 1).toString();

    const newOrder = {
        id: newOrderId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        building: appState.selectedBuilding,
        staffName: appState.currentUser.name,
        machine: "W-01",
        customer: name,
        serviceName: serviceName,
        categoriesSummary: `${qty} ${unit} ${serviceName}`,
        totalItemCount: totalItems,
        itemsReturned: totalItems,
        paymentType: payMethod,
        amount: amount,
        status: "In Progress"
    };

    appState.orders.unshift(newOrder);
    saveState();
    closeIntakeModal();
    
    document.getElementById("sms-order-id").innerText = newOrderId;
    showToast(`📱 SMS Sent to ${name}! Digital Receipt + Online Pay Link + Load Progress Tracker Link dispatched.`);
}

function openReconcileModal() {
    document.getElementById("staff-reconcile-modal").style.display = "flex";
    document.getElementById("recon-bldg-name").innerText = appState.selectedBuilding;

    const bldgOrders = appState.orders.filter(o => o.building === appState.selectedBuilding);
    const speedPointTotal = bldgOrders.filter(o => o.paymentType.includes("Speed Point")).reduce((s, o) => s + o.amount, 0);
    const onlineTotal = bldgOrders.filter(o => o.paymentType.includes("Online")).reduce((s, o) => s + o.amount, 0);
    const accountTotal = bldgOrders.filter(o => o.paymentType.includes("Account")).reduce((s, o) => s + o.amount, 0);

    document.getElementById("recon-speedpoint").innerText = `R${speedPointTotal.toFixed(2)}`;
    document.getElementById("recon-online").innerText = `R${onlineTotal.toFixed(2)}`;
    document.getElementById("recon-account").innerText = `R${accountTotal.toFixed(2)}`;
    document.getElementById("recon-grand-total").innerText = `R${(speedPointTotal + onlineTotal + accountTotal).toFixed(2)}`;
}

function closeReconcileModal() {
    document.getElementById("staff-reconcile-modal").style.display = "none";
}

function submitDayReconciliation() {
    const notes = document.getElementById("recon-notes").value || "Speed Point POS terminal batch verified.";
    closeReconcileModal();
    showToast(`LaundryLab Shift Reconciled & Locked by ${appState.currentUser.name}!`);
}

function updateShiftTotals() {
    const bldgOrders = appState.orders.filter(o => o.building === appState.selectedBuilding);
    const speedPointTotal = bldgOrders.filter(o => o.paymentType.includes("Speed Point")).reduce((s, o) => s + o.amount, 0);
    const onlineTotal = bldgOrders.filter(o => o.paymentType.includes("Online")).reduce((s, o) => s + o.amount, 0);

    const spDisp = document.getElementById("shift-speedpoint-total");
    const onDisp = document.getElementById("shift-online-total");
    if (spDisp) spDisp.innerText = `R${speedPointTotal.toFixed(2)}`;
    if (onDisp) onDisp.innerText = `R${onlineTotal.toFixed(2)}`;
}

function renderMultiBuildingCards() {
    const container = document.getElementById("building-cards-container");
    if (!container) return;
    container.innerHTML = "";

    const buildings = ["Ground Floor - Horizon Towers", "Ground Floor - Campus View", "Ground Floor - Metro Suites"];

    buildings.forEach(bldg => {
        const bldgOrders = appState.orders.filter(o => o.building === bldg);
        const rev = bldgOrders.reduce((sum, o) => sum + o.amount, 0);
        const count = bldgOrders.length;
        const spRev = bldgOrders.filter(o => o.paymentType.includes("Speed Point")).reduce((sum, o) => sum + o.amount, 0);

        const card = document.createElement("div");
        card.className = "bldg-card glass-card";
        card.innerHTML = `
            <h4><i class="fa-solid fa-building"></i> ${bldg}</h4>
            <div class="bldg-stat-row"><span>Today's Cashless Revenue:</span><strong style="color:var(--success);">R${rev.toFixed(2)}</strong></div>
            <div class="bldg-stat-row"><span>Transactions Processed:</span><strong>${count} Loads</strong></div>
            <div class="bldg-stat-row"><span>Speed Point Terminal POS:</span><strong>R${spRev.toFixed(2)}</strong></div>
            <div class="bldg-stat-row"><span>Garment Return Audit:</span><strong style="color:var(--accent-cyan);">100% Reconciled</strong></div>
        `;
        container.appendChild(card);
    });

    const totalRev = appState.orders.reduce((sum, o) => sum + o.amount, 0);
    const spRevTotal = appState.orders.filter(o => o.paymentType.includes("Speed Point")).reduce((sum, o) => sum + o.amount, 0);
    const onlineRevTotal = appState.orders.filter(o => o.paymentType.includes("Online")).reduce((sum, o) => sum + o.amount, 0);
    const totalItems = appState.orders.reduce((sum, o) => sum + o.totalItemCount, 0);

    document.getElementById("stat-total-rev").innerText = `R${totalRev.toFixed(2)}`;
    document.getElementById("stat-speedpoint-rev").innerText = `R${spRevTotal.toFixed(2)}`;
    document.getElementById("stat-online-rev").innerText = `R${onlineRevTotal.toFixed(2)}`;
    document.getElementById("stat-items-balance").innerText = `${totalItems} / ${totalItems} Items`;
}

function renderAdminLedger() {
    const tbody = document.getElementById("admin-ledger-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    appState.orders.forEach(order => {
        const tr = document.createElement("tr");
        let badgeClass = order.status === "Handed Over" ? "status-returned" : (order.status === "In Progress" ? "status-active" : "status-paid");

        tr.innerHTML = `
            <td><strong>#${order.id}</strong></td>
            <td>${order.timestamp}</td>
            <td>${order.building}</td>
            <td>${order.customer} <br/><small style="color:var(--text-muted);">By: ${order.staffName}</small></td>
            <td><strong>${order.serviceName}</strong> <br/><small>${order.categoriesSummary}</small></td>
            <td><strong style="color:var(--success);"><i class="fa-solid fa-circle-check"></i> ${order.itemsReturned} / ${order.totalItemCount} Matched</strong></td>
            <td>${order.paymentType}</td>
            <td><strong style="color: var(--success);">R${order.amount.toFixed(2)}</strong></td>
            <td><span class="status-badge ${badgeClass}">${order.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateOrderStatus(orderId, newStatus) {
    const order = appState.orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        saveState();
        showToast(`Order #${orderId} marked as ${newStatus}`);
    }
}

function updateStaffBadge() {
    const pendingCount = appState.orders.filter(o => o.building === appState.selectedBuilding && o.status === "Awaiting Start").length;
    const badge = document.getElementById("staff-pending-count");
    if (badge) {
        badge.innerText = pendingCount;
        badge.style.display = pendingCount > 0 ? "inline-block" : "none";
    }
}

function filterLedger() {
    const query = document.getElementById("ledger-search").value.toLowerCase();
    const rows = document.querySelectorAll("#admin-ledger-body tr");
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
    });
}

function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Order ID,Timestamp,Branch,Staff Member,Customer,Service Name,Details,Item Match,Payment Channel,Amount (ZAR),Status\n";

    appState.orders.forEach(o => {
        csvContent += `"${o.id}","${o.timestamp}","${o.building}","${o.staffName}","${o.customer}","${o.serviceName}","${o.categoriesSummary}","${o.itemsReturned}/${o.totalItemCount} Matched","${o.paymentType}","R${o.amount}","${o.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LaundryLab_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Downloaded LaundryLab Excel Ledger CSV!");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}
