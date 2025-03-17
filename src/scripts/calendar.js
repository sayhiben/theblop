(function () {
  function setupAddToCalendar() {
    const containers = document.querySelectorAll(".add-to-calendar-container");

    containers.forEach((container) => {
     // Get DOM references
      const menu = container.querySelector(".add-to-calendar-menu");
      const btn = container.querySelector(".add-to-calendar-button");

      // Toggle menu open/close
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent click from closing it immediately
        menu.classList.toggle("hidden");
      });
    });

    document.addEventListener("click", (e) => {
      document.querySelectorAll(".add-to-calendar-menu").forEach((menu) => {
        // If the click is NOT inside a container that owns this menu, hide it
        const container = menu.closest(".add-to-calendar-container");
        if (container && !container.contains(e.target)) {
          menu.classList.add("hidden");
        }
      });
    });
  }

  // Run setup once DOM is loaded
  document.addEventListener("DOMContentLoaded", setupAddToCalendar);
})();
