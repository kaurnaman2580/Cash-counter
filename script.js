const BACKEND_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:5000"
  : "https://your-deployed-backend-url.com";

let operator = "";
let cashTotal = 0;
let denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
let cashRegister = {};
let history = [];

denominations.forEach(d => cashRegister[d] = 0);

async function login(name) {
  operator = name;
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("operatorName").innerText = name;

  try {
    const res = await fetch(`${BACKEND_URL}/api/state?operator=${encodeURIComponent(name)}`);
    const data = await res.json();
    cashTotal = data.cashTotal || 0;
    history = data.history || [];
    document.getElementById("cashTotal").innerText = cashTotal;
  } catch (err) {
    console.warn("Backend not available. Using localStorage fallback.");
    const savedCash = localStorage.getItem("cashTotal");
    if (savedCash) {
      cashTotal = parseInt(savedCash);
      document.getElementById("cashTotal").innerText = cashTotal;
    }
    const storedHistory = localStorage.getItem("transactionHistory");
    history = storedHistory ? JSON.parse(storedHistory) : [];
  }

  renderDenominationInputs();
  updateSummary();
}

function renderDenominationInputs() {
  let inDiv = document.getElementById("notesIn");
  let outDiv = document.getElementById("notesOut");
  inDiv.innerHTML = "";
  outDiv.innerHTML = "";

  denominations.forEach(denom => {
    inDiv.innerHTML += `<label>₹${denom}: <input type="number" id="in_${denom}" value="0" /></label>`;
    outDiv.innerHTML += `<label>₹${denom}: <input type="number" id="out_${denom}" value="0" /></label>`;
  });
}

function updateInitialCash() {
  let val = parseInt(document.getElementById("initialCash").value);
  if (!isNaN(val)) {
    cashTotal = val;
    document.getElementById("cashTotal").innerText = cashTotal;
    localStorage.setItem("cashTotal", cashTotal);
    // Optionally sync with backend here if needed
  }
}

async function submitTransaction() {
  let amt = parseInt(document.getElementById("amount").value);
  let type = document.getElementById("type").value;
  let reason = document.getElementById("reason").value;

  if (isNaN(amt) || !reason.trim()) {
    alert("Enter valid amount and reason.");
    return;
  }

  const previousBalance = cashTotal;
  if (type === "in") cashTotal += amt;
  else cashTotal -= amt;

  document.getElementById("cashTotal").innerText = cashTotal;
  localStorage.setItem("cashTotal", cashTotal);

  denominations.forEach(denom => {
    let added = parseInt(document.getElementById(`in_${denom}`).value) || 0;
    let removed = parseInt(document.getElementById(`out_${denom}`).value) || 0;
    cashRegister[denom] += added;
    cashRegister[denom] -= removed;
  });

  const transaction = {
    operator,
    type,
    amount: amt,
    reason,
    previousBalance,
    newBalance: cashTotal,
    timestamp: new Date().toLocaleString()
  };

  history.push(transaction);
  localStorage.setItem("transactionHistory", JSON.stringify(history));

  try {
    await fetch(`${BACKEND_URL}/api/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(transaction)
    });
  } catch (err) {
    console.warn("Failed to sync with backend:", err);
  }

  updateSummary();
  document.getElementById("amount").value = "";
  document.getElementById("reason").value = "";
  renderDenominationInputs();
}

function updateSummary() {
  let ul = document.getElementById("cashBreakdown");
  ul.innerHTML = "";
  denominations.forEach(denom => {
    ul.innerHTML += `<li>₹${denom}: ${cashRegister[denom]} notes</li>`;
  });
}

function showHistory() {
  const container = document.getElementById("history");
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  if (history.length === 0) {
    list.innerHTML = "<li>No transactions recorded yet.</li>";
  } else {
    history.forEach(txn => {
      list.innerHTML += `
        <li>
          [${txn.timestamp}] ${txn.operator} → ₹${txn.amount} (${txn.type.toUpperCase()})
          <br>Reason: ${txn.reason}
          <br>From ₹${txn.previousBalance} → ₹${txn.newBalance}
        </li><hr>`;
    });
  }

  container.style.display = "block";
}

function resetApp() {
  location.reload();
}
