function loadScript(url, isModule = false) {
  const script = document.createElement("script");
  script.src = url;
  script.type = isModule ? "module" : "text/javascript";
  document.body.appendChild(script);
}

function loadScripts() {
  loadScript("./js/scoring-system.js");
  loadScript("./js/skills.js");
  loadScript("./js/match.js");
  loadScript("./js/map.js", true);
}
