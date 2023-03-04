
const KEYBUFFER_SIZE = 256;
export const keyBuffer = Array<number>(KEYBUFFER_SIZE).fill(0);

function onKeyDown(e: KeyboardEvent) {
  if(e.keyCode >= KEYBUFFER_SIZE) return;
  keyBuffer[e.keyCode] = 1;
  console.log(e.keyCode, e.code);
  e.preventDefault();
}

function onKeyUp(e: KeyboardEvent) {
  if(e.keyCode >= KEYBUFFER_SIZE) return;
  keyBuffer[e.keyCode] = 0;
  e.preventDefault();
}

export function initKeyBuffer() {
  window.addEventListener('keydown', onKeyDown, false);
  window.addEventListener('keyup', onKeyUp, false);
}

