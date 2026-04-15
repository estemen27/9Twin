(function () {
  const palette = {
    bg: "#0D1321",
    card: "#151D31",
    gold: "#6EA8FF",
    goldLight: "#C7DCFF",
    green: "#4ADE80",
    yellow: "#FACC15",
    red: "#F87171",
    text: "#F3F6FF",
    muted: "#A7B0C5",
    grid: "rgba(167,176,197,0.16)",
  };

  function baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: palette.text, boxWidth: 14 } },
        tooltip: {
          backgroundColor: "rgba(13,19,33,0.96)",
          borderColor: "rgba(167,176,197,0.35)",
          borderWidth: 1,
          titleColor: palette.goldLight,
          bodyColor: palette.text,
          padding: 10,
        },
      },
      scales: {
        x: { ticks: { color: palette.muted }, grid: { color: palette.grid } },
        y: { ticks: { color: palette.muted }, grid: { color: palette.grid } },
      },
    };
  }

  window.ChartKit = {
    createLine: function createLine(ctx, labels, datasets) {
      if (!window.Chart || !ctx) return null;
      return new Chart(ctx, {
        type: "line",
        data: { labels: labels, datasets: datasets },
        options: baseOptions(),
      });
    },
    createBar: function createBar(ctx, labels, datasets) {
      if (!window.Chart || !ctx) return null;
      return new Chart(ctx, {
        type: "bar",
        data: { labels: labels, datasets: datasets },
        options: baseOptions(),
      });
    },
    createRadar: function createRadar(ctx, labels, datasets) {
      if (!window.Chart || !ctx) return null;
      const options = baseOptions();
      options.scales = {
        r: {
          angleLines: { color: palette.grid },
          grid: { color: palette.grid },
          pointLabels: { color: palette.text },
          ticks: { backdropColor: "transparent", color: palette.muted },
          suggestedMin: 0,
          suggestedMax: 1,
        },
      };
      return new Chart(ctx, {
        type: "radar",
        data: { labels: labels, datasets: datasets },
        options: options,
      });
    },
  };
})();
