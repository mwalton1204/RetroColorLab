function initConverter() {
  const input = document.getElementById("input");
  const output = document.getElementById("convertedOutput");
  const error = document.getElementById("error");
  const clearButton = document.getElementById("clearPaletteBtn");
  const copyButton = document.getElementById("copyRgbBtn");
  const inputFormatButton = document.getElementById("inputFormatButton");
  const outputFormatButton = document.getElementById("outputFormatButton");
  const inputFormatMenu = document.getElementById("inputFormatMenu");
  const outputFormatMenu = document.getElementById("outputFormatMenu");
  const pickerEl = document.getElementById("colorPicker");
  const toast = document.getElementById("paletteToast");

  let inputFormat = "RGB888";
  let outputFormat = "RGB555";
  let pickedColorHex = "#63B5CE";
  let pickr;

  function updatePlaceholder() {
    input.placeholder = placeholderForFormat(inputFormat);
  }

  function render() {
    clearButton.disabled = !input.value.trim();
    try {
      const [color] = parsePalette(input.value, inputFormat);
      error.style.display = "none";
      error.textContent = "";

      if (!color) {
        output.value = "";
        copyButton.disabled = true;
        return;
      }

      output.value = formatOutput(color, outputFormat);
      copyButton.disabled = false;
      if (pickr && pickedColorHex.toUpperCase() !== color.hex.toUpperCase()) {
        pickedColorHex = color.hex;
        pickr.setColor(color.hex, true);
      }
    } catch (err) {
      output.value = "";
      copyButton.disabled = true;
      error.style.display = "block";
      error.textContent = err.message;
    }
  }

  function setFormat(type, value, label = value) {
    if (type === "input") {
      let color = null;
      try {
        [color] = parsePalette(input.value, inputFormat);
      } catch (_) {
        // Keep invalid text in place so the user can correct it in the new format.
      }
      inputFormat = value;
      inputFormatButton.textContent = label;
      inputFormatMenu.querySelectorAll("button").forEach(btn => {
        const selected = btn.dataset.value === value;
        btn.classList.toggle("active", selected);
        btn.setAttribute("aria-selected", String(selected));
      });
      if (color) input.value = formatOutput(color, inputFormat);
      updatePlaceholder();
      error.style.display = "none";
      error.textContent = "";
      render();
      return;
    }

    if (type === "output") {
      outputFormat = value;
      outputFormatButton.textContent = label;
      outputFormatMenu.querySelectorAll("button").forEach(btn => {
        const selected = btn.dataset.value === value;
        btn.classList.toggle("active", selected);
        btn.setAttribute("aria-selected", String(selected));
      });
      render();
    }
  }

  input.value = "";
  output.value = "";
  updatePlaceholder();

  input.addEventListener("input", render);
  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    render();
    showToast(toast, "Converter cleared.");
  });
  copyButton.addEventListener("click", async () => {
    if (!output.value.trim()) return;
    await copyText(output.value);
    showToast(toast, "Output copied.");
  });
  pickr = createPickr(pickerEl, pickedColorHex, hex => {
    pickedColorHex = hex;
    const { r, g, b } = hexToRgb(hex);
    input.value = formatInputFromRgb888(r, g, b, inputFormat);
    render();
  }, toast);

  return { setFormat };
}
