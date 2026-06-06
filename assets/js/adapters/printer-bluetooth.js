(function () {
  "use strict";

  const supported = "bluetooth" in navigator;

  window.YumnaaPrinter = {
    supported,
    async connect() {
      throw new Error("Printer Bluetooth Android belum diaktifkan di v1.");
    },
    async printReceipt() {
      throw new Error("Adapter printer thermal siap untuk implementasi v2.");
    },
    formatThermalReceipt(transaction, type) {
      const title = type === "kitchen" ? "KITCHEN" : "CUSTOMER";
      const receiptId = transaction.billId || transaction.id || "-";
      const lines = ["KEDAI YUMNAA", `STRUK ${title}`, receiptId, ""];
      transaction.items.forEach((item) => {
        lines.push(`${item.qty}x ${item.name}`);
        if (item.needsFlavor) lines.push(`Rasa: ${item.flavor || "-"}`);
        if (item.note) lines.push(`Note: ${item.note}`);
      });
      return lines.join("\n");
    }
  };
})();
