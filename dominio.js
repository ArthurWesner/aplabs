document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("domain-input");
  const searchBtn = document.getElementById("search-btn");
  const resultMessage = document.getElementById("result-message");
  const body = document.body;
  const planet = document.querySelector(".planet"); // Seleciona o planeta

  function setStatus(status) {
    body.classList.remove("status-default", "status-success", "status-error");
    body.classList.add(`status-${status}`);
  }

  // Função para reiniciar a animação de rotação e acompanhar a luz
  function spinPlanet() {
    if (planet) {
      planet.classList.remove("spin");
      void planet.offsetWidth; // Força o reflow do navegador para reiniciar a animação
      planet.classList.add("spin");
    }
  }

  searchBtn.addEventListener("click", () => {
    let domain = input.value.trim().toLowerCase();

    if (!domain) {
      input.focus();
      setStatus("default");
      resultMessage.classList.remove("show");
      return;
    }

    input.blur();

    if (!domain.includes(".")) {
      domain += ".com.br";
      input.value = domain.toUpperCase();
    }

    resultMessage.classList.remove("show");

    if (domain.endsWith(".br")) {
      fetch(`https://rdap.registro.br/domain/${domain}`)
        .then((response) => {
          resultMessage.classList.add("show");
          
          // spinPlanet() removido para evitar animações indesejadas no iPhone

          if (response.status === 404) {
            setStatus("success");
            resultMessage.innerHTML = `LIVRE PARA REGISTRO`;
          } else if (response.status === 200) {
            setStatus("error");
            resultMessage.innerHTML = `DOMÍNIO INDISPONÍVEL`;
          } else {
            setStatus("error");
            resultMessage.innerHTML = `FORMATO INVÁLIDO`;
          }
        })
        .catch((error) => {
          // spinPlanet() removido
          setStatus("error");
          resultMessage.classList.add("show");
          resultMessage.innerHTML = `ERRO DE CONEXÃO`;
        });
    } else {
      // spinPlanet() removido
      setStatus("error");
      resultMessage.classList.add("show");
      resultMessage.innerHTML = `CONSULTAMOS APENAS .BR`;
    }
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  input.addEventListener("input", () => {
    let value = input.value;
    
    // Mantém apenas letras, números, pontos e hífens
    value = value.replace(/[^a-zA-Z0-9.-]/g, "");
    
    // Força letras maiúsculas
    input.value = value.toUpperCase();

    if (input.value === "") {
      setStatus("default");
      resultMessage.classList.remove("show");
    }
  });

  const canvas = document.getElementById("stars-canvas");
  const ctx = canvas.getContext("2d");
  let width, height;
  let stars = [];

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = [];
    const numStars = window.innerWidth < 600 ? 120 : 350;

    const safeZoneTop = height * 0.4;
    const safeZoneBottom = height * 0.65;
    const safeZoneLeft = width * 0.5 - 350;
    const safeZoneRight = width * 0.5 + 350;

    for (let i = 0; i < numStars; i++) {
      let x, y;
      let isValid = false;

      while (!isValid) {
        x = Math.random() * width;
        y = Math.random() * height;

        if (
          y > safeZoneTop &&
          y < safeZoneBottom &&
          x > safeZoneLeft &&
          x < safeZoneRight
        ) {
          isValid = false;
        } else {
          isValid = true;
        }
      }

      stars.push({
        x: x,
        y: y,
        radius: Math.random() * 1 + 0.2,
        alpha: Math.random(),
        fadeSpeed: Math.random() * 0.01 + 0.002,
        fadingOut: Math.random() > 0.5,
      });
    }
  }

  function animateStars() {
    ctx.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      if (star.fadingOut) {
        star.alpha -= star.fadeSpeed;
        if (star.alpha <= 0.1) star.fadingOut = false;
      } else {
        star.alpha += star.fadeSpeed;
        if (star.alpha >= 0.8) star.fadingOut = true;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animateStars);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    initStars();
  });

  resizeCanvas();
  initStars();
  animateStars();
});
