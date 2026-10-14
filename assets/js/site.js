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

  const photoDialog = document.querySelector(".photo-dialog");
  const photoLinks = [...document.querySelectorAll("[data-project-photo]")];
  if (photoDialog && typeof photoDialog.showModal === "function" && photoLinks.length) {
    const image = photoDialog.querySelector(".photo-dialog-image");
    const caption = photoDialog.querySelector("#photo-caption");
    const original = photoDialog.querySelector(".photo-original");
    let selected = 0;
    let opener;
    const showPhoto = (index) => {
      selected = (index + photoLinks.length) % photoLinks.length;
      const link = photoLinks[selected];
      image.src = link.href;
      image.alt = link.querySelector("img").alt;
      caption.textContent = link.dataset.caption;
      original.href = link.href;
    };
    photoLinks.forEach((link, index) => link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      showPhoto(index);
      photoDialog.showModal();
      document.body.classList.add("photo-viewer-open");
      photoDialog.querySelector(".photo-close").focus();
    }));
    const previous = photoDialog.querySelector(".photo-prev");
    const next = photoDialog.querySelector(".photo-next");
    previous.disabled = next.disabled = photoLinks.length < 2;
    previous.addEventListener("click", () => showPhoto(selected - 1));
    next.addEventListener("click", () => showPhoto(selected + 1));
    photoDialog.querySelector(".photo-close").addEventListener("click", () => photoDialog.close());
    photoDialog.addEventListener("click", (event) => { if (event.target === photoDialog) photoDialog.close(); });
    photoDialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showPhoto(selected + (event.key === "ArrowLeft" ? -1 : 1));
      }
    });
    photoDialog.addEventListener("close", () => {
      document.body.classList.remove("photo-viewer-open");
      opener?.focus({ preventScroll: true });
    });
  }

  const areaNav = document.querySelector(".project-area-nav");
  if (areaNav) {
    const areas = [...document.querySelectorAll(".project-area")];
    const links = [...areaNav.querySelectorAll("a")];
    let scheduled = false;
    const updateArea = () => {
      const threshold = areaNav.getBoundingClientRect().height + 45;
      let current = areas[0];
      areas.forEach((area) => { if (area.getBoundingClientRect().top <= threshold) current = area; });
      links.forEach((link) => {
        if (link.hash === `#${current.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      scheduled = false;
    };
    window.addEventListener("scroll", () => {
      if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateArea); }
    }, { passive: true });
    window.addEventListener("resize", updateArea);
    updateArea();
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
