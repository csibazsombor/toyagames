function loadScript(url) {
  const script = document.createElement("script");
  script.src = url;
  script.type = "text/javascript";
  document.body.appendChild(script);
}

// Load the script
function loadScripts() {
loadScript(".js");
loadScript("extra.js");
}
