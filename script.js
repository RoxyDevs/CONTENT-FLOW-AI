document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((button) => button.classList.remove('active'));
      item.classList.add('active');
    });
  });

  const primaryButtons = document.querySelectorAll('.primary-btn');
  primaryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const original = button.textContent;
      button.textContent = 'Generando…';
      button.disabled = true;

      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 1200);
    });
  });
});
