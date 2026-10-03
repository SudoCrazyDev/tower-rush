/**
 * HTML sign-in panel shown over the canvas (text inputs are much nicer in the DOM than
 * in Phaser). Resolves once the player is signed in.
 */
import { ApiError } from "./api";
import { playAsGuest, register, signIn } from "./save";

const CSS = `
.tr-auth { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10;
  background: rgba(5, 8, 30, 0.55); font-family: 'Lilita One', 'Arial Black', sans-serif; }
.tr-auth form { width: min(360px, calc(100vw - 32px)); background: #1b2257; border: 5px solid #f2b630; border-radius: 22px;
  padding: 22px 22px 18px; box-shadow: 0 8px 0 #14183a, 0 18px 40px rgba(0,0,0,.5); color: #fff; text-align: center; }
.tr-auth h2 { margin: 0 0 4px; font-size: 30px; color: #fff4c2; text-shadow: 0 3px 0 #14183a; font-weight: 400; }
.tr-auth p { margin: 0 0 14px; color: #c9d2ff; font-family: system-ui, sans-serif; font-size: 14px; }
.tr-auth input { width: 100%; box-sizing: border-box; margin: 0 0 10px; padding: 12px 14px; border-radius: 12px; border: 3px solid #14183a;
  font: 16px system-ui, sans-serif; background: #fff; color: #14183a; }
.tr-auth button { width: 100%; padding: 12px; margin-top: 6px; border: 3px solid #14183a; border-radius: 14px; cursor: pointer;
  font: 22px 'Lilita One', 'Arial Black', sans-serif; color: #fff; text-shadow: 0 2px 0 #14183a; box-shadow: 0 4px 0 #14183a; }
.tr-auth button:active { transform: translateY(2px); box-shadow: 0 2px 0 #14183a; }
.tr-auth button:disabled { opacity: .6; cursor: default; }
.tr-auth .primary { background: linear-gradient(#ffd23a, #f29b16); }
.tr-auth .green { background: linear-gradient(#78e04f, #3aa62a); }
.tr-auth .link { background: none; border: none; box-shadow: none; color: #9fd0ff; font: 15px system-ui, sans-serif; text-shadow: none;
  text-decoration: underline; padding: 6px; }
.tr-auth .err { color: #ff8a8a; min-height: 18px; font: 14px system-ui, sans-serif; margin: 2px 0 4px; }
`;

type Mode = "start" | "signin" | "register";

function ensureCss() {
  if (document.getElementById("tr-auth-css")) return;
  const style = document.createElement("style");
  style.id = "tr-auth-css";
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function showAuth(opts: { mode?: Mode; title?: string; canClose?: boolean } = {}): Promise<boolean> {
  ensureCss();
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "tr-auth";
    document.body.appendChild(root);
    const done = (ok: boolean) => {
      root.remove();
      resolve(ok);
    };

    const render = (mode: Mode) => {
      root.innerHTML = "";
      const form = document.createElement("form");
      root.appendChild(form);
      const h = (tag: string, props: Record<string, string | number> = {}, text = "") => {
        const el = document.createElement(tag);
        Object.assign(el, props);
        if (text) el.textContent = text;
        form.appendChild(el);
        return el;
      };
      if (mode === "start") {
        h("h2", {}, opts.title ?? "Welcome!");
        h("p", {}, "Play right away, or sign in to keep your progress on any device.");
        const guest = h("button", { type: "button", className: "primary" }, "PLAY AS GUEST") as HTMLButtonElement;
        const err = h("div", { className: "err" });
        h("button", { type: "button", className: "green" }, "SIGN IN").onclick = () => render("signin");
        h("button", { type: "button", className: "link" }, "Create an account").onclick = () => render("register");
        guest.onclick = async () => {
          guest.disabled = true;
          try {
            await playAsGuest();
            done(true);
          } catch (e) {
            err.textContent = (e as Error).message;
            guest.disabled = false;
          }
        };
        return;
      }
      const isReg = mode === "register";
      h("h2", {}, opts.title && mode === opts.mode ? opts.title : isReg ? "Create account" : "Sign in");
      h("p", {}, isReg ? "Your current progress is kept." : "Welcome back, commander.");
      const user = h("input", { placeholder: "Username", autocomplete: "username", maxLength: 20 }) as HTMLInputElement;
      const pass = h("input", { placeholder: "Password", type: "password", autocomplete: isReg ? "new-password" : "current-password" }) as HTMLInputElement;
      const err = h("div", { className: "err" });
      const submit = h("button", { type: "submit", className: "primary" }, isReg ? "CREATE" : "SIGN IN") as HTMLButtonElement;
      if (opts.canClose) h("button", { type: "button", className: "link" }, "Cancel").onclick = () => done(false);
      else h("button", { type: "button", className: "link" }, "Back").onclick = () => render("start");
      form.onsubmit = async (ev) => {
        ev.preventDefault();
        submit.disabled = true;
        err.textContent = "";
        try {
          if (isReg) await register(user.value.trim(), pass.value);
          else await signIn(user.value.trim(), pass.value);
          done(true);
        } catch (e) {
          err.textContent = e instanceof ApiError && e.data.error === "banned" ? "This account is banned." : (e as Error).message;
          submit.disabled = false;
        }
      };
      setTimeout(() => user.focus(), 50);
    };
    render(opts.mode ?? "start");
  });
}

/** Full-screen message with an optional button (server down, banned...). */
export function showBlocker(title: string, message: string, action?: { label: string; onClick: () => void }) {
  ensureCss();
  document.querySelectorAll(".tr-auth").forEach((n) => n.remove());
  const root = document.createElement("div");
  root.className = "tr-auth";
  const form = document.createElement("form");
  const h2 = document.createElement("h2");
  h2.textContent = title;
  const p = document.createElement("p");
  p.textContent = message;
  form.append(h2, p);
  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "primary";
    b.textContent = action.label;
    b.onclick = () => {
      root.remove();
      action.onClick();
    };
    form.appendChild(b);
  }
  root.appendChild(form);
  document.body.appendChild(root);
}
