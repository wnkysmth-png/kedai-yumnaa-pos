(function () {
  "use strict";

  const STATUS = {
    open: "OPEN",
    paid: "PAID"
  };

  const STORAGE_KEYS = {
    cart: "kedai-yumnaa-v1-cart",
    sales: "kedai-yumnaa-v1-sales",
    bills: "kedai-yumnaa-v1-bills",
    activeBillId: "kedai-yumnaa-v1-active-bill-id",
    transactions: "kedai-yumnaa-v1-transactions"
  };

  const currency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });

  const state = {
    activeCategory: "ALL",
    searchTerm: "",
    billSearchTerm: "",
    cart: loadJson(STORAGE_KEYS.cart, []),
    sales: loadJson(STORAGE_KEYS.sales, {}),
    bills: normalizeBills(loadJson(STORAGE_KEYS.bills, [])),
    transactions: loadJson(STORAGE_KEYS.transactions, []),
    activeBillId: localStorage.getItem(STORAGE_KEYS.activeBillId) || "",
    receiptContext: null
  };

  const menuItems = flattenMenu(window.YUMNAA_MENU || []);
  const categories = ["ALL", ...window.YUMNAA_MENU.map((group) => group.category)];

  const els = {
    categoryTabs: document.getElementById("categoryTabs"),
    searchInput: document.getElementById("searchInput"),
    menuGrid: document.getElementById("menuGrid"),
    menuCount: document.getElementById("menuCount"),
    categoryLabel: document.getElementById("categoryLabel"),
    cartItems: document.getElementById("cartItems"),
    cartTotal: document.getElementById("cartTotal"),
    customerName: document.getElementById("customerName"),
    tableNumber: document.getElementById("tableNumber"),
    generalNote: document.getElementById("generalNote"),
    paymentMethod: document.getElementById("paymentMethod"),
    openBillButton: document.getElementById("openBillButton"),
    addToBillButton: document.getElementById("addToBillButton"),
    activeBillsButton: document.getElementById("activeBillsButton"),
    payBillButton: document.getElementById("payBillButton"),
    clearCartButton: document.getElementById("clearCartButton"),
    activeBillLabel: document.getElementById("activeBillLabel"),
    activeBillMeta: document.getElementById("activeBillMeta"),
    activeBillDetail: document.getElementById("activeBillDetail"),
    receiptDialog: document.getElementById("receiptDialog"),
    receiptEyebrow: document.getElementById("receiptEyebrow"),
    receiptTitle: document.getElementById("receiptTitle"),
    receiptPreview: document.getElementById("receiptPreview"),
    closeReceiptButton: document.getElementById("closeReceiptButton"),
    printCustomerButton: document.getElementById("printCustomerButton"),
    printKitchenButton: document.getElementById("printKitchenButton"),
    activeBillsDialog: document.getElementById("activeBillsDialog"),
    billSearchInput: document.getElementById("billSearchInput"),
    activeBillsList: document.getElementById("activeBillsList"),
    closeActiveBillsButton: document.getElementById("closeActiveBillsButton"),
    historyButton: document.getElementById("historyButton"),
    historyDialog: document.getElementById("historyDialog"),
    closeHistoryButton: document.getElementById("closeHistoryButton"),
    historyList: document.getElementById("historyList"),
    cartDock: document.getElementById("cartDock"),
    cartDockLabel: document.getElementById("cartDockLabel"),
    cartDockSummary: document.getElementById("cartDockSummary")
  };

  init();

  function init() {
    migrateLegacyTransactions();
    ensureActiveBillIsOpen();
    renderCategories();
    renderMenu();
    renderCart();
    renderActiveBill();
    bindEvents();
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (event) => {
      state.searchTerm = event.target.value.trim().toLowerCase();
      renderMenu();
    });

    els.billSearchInput.addEventListener("input", (event) => {
      state.billSearchTerm = event.target.value.trim().toLowerCase();
      renderActiveBillsList();
    });

    els.openBillButton.addEventListener("click", openNewBill);
    els.addToBillButton.addEventListener("click", addCartToActiveBill);
    els.activeBillsButton.addEventListener("click", showActiveBills);
    els.payBillButton.addEventListener("click", payActiveBill);
    els.clearCartButton.addEventListener("click", clearCart);
    els.closeReceiptButton.addEventListener("click", () => els.receiptDialog.close());
    els.printCustomerButton.addEventListener("click", () => printReceipt("customer"));
    els.printKitchenButton.addEventListener("click", () => printReceipt("kitchen"));
    els.historyButton.addEventListener("click", showHistory);
    els.closeHistoryButton.addEventListener("click", () => els.historyDialog.close());
    els.closeActiveBillsButton.addEventListener("click", () => els.activeBillsDialog.close());
    els.cartDock.addEventListener("click", () => {
      document.getElementById("cartPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function flattenMenu(groups) {
    let order = 0;
    return groups.flatMap((group) =>
      group.items.map((item) => ({
        id: slugify(`${group.category}-${item.name}`),
        order: order++,
        name: item.name,
        price: item.price,
        category: group.category,
        needsFlavor: Boolean(group.needsFlavor || item.needsFlavor)
      }))
    );
  }

  function renderCategories() {
    els.categoryTabs.innerHTML = "";
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = category === state.activeCategory ? "tab active" : "tab";
      button.textContent = category === "ALL" ? "Semua" : category;
      button.addEventListener("click", () => {
        state.activeCategory = category;
        renderCategories();
        renderMenu();
      });
      els.categoryTabs.appendChild(button);
    });
  }

  function renderMenu() {
    const visibleItems = getVisibleItems();
    els.menuGrid.innerHTML = "";
    els.menuCount.textContent = `${visibleItems.length} item`;
    els.categoryLabel.textContent =
      state.activeCategory === "ALL" ? "Semua menu" : state.activeCategory;

    if (visibleItems.length === 0) {
      els.menuGrid.innerHTML = '<p class="empty-state">Menu tidak ditemukan.</p>';
      return;
    }

    visibleItems.forEach((item) => {
      const sold = state.sales[item.id] || 0;
      const card = document.createElement("article");
      card.className = "menu-card";
      card.dataset.menuId = item.id;
      card.innerHTML = `
        <div class="menu-card-head">
          <span class="category-pill">${escapeHtml(item.category)}</span>
          ${sold > 0 ? `<span class="sold-pill">${sold} terjual</span>` : ""}
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <div class="menu-card-foot">
          <strong>${formatRupiah(item.price)}</strong>
          <button type="button" class="add-btn" aria-label="Tambah ${escapeAttr(item.name)}">Tambah</button>
        </div>
      `;
      card.querySelector(".add-btn").addEventListener("click", () => addToCart(item.id));
      els.menuGrid.appendChild(card);
    });
  }

  function getVisibleItems() {
    return menuItems
      .filter((item) => state.activeCategory === "ALL" || item.category === state.activeCategory)
      .filter((item) => {
        if (!state.searchTerm) return true;
        return `${item.name} ${item.category}`.toLowerCase().includes(state.searchTerm);
      })
      .sort((a, b) => {
        const soldDiff = (state.sales[b.id] || 0) - (state.sales[a.id] || 0);
        if (soldDiff !== 0) return soldDiff;
        return a.order - b.order;
      });
  }

  function addToCart(itemId) {
    const item = menuItems.find((entry) => entry.id === itemId);
    if (!item) return;

    const existing = state.cart.find((entry) => entry.id === itemId && !entry.note && !entry.flavor);
    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        needsFlavor: item.needsFlavor,
        qty: 1,
        flavor: "",
        note: ""
      });
    }

    saveCart();
    renderCart();
  }

  function renderCart() {
    els.cartItems.innerHTML = "";

    if (state.cart.length === 0) {
      els.cartItems.innerHTML = '<p class="empty-state">Keranjang pesanan baru kosong.</p>';
    } else {
      state.cart.forEach((entry, index) => renderCartItem(entry, index));
    }

    els.cartTotal.textContent = formatRupiah(getCartTotal());
    renderCartDock();
    updateActionStates();
  }

  function renderCartItem(entry, index) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-main">
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${formatRupiah(entry.price)}</span>
        </div>
        <button type="button" class="remove-btn" title="Hapus item" aria-label="Hapus ${escapeAttr(entry.name)}">&times;</button>
      </div>
      <div class="qty-row">
        <button type="button" class="qty-btn minus" title="Kurangi" aria-label="Kurangi ${escapeAttr(entry.name)}">&minus;</button>
        <label class="qty-edit">
          <span>Qty</span>
          <input class="qty-input" type="number" inputmode="numeric" min="1" step="1" value="${entry.qty}" aria-label="Edit qty ${escapeAttr(entry.name)}" />
        </label>
        <button type="button" class="qty-btn plus" title="Tambah" aria-label="Tambah ${escapeAttr(entry.name)}">+</button>
        <strong>${formatRupiah(entry.qty * entry.price)}</strong>
      </div>
      ${entry.needsFlavor ? `
        <label class="small-field">
          <span>Keterangan rasa</span>
          <input class="flavor-input" type="text" value="${escapeAttr(entry.flavor)}" placeholder="Contoh: mangga, coklat, panas" />
        </label>
      ` : ""}
      <label class="small-field">
        <span>Note item</span>
        <input class="note-input" type="text" value="${escapeAttr(entry.note)}" placeholder="Contoh: pedas sedang" />
      </label>
    `;

    row.querySelector(".minus").addEventListener("click", () => changeQty(index, -1));
    row.querySelector(".plus").addEventListener("click", () => changeQty(index, 1));
    row.querySelector(".qty-input").addEventListener("input", (event) => {
      setCartQty(index, event.target.value);
    });
    row.querySelector(".remove-btn").addEventListener("click", () => removeCartItem(index));
    row.querySelector(".note-input").addEventListener("input", (event) => {
      state.cart[index].note = event.target.value;
      saveCart();
    });

    const flavorInput = row.querySelector(".flavor-input");
    if (flavorInput) {
      flavorInput.addEventListener("input", (event) => {
        state.cart[index].flavor = event.target.value;
        saveCart();
      });
    }

    els.cartItems.appendChild(row);
  }

  function renderActiveBill() {
    const bill = getActiveBill();

    if (!bill) {
      els.activeBillLabel.textContent = "Belum ada bill";
      els.activeBillMeta.textContent = "Buka bill baru atau pilih bill aktif.";
      els.activeBillDetail.innerHTML = '<p class="empty-state">Belum ada bill aktif yang dipilih.</p>';
      updateActionStates();
      return;
    }

    els.customerName.value = bill.namaCustomer || "";
    els.tableNumber.value = bill.nomorMeja || "";
    els.activeBillLabel.textContent = getBillTitle(bill);
    els.activeBillMeta.textContent = `${getStatusLabel(bill.status)} - ${formatRupiah(bill.total)} - ${bill.orderBatches.length} batch`;
    els.activeBillDetail.innerHTML = buildActiveBillDetail(bill);

    els.activeBillDetail.querySelectorAll("[data-cancel-line]").forEach((button) => {
      button.addEventListener("click", () => cancelSentItem(button.dataset.cancelLine));
    });

    updateActionStates();
  }

  function buildActiveBillDetail(bill) {
    const activeItems = bill.items.filter((item) => item.status !== "CANCELLED");
    const cancelledItems = bill.items.filter((item) => item.status === "CANCELLED");
    const activeRows = activeItems
      .map(
        (item) => `
          <div class="bill-line">
            <div>
              <strong>${item.qty}x ${escapeHtml(item.name)}</strong>
              <small>${formatDate(item.sentAt)}${item.note ? ` - Note: ${escapeHtml(item.note)}` : ""}${item.needsFlavor ? ` - Rasa: ${escapeHtml(item.flavor || "-")}` : ""}</small>
            </div>
            <div>
              <b>${formatRupiah(item.qty * item.price)}</b>
              <button type="button" class="danger-mini-btn" data-cancel-line="${escapeAttr(item.lineItemId)}">Batalkan</button>
            </div>
          </div>
        `
      )
      .join("");

    const cancelledRows = cancelledItems
      .map(
        (item) => `
          <div class="bill-line cancelled">
            <div>
              <strong>${item.qty}x ${escapeHtml(item.name)}</strong>
              <small>Dibatalkan ${formatDate(item.cancelledAt)}${item.correctionNote ? ` - ${escapeHtml(item.correctionNote)}` : ""}</small>
            </div>
            <span>Dibatalkan</span>
          </div>
        `
      )
      .join("");

    return `
      <div class="bill-total-card">
        <span>Total Bill</span>
        <strong>${formatRupiah(bill.total)}</strong>
      </div>
      <div class="bill-lines">
        ${activeRows || '<p class="empty-state">Belum ada pesanan terkirim ke kitchen.</p>'}
        ${cancelledRows ? `<div class="correction-title">Koreksi</div>${cancelledRows}` : ""}
      </div>
    `;
  }

  function updateActionStates() {
    const bill = getActiveBill();
    const hasCart = state.cart.length > 0;
    els.addToBillButton.disabled = !bill || bill.status !== STATUS.open || !hasCart;
    els.payBillButton.disabled = !bill || bill.status !== STATUS.open || bill.items.length === 0;
  }

  function openNewBill() {
    const namaCustomer = els.customerName.value.trim();
    const nomorMeja = els.tableNumber.value.trim();
    if (!namaCustomer && !nomorMeja) {
      alert("Isi nomor meja atau nama customer dulu untuk buka bill.");
      return;
    }

    const bill = {
      billId: createBillId(),
      nomorMeja,
      namaCustomer,
      status: STATUS.open,
      createdAt: new Date().toISOString(),
      paidAt: null,
      orderBatches: [],
      items: [],
      total: 0,
      paymentMethod: "",
      notes: []
    };

    state.bills.unshift(bill);
    setActiveBill(bill.billId);
    saveBills();
    renderActiveBill();
    renderActiveBillsList();

    if (state.cart.length > 0) {
      addCartToActiveBill();
    }
  }

  function addCartToActiveBill() {
    const bill = getActiveBill();
    if (!bill) {
      alert("Pilih atau buka bill aktif dulu.");
      return;
    }

    if (bill.status !== STATUS.open) {
      alert("Bill ini sudah lunas.");
      return;
    }

    if (state.cart.length === 0) {
      alert("Keranjang masih kosong.");
      return;
    }

    bill.nomorMeja = els.tableNumber.value.trim() || bill.nomorMeja;
    bill.namaCustomer = els.customerName.value.trim() || bill.namaCustomer;

    const isAdditional = bill.orderBatches.some((batch) => batch.type !== "CORRECTION");
    const now = new Date().toISOString();
    const batch = {
      batchId: createBatchId(bill),
      createdAt: now,
      type: isAdditional ? "ADDITION" : "FIRST",
      label: isAdditional ? "PESANAN TAMBAHAN" : "PESANAN PERTAMA",
      generalNote: els.generalNote.value.trim(),
      items: state.cart.map((item, index) => createLineItem(item, bill, now, index))
    };

    if (batch.generalNote) {
      bill.notes.push({ createdAt: now, note: batch.generalNote });
    }

    bill.orderBatches.push(batch);
    bill.items.push(...batch.items.map((item) => ({ ...item })));
    bill.total = calculateBillTotal(bill);
    batch.items.forEach((item) => incrementSales(item.menuId, item.qty));

    state.cart = [];
    els.generalNote.value = "";
    saveJson(STORAGE_KEYS.sales, state.sales);
    saveBills();
    saveCart();
    renderMenu();
    renderCart();
    renderActiveBill();
    showKitchenReceipt(bill, batch);
  }

  function cancelSentItem(lineItemId) {
    const bill = getActiveBill();
    if (!bill || bill.status !== STATUS.open) return;

    const item = bill.items.find((entry) => entry.lineItemId === lineItemId);
    if (!item || item.status === "CANCELLED") return;

    const note = "Dibatalkan oleh kasir";
    const now = new Date().toISOString();
    item.status = "CANCELLED";
    item.cancelledAt = now;
    item.correctionNote = note.trim();

    const batch = {
      batchId: createBatchId(bill),
      createdAt: now,
      type: "CORRECTION",
      label: "KOREKSI PESANAN",
      generalNote: item.correctionNote,
      items: [{ ...item, qty: -Math.abs(item.qty) }]
    };

    bill.orderBatches.push(batch);
    bill.total = calculateBillTotal(bill);
    incrementSales(item.menuId, -item.qty);
    saveJson(STORAGE_KEYS.sales, state.sales);
    saveBills();
    renderMenu();
    renderActiveBill();
    showKitchenReceipt(bill, batch);
  }

  function payActiveBill() {
    const bill = getActiveBill();
    if (!bill || bill.status !== STATUS.open) return;

    bill.status = STATUS.paid;
    bill.paidAt = new Date().toISOString();
    bill.paymentMethod = els.paymentMethod.value || "Tunai";
    bill.total = calculateBillTotal(bill);

    upsertPaidTransaction(bill);
    saveBills();
    saveJson(STORAGE_KEYS.transactions, state.transactions);
    if (window.YumnaaSheetsSync) {
      window.YumnaaSheetsSync.enqueue(bill);
      window.YumnaaSheetsSync.syncPending();
    }

    setActiveBill("");
    els.generalNote.value = "";
    renderCart();
    renderActiveBill();
    renderActiveBillsList();
    showCustomerReceipt(bill);
  }

  function showActiveBills() {
    renderActiveBillsList();
    els.activeBillsDialog.showModal();
  }

  function renderActiveBillsList() {
    if (!els.activeBillsList) return;

    const openBills = state.bills
      .filter((bill) => bill.status === STATUS.open)
      .filter((bill) => {
        if (!state.billSearchTerm) return true;
        return `${bill.nomorMeja} ${bill.namaCustomer} ${bill.billId}`.toLowerCase().includes(state.billSearchTerm);
      });

    els.activeBillsList.innerHTML = "";
    if (openBills.length === 0) {
      els.activeBillsList.innerHTML = '<p class="empty-state">Tidak ada bill OPEN yang cocok.</p>';
      return;
    }

    openBills.forEach((bill) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "bill-list-item";
      button.innerHTML = `
        <span>
          <strong>${escapeHtml(getBillTitle(bill))}</strong>
          <small>${escapeHtml(bill.billId)} - ${formatDate(bill.createdAt)} - ${bill.orderBatches.length} batch</small>
        </span>
        <b>${formatRupiah(bill.total)}</b>
      `;
      button.addEventListener("click", () => {
        setActiveBill(bill.billId);
        els.activeBillsDialog.close();
        renderActiveBill();
        renderCartDock();
      });
      els.activeBillsList.appendChild(button);
    });
  }

  function showHistory() {
    els.historyList.innerHTML = "";
    const paidBills = state.bills.filter((bill) => bill.status === STATUS.paid);

    if (paidBills.length === 0) {
      els.historyList.innerHTML = '<p class="empty-state">Belum ada bill lunas.</p>';
    } else {
      paidBills.forEach((bill) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";
        button.innerHTML = `
          <span>
            <strong>${escapeHtml(getBillTitle(bill))}</strong>
            <small>${escapeHtml(bill.billId)} - LUNAS ${formatDate(bill.paidAt)} - ${getBillItemQty(bill)} item</small>
          </span>
          <b>${formatRupiah(bill.total)}</b>
        `;
        button.addEventListener("click", () => {
          els.historyDialog.close();
          showCustomerReceipt(bill);
        });
        els.historyList.appendChild(button);
      });
    }

    els.historyDialog.showModal();
  }

  function showKitchenReceipt(bill, batch) {
    state.receiptContext = { type: "kitchen", bill: clone(bill), batch: clone(batch) };
    els.receiptEyebrow.textContent = batch.type === "ADDITION" ? "Pesanan tambahan" : "Struk Kitchen";
    els.receiptTitle.textContent = `${batch.label} - ${getBillTitle(bill)}`;
    els.receiptPreview.innerHTML = buildKitchenReceiptHtml(bill, batch);
    els.printCustomerButton.hidden = true;
    els.printKitchenButton.hidden = false;
    els.printKitchenButton.textContent = "Cetak Kitchen";
    els.receiptDialog.showModal();
  }

  function showCustomerReceipt(bill) {
    state.receiptContext = { type: "customer", bill: clone(bill), batch: null };
    els.receiptEyebrow.textContent = "Bill Lunas";
    els.receiptTitle.textContent = `${getBillTitle(bill)} - LUNAS`;
    els.receiptPreview.innerHTML = buildCustomerReceiptHtml(bill);
    els.printCustomerButton.hidden = false;
    els.printKitchenButton.hidden = true;
    els.printCustomerButton.textContent = "Cetak Customer";
    els.receiptDialog.showModal();
  }

  function printReceipt(type) {
    const context = state.receiptContext;
    if (!context) return;

    const html =
      type === "kitchen"
        ? buildKitchenReceiptHtml(context.bill, context.batch)
        : buildCustomerReceiptHtml(context.bill);

    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      alert("Popup cetak diblokir. Izinkan popup browser untuk mencetak struk.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Struk ${type === "kitchen" ? "Kitchen" : "Customer"} ${escapeHtml(context.bill.billId)}</title>
          <style>${getReceiptPrintCss()}</style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function buildKitchenReceiptHtml(bill, batch) {
    const rows = batch.items
      .map((item) => {
        const qty = batch.type === "CORRECTION" ? Math.abs(item.qty) : item.qty;
        const details = [
          item.needsFlavor ? `Rasa: ${escapeHtml(item.flavor || "-")}` : "",
          item.note ? `Note: ${escapeHtml(item.note)}` : "",
          batch.type === "CORRECTION" ? `Koreksi: ${escapeHtml(item.correctionNote || batch.generalNote || "Dibatalkan")}` : ""
        ].filter(Boolean);

        return `
          <div class="item">
            <div>
              <div class="item-name">${qty}x ${escapeHtml(item.name)}</div>
              ${details.map((detail) => `<small>${detail}</small>`).join("")}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <section class="receipt">
        <h1>Kedai Yumnaa</h1>
        <h2>${escapeHtml(batch.label)}</h2>
        <div class="line"></div>
        <p class="meta"><span>Bill</span><strong>${escapeHtml(bill.billId)}</strong></p>
        <p class="meta"><span>Waktu</span><span>${formatDate(batch.createdAt)}</span></p>
        <p class="meta"><span>Customer</span><span>${escapeHtml(bill.namaCustomer || "-")}</span></p>
        <p class="meta"><span>Meja</span><span>${escapeHtml(bill.nomorMeja || "-")}</span></p>
        <div class="line"></div>
        ${rows}
        ${batch.generalNote ? `<div class="line"></div><p class="note"><strong>Note umum:</strong> ${escapeHtml(batch.generalNote)}</p>` : ""}
      </section>
    `;
  }

  function buildCustomerReceiptHtml(bill) {
    const rows = bill.items
      .map((item) => {
        const isCancelled = item.status === "CANCELLED";
        const details = [
          item.needsFlavor ? `Rasa: ${escapeHtml(item.flavor || "-")}` : "",
          item.note ? `Note: ${escapeHtml(item.note)}` : "",
          isCancelled ? `Status: Dibatalkan${item.correctionNote ? ` - ${escapeHtml(item.correctionNote)}` : ""}` : ""
        ].filter(Boolean);

        return `
          <div class="item ${isCancelled ? "cancelled" : ""}">
            <div>
              <div class="item-name">${item.qty}x ${escapeHtml(item.name)}</div>
              ${details.map((detail) => `<small>${detail}</small>`).join("")}
            </div>
            <span>${isCancelled ? "-" : formatRupiah(item.qty * item.price)}</span>
          </div>
        `;
      })
      .join("");

    const notes = bill.notes.map((entry) => escapeHtml(entry.note)).join("; ");

    return `
      <section class="receipt">
        <h1>Kedai Yumnaa</h1>
        <h2>Struk CUSTOMER FINAL</h2>
        <div class="line"></div>
        <p class="meta"><span>Bill</span><strong>${escapeHtml(bill.billId)}</strong></p>
        <p class="meta"><span>Dibuka</span><span>${formatDate(bill.createdAt)}</span></p>
        <p class="meta"><span>Lunas</span><span>${formatDate(bill.paidAt)}</span></p>
        <p class="meta"><span>Customer</span><span>${escapeHtml(bill.namaCustomer || "-")}</span></p>
        <p class="meta"><span>Meja</span><span>${escapeHtml(bill.nomorMeja || "-")}</span></p>
        <p class="meta"><span>Bayar</span><span>${escapeHtml(bill.paymentMethod || "-")}</span></p>
        <div class="line"></div>
        ${rows}
        ${notes ? `<div class="line"></div><p class="note"><strong>Note:</strong> ${notes}</p>` : ""}
        <div class="line"></div>
        <p class="total"><span>Total</span><span>${formatRupiah(bill.total)}</span></p>
      </section>
    `;
  }

  function changeQty(index, delta) {
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) {
      state.cart.splice(index, 1);
    }
    saveCart();
    renderCart();
  }

  function setCartQty(index, value) {
    const qty = Number.parseInt(value, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      state.cart.splice(index, 1);
    } else {
      state.cart[index].qty = qty;
    }
    saveCart();
    renderCart();
  }

  function removeCartItem(index) {
    state.cart.splice(index, 1);
    saveCart();
    renderCart();
  }

  function clearCart() {
    if (state.cart.length === 0) return;
    state.cart = [];
    saveCart();
    renderCart();
  }

  function createLineItem(item, bill, sentAt, index) {
    return {
      lineItemId: `${bill.billId}-L${bill.items.length + index + 1}-${Date.now()}`,
      menuId: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      needsFlavor: item.needsFlavor,
      qty: item.qty,
      flavor: item.flavor || "",
      note: item.note || "",
      status: "ACTIVE",
      sentAt,
      cancelledAt: null,
      correctionNote: ""
    };
  }

  function calculateBillTotal(bill) {
    return bill.items
      .filter((item) => item.status !== "CANCELLED")
      .reduce((sum, item) => sum + item.qty * item.price, 0);
  }

  function getCartTotal() {
    return state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }

  function getCartQty() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function getBillItemQty(bill) {
    return bill.items
      .filter((item) => item.status !== "CANCELLED")
      .reduce((sum, item) => sum + item.qty, 0);
  }

  function renderCartDock() {
    const bill = getActiveBill();
    const cartQty = getCartQty();
    const billQty = bill ? getBillItemQty(bill) : 0;
    if (!els.cartDock || !els.cartDockSummary) return;

    els.cartDock.hidden = cartQty === 0 && !bill;
    els.cartDockLabel.textContent = bill ? "Bill Aktif" : "Keranjang";
    els.cartDockSummary.textContent = bill
      ? `${getBillTitle(bill)} - ${billQty} item - ${formatRupiah(bill.total)}`
      : `${cartQty} item - ${formatRupiah(getCartTotal())}`;
  }

  function getActiveBill() {
    if (!state.activeBillId) return null;
    return state.bills.find((bill) => bill.billId === state.activeBillId && bill.status === STATUS.open) || null;
  }

  function setActiveBill(billId) {
    state.activeBillId = billId;
    if (billId) {
      localStorage.setItem(STORAGE_KEYS.activeBillId, billId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeBillId);
    }
  }

  function ensureActiveBillIsOpen() {
    if (getActiveBill()) return;
    setActiveBill("");
  }

  function getBillTitle(bill) {
    const table = bill.nomorMeja ? `Meja ${bill.nomorMeja}` : "Tanpa meja";
    const customer = bill.namaCustomer ? ` - ${bill.namaCustomer}` : "";
    return `${table}${customer}`;
  }

  function getStatusLabel(status) {
    return status === STATUS.paid ? "PAID / LUNAS" : "OPEN / BELUM BAYAR";
  }

  function incrementSales(menuId, qty) {
    state.sales[menuId] = Math.max(0, (state.sales[menuId] || 0) + qty);
  }

  function upsertPaidTransaction(bill) {
    state.transactions = state.transactions.filter((entry) => entry.billId !== bill.billId);
    state.transactions.unshift(clone(bill));
    state.transactions = state.transactions.slice(0, 250);
  }

  function saveCart() {
    saveJson(STORAGE_KEYS.cart, state.cart);
  }

  function saveBills() {
    state.bills.forEach((bill) => {
      bill.total = calculateBillTotal(bill);
    });
    saveJson(STORAGE_KEYS.bills, state.bills);
  }

  function normalizeBills(bills) {
    return bills.map((bill, index) => ({
      billId: bill.billId || bill.id || `BILL-MIGRATED-${String(index + 1).padStart(4, "0")}`,
      nomorMeja: bill.nomorMeja || bill.tableNumber || "",
      namaCustomer: bill.namaCustomer || bill.customerName || "",
      status: bill.status === STATUS.paid ? STATUS.paid : STATUS.open,
      createdAt: bill.createdAt || new Date().toISOString(),
      paidAt: bill.paidAt || null,
      orderBatches: Array.isArray(bill.orderBatches) ? bill.orderBatches : [],
      items: Array.isArray(bill.items) ? bill.items : [],
      total: Number(bill.total || 0),
      paymentMethod: bill.paymentMethod || "",
      notes: Array.isArray(bill.notes) ? bill.notes : []
    }));
  }

  function migrateLegacyTransactions() {
    const legacyTransactions = state.transactions.filter((entry) => entry.id && !entry.billId);
    if (legacyTransactions.length === 0) return;

    legacyTransactions.forEach((trx, index) => {
      const billId = `BILL-LEGACY-${String(index + 1).padStart(4, "0")}`;
      if (state.bills.some((bill) => bill.billId === billId || bill.billId === trx.id)) return;

      const paidAt = trx.paidAt || trx.createdAt || new Date().toISOString();
      const items = (trx.items || []).map((item, itemIndex) => ({
        lineItemId: `${billId}-L${itemIndex + 1}`,
        menuId: item.id || item.menuId || slugify(`${item.category || "menu"}-${item.name}`),
        name: item.name,
        price: item.price,
        category: item.category || "",
        needsFlavor: Boolean(item.needsFlavor),
        qty: item.qty,
        flavor: item.flavor || "",
        note: item.note || "",
        status: "ACTIVE",
        sentAt: trx.createdAt || paidAt,
        cancelledAt: null,
        correctionNote: ""
      }));

      state.bills.push({
        billId,
        nomorMeja: trx.tableNumber || "",
        namaCustomer: trx.customerName || "",
        status: STATUS.paid,
        createdAt: trx.createdAt || paidAt,
        paidAt,
        orderBatches: [
          {
            batchId: `${billId}-B01`,
            createdAt: trx.createdAt || paidAt,
            type: "FIRST",
            label: "PESANAN PERTAMA",
            generalNote: trx.generalNote || "",
            items
          }
        ],
        items,
        total: trx.total || items.reduce((sum, item) => sum + item.qty * item.price, 0),
        paymentMethod: trx.paymentMethod || "",
        notes: trx.generalNote ? [{ createdAt: trx.createdAt || paidAt, note: trx.generalNote }] : []
      });
    });

    saveBills();
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function createBillId() {
    const date = new Date();
    const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
    const count = state.bills.length + 1;
    return `BILL-${stamp}-${String(count).padStart(4, "0")}`;
  }

  function createBatchId(bill) {
    return `${bill.billId}-B${String(bill.orderBatches.length + 1).padStart(2, "0")}`;
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function formatRupiah(value) {
    return currency.format(value).replace(/\s/g, "");
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function getReceiptPrintCss() {
    return `
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111; }
      .receipt { width: 280px; margin: 0 auto; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 18px; text-align: center; }
      h2 { font-size: 14px; text-align: center; margin: 4px 0 12px; }
      .line { border-top: 1px dashed #111; margin: 10px 0; }
      .meta, .item, .total { display: flex; justify-content: space-between; gap: 12px; }
      .meta, .note, .item small { font-size: 12px; }
      .item { margin-bottom: 8px; }
      .item-name { font-weight: 700; }
      .cancelled { opacity: 0.7; text-decoration: line-through; }
      .total { font-size: 16px; font-weight: 700; }
      @media print { body { padding: 0; } }
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
})();
