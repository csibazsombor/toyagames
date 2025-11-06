function loadScript(url) {
  const script = document.createElement("script");
  script.src = url;
  script.type = "text/javascript";
  document.body.appendChild(script);
}

function loadScripts() {
loadScript("./js/scoring-system.js");
loadScript("./js/skills.js");
loadScript("./js/match.js");

}
