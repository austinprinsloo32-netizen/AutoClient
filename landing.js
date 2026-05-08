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
  proCheckoutBtn.addEventListener("click", async () => {
    proCheckoutBtn.textContent = "Opening Checkout...";
    proCheckoutBtn.disabled = true;

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not start checkout.");
        proCheckoutBtn.textContent = "Try Pro";
        proCheckoutBtn.disabled = false;
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Could not connect to checkout.");
      proCheckoutBtn.textContent = "Try Pro";
      proCheckoutBtn.disabled = false;
    }
  });
}