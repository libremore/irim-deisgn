(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  if (menuButton && mobileMenu) {
    const setMenu = (open) => {
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      menuButton.title = open ? "메뉴 닫기" : "메뉴 열기";
      menuButton.querySelector(".icon").className = `icon ${open ? "xi-close" : "xi-bars"}`;
      mobileMenu.hidden = !open;
      document.body.classList.toggle("menu-open", open);
      if (open) mobileMenu.querySelector("a").focus();
    };
    menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (event) => {
      if (mobileMenu.hidden) return;
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.focus();
      }
      if (event.key === "Tab") {
        const focusable = [menuButton, ...mobileMenu.querySelectorAll("a, summary")].filter((element) => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    const desktopQuery = window.matchMedia("(min-width: 769px)");
    desktopQuery.addEventListener("change", (event) => { if (event.matches) setMenu(false); });
    mobileMenu.querySelectorAll("details").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) mobileMenu.querySelectorAll("details").forEach((other) => { if (other !== details) other.open = false; });
      });
    });
  }

  const carousel = document.querySelector(".main-slides");
  if (carousel && typeof window.Swiper === "function") {
    const progress = document.querySelector(".slide-progress-fill");
    const current = document.querySelector(".slide-current");
    const toggle = document.querySelector(".play-toggle");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let paused = reducedMotion.matches;
    const updateToggle = () => {
      toggle.setAttribute("aria-label", paused ? "슬라이드 재생" : "슬라이드 일시정지");
      toggle.title = paused ? "슬라이드 재생" : "슬라이드 일시정지";
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.querySelector(".icon").className = `icon ${paused ? "xi-play" : "xi-pause"}`;
    };
    const swiper = new window.Swiper(".main-slides", {
      loop: true,
      speed: reducedMotion.matches ? 0 : 500,
      autoplay: paused ? false : { delay: 5000, disableOnInteraction: false },
      navigation: { prevEl: ".slide-prev", nextEl: ".slide-next" },
      a11y: { prevSlideMessage: "이전 사진", nextSlideMessage: "다음 사진", slideLabelMessage: "{{index}} / {{slidesLength}}" },
      on: {
        slideChange(instance) { current.textContent = String(instance.realIndex + 1); },
        autoplayTimeLeft(instance, time, fraction) { progress.style.transform = `scaleX(${1 - fraction})`; },
      },
    });
    updateToggle();
    toggle.addEventListener("click", () => {
      paused = !paused;
      if (paused) swiper.autoplay.stop();
      else {
        swiper.params.autoplay = { delay: 5000, disableOnInteraction: false };
        swiper.autoplay.start();
      }
      updateToggle();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") swiper.slidePrev();
      if (event.key === "ArrowRight") swiper.slideNext();
    });
    reducedMotion.addEventListener("change", (event) => {
      swiper.params.speed = event.matches ? 0 : 500;
      if (event.matches) {
        paused = true;
        swiper.autoplay.stop();
        updateToggle();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) swiper.autoplay.stop();
      else if (!paused) swiper.autoplay.start();
    });
  }

  const mapContainer = document.getElementById("daumRoughmapContainer1752652283558");
  if (mapContainer) {
    const fallback = document.querySelector(".map-fallback");
    // Kakao's published embed keeps its own loader; the address stays usable offline.
    const renderMap = () => {
      if (!window.daum?.roughmap?.Lander) return;
      try {
        new window.daum.roughmap.Lander({
          timestamp: "1752652283558",
          key: "5ciyj5m7xu7",
          mapWidth: "1280",
          mapHeight: window.innerWidth <= 768 ? "300" : "450",
        }).render();
      } catch { return; }
    };
    const observer = new MutationObserver(() => {
      if (mapContainer.querySelector(".wrap_map")) {
        mapContainer.hidden = false;
        fallback.hidden = true;
        observer.disconnect();
      }
    });
    observer.observe(mapContainer, { childList: true, subtree: true });
    let tries = 0;
    const timer = window.setInterval(() => {
      if (window.daum?.roughmap?.Lander) {
        window.clearInterval(timer);
        renderMap();
      } else if (++tries >= 40) {
        window.clearInterval(timer);
        observer.disconnect();
      }
    }, 250);
  }
})();
