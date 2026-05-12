function initFormatMenus(onSelect) {
  const closeMenus = () => {
    document.querySelectorAll(".format-menu.open").forEach(menu => {
      menu.classList.remove("open");
      menu.querySelector(".format-menu-button")?.setAttribute("aria-expanded", "false");
    });
  };

  document.querySelectorAll(".format-menu-button").forEach(button => {
    button.addEventListener("click", event => {
      const menu = event.currentTarget.closest(".format-menu");
      const isOpen = menu.classList.contains("open");
      closeMenus();
      menu.classList.toggle("open", !isOpen);
      event.currentTarget.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  document.querySelectorAll(".format-menu-list button").forEach(button => {
    button.addEventListener("click", event => {
      const menu = event.currentTarget.closest(".format-menu");
      onSelect(menu.dataset.formatMenu, event.currentTarget.dataset.value, event.currentTarget.textContent.trim());
      closeMenus();
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".format-menu")) closeMenus();
  });
}
