/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const useWebSearchEl = document.getElementById("useWebSearch");
const generateBtn = document.getElementById("generateRoutine");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionsBtn = document.getElementById("clearSelections");
const rtlToggle = document.getElementById("rtlToggle");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Local state */
let allProducts = [];
let selectedIds = new Set();
let convo = [];

/* LocalStorage helpers */
const STORAGE_KEY = "loreal_selected_products_v1";
function loadSelectionsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch (_) {
    return new Set();
  }
}
function saveSelectionsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedIds]));
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `<div class="placeholder-message">No products found.</div>`;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedIds.has(product.id);
      return `
      <div class="product-card ${isSelected ? "selected" : ""}" data-id="${
        product.id
      }">
        <span class="select-badge">Selected</span>
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
          <div class="controls">
            <button class="btn btn-secondary toggle-select" aria-pressed="${isSelected}">${
        isSelected ? "Unselect" : "Select"
      }</button>
            <button class="btn btn-ghost toggle-details" aria-expanded="false">Details</button>
          </div>
          <div class="details" hidden>
            ${product.description}
          </div>
        </div>
      </div>`;
    })
    .join("");

  /* Add listeners after render */
  document.querySelectorAll(".toggle-select").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = e.target.closest(".product-card");
      const id = Number(card.dataset.id);
      toggleSelection(id);
      /* Update UI without reloading the entire dataset unnecessarily */
      render();
    });
  });

  document.querySelectorAll(".toggle-details").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = e.target.closest(".product-card");
      const details = card.querySelector(".details");
      const expanded = card.classList.toggle("expanded");
      details.hidden = !expanded;
      e.target.setAttribute("aria-expanded", String(expanded));
      e.target.textContent = expanded ? "Hide Details" : "Details";
    });
  });

  /* Enable full-card click to toggle selection (excluding controls) */
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // If click originated from a control button, ignore (handled above)
      if (e.target.closest(".controls")) return;
      const id = Number(card.dataset.id);
      toggleSelection(id);
      render();
    });
  });
}

/* Filtering helpers */
function getFilteredProducts() {
  const cat = categoryFilter.value || "";
  const q = (productSearch?.value || "").toLowerCase().trim();
  return allProducts.filter((p) => {
    const catOk = cat ? p.category === cat : true;
    const qOk = q
      ? `${p.name} ${p.brand} ${p.category} ${p.description}`
          .toLowerCase()
          .includes(q)
      : true;
    return catOk && qOk;
  });
}

function render() {
  displayProducts(getFilteredProducts());
  renderSelectedList();
}

/* Category and search events */
categoryFilter.addEventListener("change", () => render());
if (productSearch) {
  productSearch.addEventListener("input", () => render());
}

/* Selected list rendering */
function renderSelectedList() {
  const items = allProducts.filter((p) => selectedIds.has(p.id));
  if (!items.length) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">Your selected products will appear here.</div>`;
    return;
  }
  selectedProductsList.innerHTML = items
    .map(
      (p) => `
      <span class="chip" data-id="${p.id}">
        <strong>${p.name}</strong>
        <button class="remove-chip" title="Remove ${p.name}" aria-label="Remove ${p.name}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </span>`
    )
    .join("");

  document.querySelectorAll(".remove-chip").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      const id = Number(chip.dataset.id);
      selectedIds.delete(id);
      saveSelectionsToStorage();
      render();
    });
  });
}

function toggleSelection(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  saveSelectionsToStorage();
}

/* Clear all selections */
if (clearSelectionsBtn) {
  clearSelectionsBtn.addEventListener("click", () => {
    selectedIds.clear();
    saveSelectionsToStorage();
    render();
  });
}

/* RTL toggle */
if (rtlToggle) {
  const storedDir = localStorage.getItem("loreal_dir");
  if (storedDir) document.documentElement.setAttribute("dir", storedDir);
  rtlToggle.setAttribute(
    "aria-pressed",
    String(document.documentElement.getAttribute("dir") === "rtl")
  );
  rtlToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("dir") === "rtl";
    const next = current ? "ltr" : "rtl";
    document.documentElement.setAttribute("dir", next);
    rtlToggle.setAttribute("aria-pressed", String(next === "rtl"));
    localStorage.setItem("loreal_dir", next);
  });
}

/* Chat helpers */
function appendMessage(role, content) {
  const row = document.createElement("div");
  row.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  row.appendChild(bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setTyping(on) {
  let t = chatWindow.querySelector(".typing");
  if (on && !t) {
    t = document.createElement("div");
    t.className = "typing";
    t.textContent = "Assistant is typing…";
    chatWindow.appendChild(t);
  } else if (!on && t) {
    t.remove();
  }
}

/* API call to Cloudflare Worker (or local proxy) */
async function askAssistant(userText, selectedProductsPayload) {
  // Determine worker URL from secrets.js override or fallback
  const WORKER_URL =
    (window.SEARCH_CONFIG && window.SEARCH_CONFIG.WORKER_URL) ||
    (window.SECRETS && window.SECRETS.WORKER_URL) ||
    "";
  if (!WORKER_URL) {
    throw new Error(
      'Worker URL not configured. Create secrets.js with window.SECRETS.WORKER_URL = "https://your-worker.workers.dev"'
    );
  }

  // We follow the student policy: use messages param and check choices[0].message.content
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor for L’Oréal brands. Keep advice concise and safe. If asked about unrelated topics, politely redirect to skincare, haircare, makeup, fragrance, and related areas.",
    },
    ...convo,
    { role: "user", content: userText },
  ];

  // Include selected products context in a separate field the worker can inject as a system or tool message
  const body = {
    messages,
    selected: selectedProductsPayload || [],
    enableWebSearch: !!(useWebSearchEl && useWebSearchEl.checked),
  };

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;
  if (!content) throw new Error("Invalid response from worker.");
  return content;
}

/* Generate routine */
if (generateBtn) {
  generateBtn.addEventListener("click", async () => {
    const items = allProducts.filter((p) => selectedIds.has(p.id));
    if (!items.length) {
      appendMessage(
        "assistant",
        "Please select at least one product to generate a routine."
      );
      return;
    }
    const payload = items.map(({ id, name, brand, category, description }) => ({
      id,
      name,
      brand,
      category,
      description,
    }));
    const prompt = `Create a short, step-by-step routine using my selected products. Explain morning vs night if helpful, order the steps, and add 1-2 safety tips.`;
    appendMessage("user", "Generate a routine for my selected products.");
    setTyping(true);
    try {
      const answer = await askAssistant(prompt, payload);
      convo.push({ role: "user", content: prompt });
      convo.push({ role: "assistant", content: answer });
      appendMessage("assistant", answer);
    } catch (err) {
      appendMessage("assistant", String(err.message || err));
    } finally {
      setTyping(false);
    }
  });
}

/* Follow-up chat */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;
  appendMessage("user", text);
  input.value = "";
  setTyping(true);
  try {
    // Guardrails: we only allow related topics
    const allowed =
      /(skin|hair|makeup|fragrance|routine|sunscreen|cleanser|moistur|retinol|vitamin|serum|mask|toner|shampoo|conditioner|styling|acne|spf|oil|dry|oily|sensitive)/i;
    if (!allowed.test(text)) {
      const msg =
        "I can help with skincare, haircare, makeup, fragrance, and product routines. Try asking about those topics!";
      convo.push({ role: "assistant", content: msg });
      appendMessage("assistant", msg);
      return;
    }
    const items = allProducts.filter((p) => selectedIds.has(p.id));
    const payload = items.map(({ id, name, brand, category, description }) => ({
      id,
      name,
      brand,
      category,
      description,
    }));
    const answer = await askAssistant(text, payload);
    convo.push({ role: "user", content: text });
    convo.push({ role: "assistant", content: answer });
    appendMessage("assistant", answer);
  } catch (err) {
    appendMessage("assistant", String(err.message || err));
  } finally {
    setTyping(false);
  }
});

/* Bootstrap */
(async function init() {
  try {
    allProducts = await loadProducts();
  } catch (e) {
    console.error("Failed to load products.json", e);
    productsContainer.innerHTML = `<div class="placeholder-message">Could not load products. Please refresh.</div>`;
    return;
  }
  selectedIds = loadSelectionsFromStorage();
  render();
})();
