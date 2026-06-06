(function () {
  "use strict";

  const STORAGE_KEY = "kedai-yumnaa-v1-sync-queue";

  window.YumnaaSheetsSync = {
    enqueue,
    getQueue,
    markSynced,
    async syncPending() {
      if (!navigator.onLine) return { ok: false, reason: "offline" };
      return { ok: false, reason: "Google Sheets endpoint belum dikonfigurasi" };
    }
  };

  window.addEventListener("online", () => {
    window.YumnaaSheetsSync.syncPending();
  });

  function enqueue(transaction) {
    const queue = getQueue();
    const id = transaction.billId || transaction.id;
    if (!id) return;

    if (!queue.some((entry) => entry.id === id)) {
      queue.push({
        id,
        status: "pending",
        createdAt: transaction.createdAt,
        transaction
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  }

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
      return [];
    }
  }

  function markSynced(transactionId) {
    const queue = getQueue().filter((entry) => entry.id !== transactionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
})();
