


function formatPickerValues(hex) {
  const color = colorFromHex(hex);
  return {
    hex: formatOutput(color, "HEX"),
    rgb888: formatOutput(color, "RGB888"),
    rgb555: formatOutput(color, "RGB555"),
    rgb565: formatOutput(color, "RGB565"),
    rgb444: formatOutput(color, "RGB444")
  };
}

function parsePickerFieldValue(value, format) {
  return parsePalette(value.trim(), format)[0]?.hex;
}

function syncPickrFormatFields(pickr, hex) {
  const root = pickr.getRoot?.();
  root?.app?.style?.setProperty("--pickr-current-color", hex);

  try {
    const hue = pickr.getColor().toHSVA()[0];
    root?.app?.style?.setProperty("--pickr-hue-color", `hsl(${hue}, 100%, 50%)`);
  } catch {
    root?.app?.style?.setProperty("--pickr-hue-color", hex);
  }

  const fields = pickr.__formatFields;
  if (!fields) return;

  const values = formatPickerValues(hex);
  const selectedFormat = fields.select.value.toLowerCase();
  fields.input.value = values[selectedFormat] || values.hex;
}

function installPickrFormatFields(pickr, onChange, toastTarget) {
  const root = pickr.getRoot?.();
  const app = root?.app;
  if (!app || app.querySelector(".pickr-format-fields")) return;

  const wrap = document.createElement("div");
  wrap.className = "pickr-format-fields";
  wrap.innerHTML = `
    <div class="pickr-format-label">Or input manually:</div>
    <div class="pickr-format-row">
      <select class="pickr-format-select" data-pickr-format-select>
        <option value="HEX">HEX</option>
        <option value="RGB888">RGB888</option>
        <option value="RGB555">RGB555</option>
        <option value="RGB565">RGB565</option>
        <option value="RGB444">RGB444</option>
      </select>
      <input class="pickr-format-input" data-pickr-format-input />
    </div>
  `;
  app.appendChild(wrap);

  pickr.__formatFields = {
    select: wrap.querySelector("[data-pickr-format-select]"),
    input: wrap.querySelector("[data-pickr-format-input]")
  };

  wrap.addEventListener("change", event => {
    const fields = pickr.__formatFields;
    if (!fields) return;

    if (event.target.closest("[data-pickr-format-select]")) {
      syncPickrFormatFields(pickr, pickr.getColor().toHEXA().toString(0));
      return;
    }

    if (!event.target.closest("[data-pickr-format-input]")) return;

    try {
      const hex = parsePickerFieldValue(fields.input.value, fields.select.value);
      if (!hex) return;
      pickr.setColor(hex, true);
      syncPickrFormatFields(pickr, hex);
      onChange(hex);
    } catch (err) {
      showToast(toastTarget, err.message);
      syncPickrFormatFields(pickr, pickr.getColor().toHEXA().toString(0));
    }
  });

  syncPickrFormatFields(pickr, pickr.getColor().toHEXA().toString(0));
}

function createPickr(element, defaultColor, onChange, toastTarget) {
  const pickr = Pickr.create({
    el: element,
    theme: "nano",
    default: defaultColor,
    comparison: false,
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        hex: false,
        rgba: false,
        input: false,
        clear: false,
        save: false
      }
    }
  });

  installPickrFormatFields(pickr, onChange, toastTarget);

  pickr.on("show", color => syncPickrFormatFields(pickr, color.toHEXA().toString(0)));
  pickr.on("change", color => {
    const hex = color.toHEXA().toString(0);
    syncPickrFormatFields(pickr, hex);
    onChange(hex);
  });

  return pickr;
}
