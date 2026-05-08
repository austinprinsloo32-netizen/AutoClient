const counters = document.querySelectorAll("[data-count]");

function animateCounter(counter) {
  const target = Number(counter.dataset.count);
  const duration = 900;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(progress * target);

    counter.textContent = target === 100 ? `${value}%` : value;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      counter.textContent = target === 100 ? "100%" : target;
    }
  }

  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.done) {
      entry.target.dataset.done = "true";
      animateCounter(entry.target);
    }
  });
}, {
  threshold: 0.4
});

counters.forEach(counter => counterObserver.observe(counter));

const revealItems = document.querySelectorAll(
  ".features-grid article, .pricing-grid article, .preview-panel, .preview-copy, .cta-section"
);

revealItems.forEach(item => item.classList.add("reveal"));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, {
  threshold: 0.16
});

revealItems.forEach(item => revealObserver.observe(item));

const proCheckoutBtn = document.getElementById("proCheckoutBtn");

if (proCheckoutBtn) {
  proCheckoutBtn.addEventListener("click", () => {
    proCheckoutBtn.textContent = "Opening App...";
    proCheckoutBtn.disabled = true;

    alert("Please login first, then upgrade to Pro from Settings.");

    window.location.href = "/app";
  });
}