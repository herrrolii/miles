const DATA_URL = "https://your-data-host.example/heatmap-data.json";

const target = document.getElementById("heatmap");
RunHeatmap.mount(target, {
  dataUrl: DATA_URL,
  theme: "light",
});
