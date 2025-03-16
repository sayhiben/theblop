(function() {
  const modal = document.getElementById("submitNewEventModal");
  const addToCalendarModal = document.getElementById("addToCalendarModal");
  const openModalButton = document.getElementById("openModalButton");
  const openAddToCalendarButton = document.getElementById("openAddToCalendarButton");
  const closeModalButton = document.getElementById("closeModalButton");
  const closeAddToCalendarButton = document.getElementById("closeAddToCalendarButton");

  function openModal() {
    console.log("openModal")
    modal.classList.remove("hidden");
  }

  function openAddToCalendarModal() {
    console.log("openAddToCalendarModal")
    addToCalendarModal.classList.remove("hidden");
  }

  function closeModal() {
    console.log("closeModal")
    modal.classList.add("hidden");
  }

  function closeAddToCalendarModal() {
    console.log("closeAddToCalendarModal")
    addToCalendarModal.classList.add("hidden");
  }

  openModalButton.addEventListener("click", openModal);
  openAddToCalendarButton.addEventListener("click", openAddToCalendarModal);
  closeModalButton.addEventListener("click", closeModal);
  closeAddToCalendarButton.addEventListener("click", closeAddToCalendarModal);
})();