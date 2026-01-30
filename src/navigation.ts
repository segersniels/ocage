export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function getPathSegments(): string[] {
  return window.location.pathname.split("/").filter(Boolean);
}
