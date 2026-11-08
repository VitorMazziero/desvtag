import { pickDriveFile } from "./picker";

const fragment = new URLSearchParams(window.location.hash.slice(1));
window.history.replaceState(null, "", window.location.pathname);
const redirect = fragment.get("redirect");
const state = fragment.get("state");
const token = fragment.get("token");
const status = document.getElementById("status");

async function select() {
  if (
    !redirect ||
    !/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(redirect) ||
    !state ||
    !/^[A-Za-z0-9_-]{43}$/.test(state) ||
    !token
  ) {
    if (status) status.textContent = "Open this page from the Windows application.";
    return;
  }
  const callback = new URL(redirect);
  callback.searchParams.set("state", state);
  try {
    const file = await pickDriveFile(token);
    if (file) callback.searchParams.set("code", file.id);
    else callback.searchParams.set("error", "cancelled");
  } catch {
    callback.searchParams.set("error", "picker_unavailable");
  }
  window.location.replace(callback.href);
}

void select();
