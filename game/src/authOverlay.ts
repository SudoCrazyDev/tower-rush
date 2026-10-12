/**
 * HTML sign-in panel shown over the canvas (text inputs are much nicer in the DOM than
 * in Phaser): sign in, register, forgot/reset password, and account settings.
 */
import { ApiError } from "./api";
import { account, changePassword, forgotPassword, inviteOnly, playAsGuest, register, resendEmailCode, resetPassword, setEmail, setMarketing, signIn, verifyEmail } from "./save";
import { mountTurnstile } from "./turnstile";
import { BASE } from "./assets";

/**
 * Styled with the game's own art: the gold-framed dialog panel (title on its ribbon), the
 * 9-slice buttons and the logo. Slice sizes match the Phaser versions in ui.ts.
 */
const css = (base: string) => `
@keyframes tr-pop { from { transform: scale(.9); opacity: 0; } }
@keyframes tr-fade { from { opacity: 0; } }
.tr-auth { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: safe center;
  overflow-y: auto; padding: 16px 0; box-sizing: border-box; z-index: 10; animation: tr-fade .15s;
  background: radial-gradient(ellipse at center, rgba(8, 14, 48, .45), rgba(3, 5, 20, .82));
  backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); font-family: 'Lilita One', 'Arial Black', sans-serif; }
.tr-auth.brand::before { content: ""; flex: none; width: min(300px, 72vw); aspect-ratio: 640 / 449; margin: 0 0 -6px; position: relative; z-index: 1;
  background: url(${base}ui/logo.webp?v=1.3.0) center / contain no-repeat; filter: drop-shadow(0 8px 14px rgba(0,0,0,.55));
  animation: tr-pop .2s cubic-bezier(.34,1.56,.64,1); pointer-events: none; }
@media (max-height: 760px) { .tr-auth.brand::before { display: none; } }
.tr-auth form { flex: none; width: min(400px, calc(100vw - 24px)); box-sizing: border-box; position: relative; color: #fff; text-align: center;
  border-style: solid; border-width: 66px 46px 36px;
  border-image: url(${base}ui/panel_dialog.webp) 110 80 60 / 66px 48px 36px stretch;
  background: linear-gradient(#0d2150, #112656) padding-box; padding: 0 8px 4px;
  filter: drop-shadow(0 14px 22px rgba(0,0,0,.55)); animation: tr-pop .18s cubic-bezier(.34,1.56,.64,1); }
.tr-auth h2 { margin: -49px -30px 26px; font-size: 27px; line-height: 32px; font-weight: 400; color: #fff4c2; white-space: nowrap;
  -webkit-text-stroke: 6px #14183a; paint-order: stroke fill; text-shadow: 0 3px 0 #14183a; }
.tr-auth p { margin: 0 0 14px; color: #c9d2ff; font: 14px/1.45 system-ui, sans-serif; }
.tr-auth input { width: 100%; box-sizing: border-box; margin: 0 0 10px; padding: 12px 14px; border-radius: 12px; border: 3px solid #050c26;
  font: 16px system-ui, sans-serif; background: #071434; color: #fff; outline: none;
  box-shadow: inset 0 3px 0 rgba(0,0,0,.4), 0 1px 0 rgba(255,255,255,.12); transition: border-color .12s, box-shadow .12s; }
.tr-auth input::placeholder { color: #7f8fc4; }
.tr-auth input:focus { border-color: #f2b630; box-shadow: inset 0 3px 0 rgba(0,0,0,.4), 0 0 0 3px rgba(242,182,48,.28); }
.tr-auth input[readonly] { color: #ffd27a; background: #0b1a40; border-style: dashed; }
.tr-auth input:-webkit-autofill { -webkit-text-fill-color: #fff; caret-color: #fff; box-shadow: inset 0 0 0 40px #071434; }
.tr-auth button { width: 100%; height: 60px; margin-top: 6px; padding: 0; cursor: pointer; background: none; color: #fff;
  border-style: solid; border-width: 19px 23px 21px; border-image: url(${base}ui/button_1.webp) 40 48 44 fill / 19px 23px 21px stretch;
  font: 24px/14px 'Lilita One', 'Arial Black', sans-serif; letter-spacing: .5px;
  -webkit-text-stroke: 5px #14183a; paint-order: stroke fill; text-shadow: 0 2px 0 #14183a;
  filter: drop-shadow(0 4px 0 rgba(5,8,30,.55)); transition: transform .08s, filter .08s; }
.tr-auth button:hover:not(:disabled) { filter: drop-shadow(0 4px 0 rgba(5,8,30,.55)) brightness(1.08); }
.tr-auth button:active:not(:disabled) { transform: translateY(3px) scale(.98); filter: drop-shadow(0 1px 0 rgba(5,8,30,.55)); }
.tr-auth button:disabled { filter: grayscale(.6) brightness(.75); cursor: default; }
.tr-auth .primary { border-image-source: url(${base}ui/button_1.webp); }
.tr-auth .green { border-image-source: url(${base}ui/button_0.webp); }
.tr-auth .blue { border-image-source: url(${base}ui/button_2.webp); }
.tr-auth .link { width: auto; height: auto; border: none; border-image: none; filter: none; display: block; margin: 8px auto 0; padding: 6px 10px;
  color: #ffd27a; font: 600 15px system-ui, sans-serif; -webkit-text-stroke: 0; text-shadow: 0 1px 0 #050c26; letter-spacing: 0; }
.tr-auth .link:hover:not(:disabled) { filter: none; color: #fff4c2; text-decoration: underline; }
.tr-auth .err { color: #ff8a8a; min-height: 18px; font: 14px system-ui, sans-serif; margin: 2px 0 4px; }
.tr-auth .ok { color: #8ee07a; font: 14px system-ui, sans-serif; margin: 2px 0 4px; }
.tr-auth .ok:empty { display: none; }
.tr-auth .warn { color: #ffd27a; font: 14px system-ui, sans-serif; }
.tr-auth input.code { text-align: center; letter-spacing: 10px; font: 26px 'Lilita One', 'Arial Black', sans-serif; }
.tr-auth input.code::placeholder { letter-spacing: normal; font: 16px system-ui, sans-serif; }
.tr-auth .check { display: flex; gap: 10px; align-items: center; text-align: left; margin: 2px 0 8px; color: #c9d2ff;
  font: 14px system-ui, sans-serif; cursor: pointer; }
.tr-auth .check input { appearance: none; -webkit-appearance: none; width: 24px; height: 24px; margin: 0; padding: 0; flex: none; cursor: pointer;
  border-radius: 7px; display: grid; place-content: center; }
.tr-auth .check input:checked { background: linear-gradient(#ffd23a, #f29b16); border-color: #14183a; }
.tr-auth .check input:checked::after { content: "\\2714"; color: #14183a; font: 900 15px system-ui, sans-serif; }
.tr-auth .ts { display: flex; justify-content: center; }
.tr-auth .ts:has(iframe) { margin: 0 0 8px; }
.tr-auth .box { background: rgba(3, 8, 30, .55); border: 2px solid #050c26; border-radius: 14px; padding: 12px; margin: 0 0 12px;
  font: 14px system-ui, sans-serif; box-shadow: inset 0 2px 0 rgba(0,0,0,.35); }
.tr-auth .box .label { color: #9aa3d8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
.tr-auth .box .value { color: #fff; font-size: 17px; margin: 2px 0 4px; word-break: break-all; }
`;

type Mode = "start" | "signin" | "register" | "forgot" | "reset";

export function ensureCss() {
  if (document.getElementById("tr-auth-css")) return;
  const style = document.createElement("style");
  style.id = "tr-auth-css";
  style.textContent = css(BASE);
  document.head.appendChild(style);
}

/** A form builder: `h` appends a child element to the form. */
function formKit(form: HTMLFormElement) {
  const h = (tag: string, props: Record<string, string | number | boolean> = {}, text = "", parent: HTMLElement = form) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    if (text) el.textContent = text;
    parent.appendChild(el);
    return el;
  };
  const input = (placeholder: string, props: Record<string, string | number | boolean> = {}) => h("input", { placeholder, ...props }) as HTMLInputElement;
  const codeInput = () => input("6-digit code", { inputMode: "numeric", autocomplete: "one-time-code", maxLength: 6, pattern: "[0-9]*", className: "code" });
  return { h, input, codeInput };
}

const errText = (e: unknown) => (e instanceof ApiError && e.data.error === "banned" ? "This account is banned." : (e as Error).message);

/** Run a form action with the button disabled and the error line updated. */
async function attempt(submit: HTMLButtonElement, err: HTMLElement, fn: () => Promise<void>) {
  submit.disabled = true;
  err.textContent = "";
  try {
    await fn();
  } catch (e) {
    err.textContent = errText(e);
  } finally {
    submit.disabled = false;
  }
}

/** An invite from the link in the invitation email (`?invite=`): its token and the address it went to. */
export interface Invite {
  token: string;
  email: string;
}

export function showAuth(opts: { mode?: Mode; title?: string; canClose?: boolean; invite?: Invite; notice?: string } = {}): Promise<boolean> {
  ensureCss();
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "tr-auth brand";
    document.body.appendChild(root);
    const done = (ok: boolean) => {
      root.remove();
      resolve(ok);
    };
    // Remembered between the "forgot" and "reset" screens.
    let resetEmail = "";
    let resetNote = "";

    const render = (mode: Mode) => {
      root.innerHTML = "";
      const form = document.createElement("form");
      root.appendChild(form);
      const { h, input, codeInput } = formKit(form);
      const back = (label = "Back", to: Mode = "start") => {
        if (opts.canClose && to === "start") h("button", { type: "button", className: "link" }, "Cancel").onclick = () => done(false);
        else h("button", { type: "button", className: "link" }, label).onclick = () => render(to);
      };

      if (mode === "start") {
        h("h2", {}, opts.title ?? "Welcome!");
        if (inviteOnly && !opts.invite) {
          // Staging: accounts come only from the link in an invitation email.
          h("p", {}, "This server is invite only. Sign in, or open the link in your invitation email.");
          h("div", { className: "err" }, opts.notice ?? "");
          h("button", { type: "button", className: "green" }, "SIGN IN").onclick = () => render("signin");
          return;
        }
        h("p", {}, "Play right away, or sign in to keep your progress on any device.");
        const guest = h("button", { type: "button", className: "primary" }, "PLAY AS GUEST") as HTMLButtonElement;
        const err = h("div", { className: "err" }, opts.notice ?? "");
        h("button", { type: "button", className: "green" }, "SIGN IN").onclick = () => render("signin");
        h("button", { type: "button", className: "link" }, "Create an account").onclick = () => render("register");
        guest.onclick = () => attempt(guest, err, async () => (await playAsGuest(), done(true)));
        return;
      }

      if (mode === "forgot") {
        h("h2", {}, "Forgot password");
        h("p", {}, "Enter your account's email. We'll send you a 6-digit code.");
        const email = input("Email", { type: "email", autocomplete: "email", value: resetEmail });
        const check = mountTurnstile(h("div", { className: "ts" }), "forgot", (m) => (err.textContent = m));
        const err = h("div", { className: "err" });
        const submit = h("button", { type: "submit", className: "primary" }, "SEND CODE") as HTMLButtonElement;
        h("button", { type: "button", className: "link" }, "I already have a code").onclick = () => ((resetEmail = email.value.trim()), render("reset"));
        back("Back", "signin");
        form.onsubmit = (ev) => {
          ev.preventDefault();
          attempt(submit, err, async () => {
            try {
              const minutes = await forgotPassword(email.value.trim(), await check.token());
              resetEmail = email.value.trim();
              resetNote = `If ${resetEmail} belongs to an account, a code is on its way. It works for ${minutes} minutes.`;
              render("reset");
            } finally {
              check.reset();
            }
          });
        };
        setTimeout(() => email.focus(), 50);
        return;
      }

      if (mode === "reset") {
        h("h2", {}, "New password");
        h("p", {}, resetNote || "Enter the code from the email and choose a new password.");
        const email = input("Email", { type: "email", autocomplete: "email", value: resetEmail });
        const code = codeInput();
        const pass = input("New password (6+ characters)", { type: "password", autocomplete: "new-password" });
        const err = h("div", { className: "err" });
        const submit = h("button", { type: "submit", className: "primary" }, "SET PASSWORD") as HTMLButtonElement;
        h("button", { type: "button", className: "link" }, "Send a new code").onclick = () => ((resetEmail = email.value.trim()), render("forgot"));
        back("Back", "signin");
        form.onsubmit = (ev) => {
          ev.preventDefault();
          attempt(submit, err, async () => {
            await resetPassword(email.value.trim(), code.value.trim(), pass.value);
            done(true);
          });
        };
        setTimeout(() => (resetEmail ? code : email).focus(), 50);
        return;
      }

      const isReg = mode === "register";
      const invite = isReg ? opts.invite : undefined;
      h("h2", {}, invite ? "You're invited!" : opts.title && mode === opts.mode ? opts.title : isReg ? "Create account" : "Sign in");
      h("p", {}, invite ? "Choose a username and password for your account." : isReg ? "Your current progress is kept." : "Welcome back, commander.");
      const user = input(isReg ? "Username" : "Username or email", { autocomplete: "username", maxLength: isReg ? 20 : 254 });
      const email = isReg
        ? input("Email (for password recovery)", { type: "email", autocomplete: "email", maxLength: 254, value: invite?.email ?? "", readOnly: !!invite })
        : null;
      const pass = input(isReg ? "Password (6+ characters)" : "Password", { type: "password", autocomplete: isReg ? "new-password" : "current-password" });
      let marketing: HTMLInputElement | null = null;
      if (isReg) {
        const label = h("label", { className: "check" });
        marketing = h("input", { type: "checkbox" }, "", label) as HTMLInputElement;
        h("span", {}, "Send me news, events and gifts by email", label);
      }
      const check = mountTurnstile(h("div", { className: "ts" }), isReg ? "register" : "login", (m) => (err.textContent = m));
      const err = h("div", { className: "err" });
      const submit = h("button", { type: "submit", className: "primary" }, isReg ? "CREATE" : "SIGN IN") as HTMLButtonElement;
      if (!isReg) h("button", { type: "button", className: "link" }, "Forgot password?").onclick = () => render("forgot");
      if (invite) h("button", { type: "button", className: "link" }, "I already have an account").onclick = () => render("signin");
      else back();
      form.onsubmit = (ev) => {
        ev.preventDefault();
        attempt(submit, err, async () => {
          try {
            const token = await check.token();
            if (isReg)
              await register(
                { username: user.value.trim(), email: email!.value.trim(), password: pass.value, marketing: marketing!.checked, invite: invite?.token },
                token,
              );
            else await signIn(user.value.trim(), pass.value, token);
            done(true);
          } finally {
            check.reset();
          }
        });
      };
      setTimeout(() => user.focus(), 50);
    };
    render(opts.mode ?? "start");
  });
}

/**
 * Account settings for a registered player: confirm or change the email, newsletter
 * consent, and change the password. Resolves when closed.
 */
export function showAccount(): Promise<void> {
  ensureCss();
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "tr-auth";
    document.body.appendChild(root);
    const close = () => (root.remove(), resolve());

    type Screen = "main" | "email" | "password";
    const render = (screen: Screen, note = "") => {
      root.innerHTML = "";
      const form = document.createElement("form");
      root.appendChild(form);
      const { h, input, codeInput } = formKit(form);
      const backBtn = () => (h("button", { type: "button", className: "link" }, "Back").onclick = () => render("main"));

      if (screen === "main") {
        h("h2", {}, "Account");
        h("p", {}, `Signed in as ${account.username}`);
        const box = h("div", { className: "box" });
        h("div", { className: "label" }, "Email", box);
        h("div", { className: "value" }, account.email ?? "No email yet", box);
        if (account.email) h("div", { className: account.emailVerified ? "ok" : "warn" }, account.emailVerified ? "Confirmed" : "Not confirmed yet", box);
        else h("div", { className: "warn" }, "Add one so you can reset your password.", box);
        const err = h("div", { className: "err" });
        const msg = h("div", { className: "ok" }, note);
        if (account.email && !account.emailVerified) {
          const code = codeInput();
          const verify = h("button", { type: "submit", className: "green" }, "CONFIRM EMAIL") as HTMLButtonElement;
          form.onsubmit = (ev) => {
            ev.preventDefault();
            attempt(verify, err, async () => {
              await verifyEmail(code.value.trim());
              render("main", "Email confirmed!");
            });
          };
          const resend = h("button", { type: "button", className: "link" }, "Send the code again") as HTMLButtonElement;
          resend.onclick = () =>
            attempt(resend, err, async () => {
              await resendEmailCode();
              msg.textContent = `A new code was sent to ${account.email}.`;
            });
        } else form.onsubmit = (ev) => ev.preventDefault();
        h("button", { type: "button", className: "primary" }, account.email ? "CHANGE EMAIL" : "ADD EMAIL").onclick = () => render("email");
        h("button", { type: "button", className: "primary" }, "CHANGE PASSWORD").onclick = () => render("password");
        const label = h("label", { className: "check" });
        const news = h("input", { type: "checkbox", checked: account.marketingOptIn }, "", label) as HTMLInputElement;
        h("span", {}, "Send me news, events and gifts by email", label);
        news.onchange = () =>
          setMarketing(news.checked).catch((e) => {
            news.checked = account.marketingOptIn;
            err.textContent = errText(e);
          });
        h("button", { type: "button", className: "link" }, "Close").onclick = close;
        return;
      }

      if (screen === "email") {
        h("h2", {}, account.email ? "Change email" : "Add email");
        h("p", {}, "We'll send a code to confirm it.");
        const email = input("New email", { type: "email", autocomplete: "email", value: account.email ?? "" });
        const pass = input("Your password", { type: "password", autocomplete: "current-password" });
        const err = h("div", { className: "err" });
        const submit = h("button", { type: "submit", className: "primary" }, "SAVE") as HTMLButtonElement;
        backBtn();
        form.onsubmit = (ev) => {
          ev.preventDefault();
          attempt(submit, err, async () => {
            await setEmail(email.value.trim(), pass.value);
            render("main", account.emailVerified ? "" : `Code sent to ${account.email}.`);
          });
        };
        setTimeout(() => email.focus(), 50);
        return;
      }

      h("h2", {}, "Change password");
      h("p", {}, "Your other devices will be signed out.");
      h("input", { type: "text", autocomplete: "username", value: account.username ?? "", hidden: true });
      const current = input("Current password", { type: "password", autocomplete: "current-password" });
      const pass = input("New password (6+ characters)", { type: "password", autocomplete: "new-password" });
      const err = h("div", { className: "err" });
      const submit = h("button", { type: "submit", className: "primary" }, "SAVE") as HTMLButtonElement;
      backBtn();
      form.onsubmit = (ev) => {
        ev.preventDefault();
        attempt(submit, err, async () => {
          await changePassword(current.value, pass.value);
          render("main", "Password changed.");
        });
      };
      setTimeout(() => current.focus(), 50);
    };
    render("main");
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
