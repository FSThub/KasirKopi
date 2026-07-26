/** Keluar dari sesi kasir lalu arahkan ke halaman login. */
export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* abaikan — tetap arahkan ke login */
  }
  window.location.href = "/login";
}
