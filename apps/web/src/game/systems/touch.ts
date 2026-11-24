export const touchInput = { up: false, down: false, left: false, right: false, interact: false };
export function press(direction: keyof typeof touchInput, value: boolean) {
  touchInput[direction] = value;
  if (direction === 'interact' && value) window.setTimeout(() => { touchInput.interact = false; }, 120);
}
