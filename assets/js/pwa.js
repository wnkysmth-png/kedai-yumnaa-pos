(function () {
  "use strict";

  const state = {
    installPrompt: null
  };

  window.YumnaaPWA = {
    canInstall: false,
    isStandalone,
    promptInstall
  };

  window.addEventListener("load", () => {
    hideSplash();
    registerServiceWorker();
    updateInstallButton();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    window.YumnaaPWA.canInstall = true;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    state.installPrompt = null;
    window.YumnaaPWA.canInstall = false;
    updateInstallButton();
  });

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker gagal didaftarkan.", error);
    });
  }

  async function promptInstall() {
    if (!state.installPrompt) return false;

    state.installPrompt.prompt();
    const choice = await state.installPrompt.userChoice;
    state.installPrompt = null;
    window.YumnaaPWA.canInstall = false;
    updateInstallButton();
    return choice.outcome === "accepted";
  }

  function updateInstallButton() {
    const button = document.getElementById("installButton");
    if (!button) return;

    button.hidden = isStandalone() || !state.installPrompt;
    button.onclick = promptInstall;
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  }

  function hideSplash() {
    const splash = document.getElementById("splashScreen");
    if (!splash) return;

    splash.classList.add("is-hidden");
    window.setTimeout(() => splash.remove(), 260);
  }
})();
