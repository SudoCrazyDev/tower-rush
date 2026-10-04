/** HTML box for typing a friend's challenge code (same look as the sign-in panel). */
import { ensureCss } from "./authOverlay";
import { normalizeCode } from "../../shared/pvp.ts";

/** Resolves with the code, or null if cancelled. */
export function askCode(): Promise<string | null> {
  ensureCss();
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "tr-auth";
    root.innerHTML = `
      <form>
        <h2>Join a challenge</h2>
        <p>Enter the 6-character code your friend shared.</p>
        <input name="code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false"
          placeholder="ABC123" style="text-align:center;font-size:26px;letter-spacing:6px;text-transform:uppercase" />
        <div class="err"></div>
        <button type="submit" class="primary">JOIN</button>
        <button type="button" class="link">Cancel</button>
      </form>`;
    document.body.appendChild(root);
    const form = root.querySelector("form")!;
    const input = root.querySelector("input")!;
    const err = root.querySelector(".err")!;
    const done = (code: string | null) => {
      root.remove();
      resolve(code);
    };
    input.oninput = () => (input.value = normalizeCode(input.value));
    form.onsubmit = (e) => {
      e.preventDefault();
      const code = normalizeCode(input.value);
      if (code.length !== 6) return void (err.textContent = "Codes have 6 characters");
      done(code);
    };
    (root.querySelector(".link") as HTMLButtonElement).onclick = () => done(null);
    root.onclick = (e) => e.target === root && done(null);
    setTimeout(() => input.focus(), 50);
  });
}
