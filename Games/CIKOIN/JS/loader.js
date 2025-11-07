function loadScript(url, isModule = false) {
  const script = document.createElement("script");
  script.src = url;
  script.type = isModule ? "module" : "text/javascript";
  document.body.appendChild(script);
}

function loadScripts() {
  loadScript("./JS/match.js");
}
