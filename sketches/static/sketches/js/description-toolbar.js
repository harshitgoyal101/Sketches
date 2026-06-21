document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-description-toolbar]").forEach((toolbar) => {
    const textarea = toolbar.parentElement?.querySelector(".sketch-description-input");
    if (!textarea) return;

    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-format]");
      if (!button) return;
      event.preventDefault();
      applyFormat(textarea, button.dataset.format);
    });
  });
});

function applyFormat(textarea, format) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const placeholder = "text";

  const formats = {
    bold: { before: "**", after: "**" },
    underline: { before: "<u>", after: "</u>" },
  };
  const config = formats[format];
  if (!config) return;

  const content = selected || placeholder;
  const replacement = `${config.before}${content}${config.after}`;
  textarea.setRangeText(replacement, start, end, "end");

  const focusStart = start + config.before.length;
  const focusEnd = focusStart + content.length;
  textarea.focus();
  textarea.setSelectionRange(focusStart, focusEnd);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
