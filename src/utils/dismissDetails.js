export function dismissDetails(details, document) {
  const outside = event => {
    if (details.open && !details.contains(event.target)) details.open=false;
  };
  const escape = event => {
    if (event.key!=="Escape" || !details.open) return;
    details.open=false;
    details.querySelector("summary")?.focus();
    event.preventDefault();
  };
  document.addEventListener("pointerdown",outside);
  document.addEventListener("focusin",outside);
  document.addEventListener("keydown",escape);
  return ()=>{
    document.removeEventListener("pointerdown",outside);
    document.removeEventListener("focusin",outside);
    document.removeEventListener("keydown",escape);
  };
}
