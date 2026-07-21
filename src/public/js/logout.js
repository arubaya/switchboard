// ponytail: Basic Auth logout is best-effort — browsers cache credentials differently.
// Upgrade path: session cookies when auth model changes.

if (!window.location.search.includes("done=1")) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `${window.location.origin}/api/routes`, true, "logout", "logout");
  xhr.onload = () => {
    window.location.replace("/logout?done=1");
  };
  xhr.onerror = () => {
    window.location.replace("/logout?done=1");
  };
  xhr.send();
}
