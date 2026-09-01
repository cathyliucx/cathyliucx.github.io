document.querySelectorAll('a[href^="#"]').forEach((el) => {
  el.addEventListener('click', (e) => {
    const target = el.getAttribute('href');
    if (target === '#') {
      e.preventDefault();
      return;
    }
    const node = document.querySelector(target);
    if (!node) return;
    e.preventDefault();
    window.scrollTo({ top: node.offsetTop - 90, behavior: 'smooth' });
  });
});
