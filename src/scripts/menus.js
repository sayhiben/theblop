(function () {
  function setupDropdowns() {
    // ADD TO CALENDAR DROPDOWNS
    const calendarContainers = document.querySelectorAll(".add-to-calendar-container");
    calendarContainers.forEach((container) => {
      const menu = container.querySelector(".add-to-calendar-menu");
      const btn = container.querySelector(".add-to-calendar-button");
      if (!menu || !btn) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllMenusExcept(menu);
        menu.classList.toggle("hidden");
      });
    });

    // SHARE DROPDOWNS
    const shareContainers = document.querySelectorAll(".share-container");
    shareContainers.forEach((container) => {
      const menu = container.querySelector(".share-menu");
      const btn = container.querySelector(".share-button");
      if (!menu || !btn) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllMenusExcept(menu);
        menu.classList.toggle("hidden");
      });
    });

    // HIDE ALL MENUS WHEN CLICKING OUTSIDE
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".add-to-calendar-container") &&
        !e.target.closest(".share-container")
      ) {
        closeAllMenusExcept(null);
      }
    });
  }

  function closeAllMenusExcept(currentMenu) {
    document.querySelectorAll(".share-menu").forEach((m) => {
      if (m !== currentMenu) {
        m.classList.add("hidden");
      }
    });
    document.querySelectorAll(".add-to-calendar-menu").forEach((m) => {
      if (m !== currentMenu) {
        m.classList.add("hidden");
      }
    });
  }

  // COPY PERMALINK
  function setupCopyPermalink() {
    // For each button with .copy-permalink
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".copy-permalink");
      if (!btn) return;

      e.preventDefault();

      const link = btn.getAttribute("data-plain") || "";
      if (link) {
        // Copy as plain text only (no HTML for permalink, presumably)
        // If you have an event's custom HTML for the permalink, you could pass that
        copyToClipboard(link, link, btn);
      }
    });
  }

  // COPY EVENT DETAILS (HTML or Plain Text)
  function setupCopyButtons() {
    // e.g., .copy-btn for event details
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".copy-btn");
      if (!btn) return;

      e.preventDefault();

      const plain = btn.getAttribute("data-plain") || "";
      const html = btn.getAttribute("data-html") || "";
      // Attempt to copy both HTML + plain
      copyToClipboard(html, plain, btn);
    });
  }

  // Run setup once DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    setupDropdowns();
    setupCopyPermalink();
    setupCopyButtons();
  });
})();
