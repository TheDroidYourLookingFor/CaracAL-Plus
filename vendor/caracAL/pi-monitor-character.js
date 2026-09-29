(() => {
  const params = new URLSearchParams(window.location.search);
  const characterName = params.get("name") || "";
  const heading = document.createElement("div");
  heading.textContent = characterName + " — live headless monitor";
  Object.assign(heading.style, {
    margin: "10px auto 0",
    maxWidth: "360px",
    color: "#f0c766",
    font: "bold 16px system-ui, sans-serif",
    textAlign: "center",
  });
  document.body.prepend(heading);

  function showOnlySelected() {
    const boxes = document.querySelectorAll(".botUIContainer > .box");
    boxes.forEach((box) => {
      const value = box.querySelector(".name .textDisplayValue");
      box.style.display = value && value.textContent.trim() === characterName ? "block" : "none";
    });
  }

  showOnlySelected();
  new MutationObserver(showOnlySelected).observe(document.body, { childList: true, subtree: true });
  window.setInterval(showOnlySelected, 1000);
})();
