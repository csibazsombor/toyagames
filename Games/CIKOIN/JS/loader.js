function loadScript(url, isModule = false) {
  const script = document.createElement("script");
  script.src = url;
  script.type = isModule ? "module" : "text/javascript";
  document.body.appendChild(script);
}

function loadScripts() {
  loadScript("./JS/scoring-system.js");
  loadScript("./JS/skills.js");
  loadScript("./JS/match.js");
  loadScript("./JS/map.js", true);
}
