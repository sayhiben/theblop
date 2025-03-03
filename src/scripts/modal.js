(function() {
  const modal = document.getElementById("submitNewEventModal");
  const openModalButton = document.getElementById("openModalButton");
  const closeModalButton = document.getElementById("closeModalButton");

  function openModal() {
    console.log("openModal")
    modal.classList.remove("hidden");
  }

  function closeModal() {
    console.log("closeModal")
    modal.classList.add("hidden");
  }

  openModalButton.addEventListener("click", openModal);
  closeModalButton.addEventListener("click", closeModal);
})();