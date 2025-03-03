(function () {
  function toggleCalendarMenu(menuId) {
    var menu = document.getElementById(menuId);
    if (!menu) return;
    menu.classList.toggle('hidden');
  }

  const addToCalendarButtons = document.querySelectorAll('.add-to-calendar');
  addToCalendarButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const menuId = this.getAttribute('data-menu-id');
      toggleCalendarMenu(menuId);
    });
  });
})();