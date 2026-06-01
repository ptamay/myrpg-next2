export const applyWeatherEffect = (parent: HTMLDivElement | null, weatherEffect: string) => {
  if (!parent) return;

  // Clear previous effects
  parent.innerHTML = "";

  // Remove old body classes
  document.body.classList.remove(
    "weather-clear",
    "weather-fog",
    "weather-rain",
    "weather-storm",
    "weather-snow",
    "weather-ember",
    "weather-sandstorm",
    "weather-eclipse",
    "weather-arcane",
    "weather-blizzard"
  );

  // Add new class
  document.body.classList.add(`weather-${weatherEffect}`);

  const criarParticulasDrifting = (count: number, type: string) => {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      let size = Math.random() * 4 + 2;
      let duration = Math.random() * 10 + 20;
      let delay = Math.random() * 20;
      let left = Math.random() * 100;
      let horizontalShift = Math.random() * 100 - 50;

      p.className = "particle";

      if (type === "clear") {
        p.style.background = "radial-gradient(circle, hsla(38, 95%, 60%, 0.8) 0%, transparent 80%)";
        p.style.boxShadow = "0 0 10px hsla(38, 95%, 60%, 0.4)";
      } else if (type === "fog") {
        size = Math.random() * 15 + 10;
        duration = Math.random() * 15 + 25;
        p.style.background = "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 80%)";
        p.style.filter = "blur(4px)";
      } else if (type === "ember") {
        size = Math.random() * 4 + 1.5;
        duration = Math.random() * 8 + 6;
        delay = Math.random() * 6;
        horizontalShift = Math.random() * 150 - 75;
        p.className = "ember-particle";
        p.style.setProperty("--ember-shift", `${horizontalShift}px`);
      } else if (type === "eclipse") {
        size = Math.random() * 3 + 1;
        duration = Math.random() * 12 + 15;
        p.style.background = Math.random() > 0.5 ? "rgba(150, 150, 200, 0.6)" : "rgba(80, 80, 100, 0.5)";
        p.style.boxShadow = "0 0 8px rgba(100, 100, 150, 0.3)";
      } else if (type === "arcane") {
        size = Math.random() * 5 + 2;
        duration = Math.random() * 12 + 12;
        delay = Math.random() * 12;
        horizontalShift = Math.random() * 120 - 60;
        const colors = [
          "radial-gradient(circle, rgba(236, 72, 153, 0.85) 0%, transparent 80%)",
          "radial-gradient(circle, rgba(139, 92, 246, 0.85) 0%, transparent 80%)",
          "radial-gradient(circle, rgba(16, 185, 129, 0.85) 0%, transparent 80%)",
          "radial-gradient(circle, rgba(59, 130, 246, 0.85) 0%, transparent 80%)",
        ];
        const colorGlows = [
          "0 0 12px rgba(236, 72, 153, 0.6)",
          "0 0 12px rgba(139, 92, 246, 0.6)",
          "0 0 12px rgba(16, 185, 129, 0.6)",
          "0 0 12px rgba(59, 130, 246, 0.6)",
        ];
        const colorIdx = Math.floor(Math.random() * colors.length);

        p.className = "arcane-particle";
        p.style.background = colors[colorIdx];
        p.style.boxShadow = colorGlows[colorIdx];
        p.style.setProperty("--arcane-shift", `${horizontalShift}px`);
      }

      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${left}%`;
      p.style.animationDelay = `${delay}s`;
      p.style.animationDuration = `${duration}s`;
      p.style.setProperty("--x-shift", `${horizontalShift}px`);

      parent.appendChild(p);
    }
  };

  const criarNevoasDrifting = () => {
    for (let i = 0; i < 4; i++) {
      const cloud = document.createElement("div");
      cloud.className = "mist-cloud";
      const size = Math.random() * 300 + 300;
      const top = Math.random() * 80;
      const delay = i * 10;
      const duration = Math.random() * 20 + 35;

      cloud.style.width = `${size}px`;
      cloud.style.height = `${size * 0.6}px`;
      cloud.style.top = `${top}%`;
      cloud.style.animationDelay = `${delay}s`;
      cloud.style.animationDuration = `${duration}s`;

      parent.appendChild(cloud);
    }
  };

  const criarChuva = (count: number, type: string) => {
    for (let i = 0; i < count; i++) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      const left = Math.random() * 110 - 5;
      const length = Math.random() * 20 + 20;
      const delay = Math.random() * 2;
      const duration = Math.random() * 0.4 + 0.8;

      drop.style.left = `${left}%`;
      drop.style.height = `${length}px`;
      drop.style.animationDelay = `${delay}s`;
      drop.style.animationDuration = `${duration}s`;

      if (type === "storm") {
        drop.style.animationName = "fallRain";
        drop.style.transform = "rotate(-10deg)";
      }

      parent.appendChild(drop);
    }
  };

  const criarNeve = (count: number) => {
    for (let i = 0; i < count; i++) {
      const flake = document.createElement("div");
      flake.className = "snowflake";
      const size = Math.random() * 4 + 2;
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = Math.random() * 4 + 6;
      const drift = Math.random() * 80 - 40;

      flake.style.width = `${size}px`;
      flake.style.height = `${size}px`;
      flake.style.left = `${left}%`;
      flake.style.animationDelay = `${delay}s`;
      flake.style.animationDuration = `${duration}s`;
      flake.style.setProperty("--snow-drift", `${drift}px`);

      parent.appendChild(flake);
    }
  };

  const criarNevasca = (count: number) => {
    for (let i = 0; i < count; i++) {
      const flake = document.createElement("div");
      flake.className = "blizzard-particle";
      const size = Math.random() * 5 + 3;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const delay = Math.random() * 3;
      const duration = Math.random() * 1.5 + 1.5;

      flake.style.width = `${size}px`;
      flake.style.height = `${size}px`;
      flake.style.top = `${top}%`;
      flake.style.left = `${left}%`;
      flake.style.animationDelay = `${delay}s`;
      flake.style.animationDuration = `${duration}s`;

      parent.appendChild(flake);
    }
  };

  const criarSandstorm = (count: number) => {
    for (let i = 0; i < count; i++) {
      const sand = document.createElement("div");
      sand.className = "sand-particle";
      const top = Math.random() * 100;
      const width = Math.random() * 50 + 30;
      const delay = Math.random() * 2;
      const duration = Math.random() * 0.6 + 0.8;

      sand.style.top = `${top}%`;
      sand.style.width = `${width}px`;
      sand.style.animationDelay = `${delay}s`;
      sand.style.animationDuration = `${duration}s`;

      parent.appendChild(sand);
    }
  };

  const criarRelampagos = () => {
    const flash = document.createElement("div");
    flash.className = "lightning-flash";
    parent.appendChild(flash);
  };

  const criarEclipseOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "eclipse-overlay";
    parent.appendChild(overlay);
  };

  switch (weatherEffect) {
    case "clear":
      criarParticulasDrifting(25, "clear");
      break;
    case "fog":
      criarNevoasDrifting();
      criarParticulasDrifting(15, "fog");
      break;
    case "rain":
      criarChuva(60, "rain");
      break;
    case "storm":
      criarChuva(90, "storm");
      criarRelampagos();
      break;
    case "snow":
      criarNeve(45);
      break;
    case "ember":
      criarParticulasDrifting(40, "ember");
      break;
    case "sandstorm":
      criarSandstorm(60);
      break;
    case "eclipse":
      criarEclipseOverlay();
      criarParticulasDrifting(20, "eclipse");
      break;
    case "arcane":
      criarParticulasDrifting(35, "arcane");
      break;
    case "blizzard":
      criarNevasca(120);
      break;
    default:
      criarParticulasDrifting(25, "clear");
  }
};
