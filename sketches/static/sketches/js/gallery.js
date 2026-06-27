(function () {
  var searchInput = document.getElementById("gallery-search");
  if (searchInput) {
    searchInput.addEventListener("focus", function () {
      searchInput.classList.add("w-80");
      searchInput.classList.remove("w-64");
    });
    searchInput.addEventListener("blur", function () {
      searchInput.classList.remove("w-80");
      searchInput.classList.add("w-64");
    });
  }
})();
