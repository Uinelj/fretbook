export function mountChoiceMenu(trigger, menu, entries, getValue, onSelect) {
  const anchor = trigger.closest('.setting-anchor');
  const options = entries.map(([value, label]) => {
    const option = document.createElement('button');
    option.className = 'setting-option';
    option.type = 'button';
    option.tabIndex = -1;
    option.value = value;
    option.textContent = label;
    option.setAttribute('role', 'option');
    option.addEventListener('click', () => {
      onSelect(value);
      close(true);
    });
    return option;
  });
  menu.replaceChildren(...options);

  function close(returnFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  function open(fallbackIndex = 0) {
    const value = String(getValue());
    const selected = options.find(option => option.value === value);
    for (const option of options) option.setAttribute('aria-selected', String(option === selected));
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    const target = selected ?? options[fallbackIndex];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  trigger.addEventListener('click', () => {
    if (menu.hidden) open();
    else close();
  });
  trigger.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open(event.key === 'ArrowUp' ? options.length - 1 : 0);
  });
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    let next;
    switch (event.key) {
      case 'ArrowDown': next = (index + 1) % options.length; break;
      case 'ArrowUp': next = (index - 1 + options.length) % options.length; break;
      case 'Home': next = 0; break;
      case 'End': next = options.length - 1; break;
      case 'Escape': event.preventDefault(); close(true); return;
      default: return;
    }
    event.preventDefault();
    options[next].focus();
  });
  anchor.addEventListener('focusout', event => {
    if (!anchor.contains(event.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', event => {
    if (!anchor.contains(event.target)) close();
  });
}
