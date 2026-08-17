const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-navigation");

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  navigation?.classList.toggle("open", !open);
});

document.querySelectorAll(".submenu-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    button.closest(".has-submenu")?.classList.toggle("submenu-open", !open);
  });
});

const contactForm = document.querySelector("[data-contact-form]");
contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = contactForm.querySelector("[data-form-status]");
  const submit = contactForm.querySelector('button[type="submit"]');
  status.textContent = "Sending…";
  submit.disabled = true;

  try {
    const data = Object.fromEntries(new FormData(contactForm));
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The message could not be sent.");
    contactForm.reset();
    if (window.turnstile) window.turnstile.reset();
    status.textContent = "Thanks—your message was sent.";
  } catch (error) {
    status.textContent = `${error.message} You can also email ZiON-ON@hotmail.com directly.`;
  } finally {
    submit.disabled = false;
  }
});
