const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  menuToggle.textContent = isOpen ? '×' : '☰';
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    menuToggle.textContent = '☰';
  });
});

document.querySelectorAll('.heart').forEach((heart) => {
  heart.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const saved = heart.classList.toggle('saved');
    heart.textContent = saved ? '♥' : '♡';
    heart.setAttribute('aria-pressed', String(saved));
    heart.setAttribute('aria-label', saved ? 'Remove from saved destinations' : 'Save destination');
  });
});

const searchForm = document.getElementById('search-form');
const destinationInput = document.getElementById('destination-input');
const searchMessage = document.getElementById('search-message');
const emptyState = document.getElementById('empty-state');
const destinationCards = [...document.querySelectorAll('.destination-card')];

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = destinationInput.value.trim().toLowerCase();
  let visibleCount = 0;

  destinationCards.forEach((card) => {
    const matches = !query || card.dataset.destination.toLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  emptyState.hidden = visibleCount !== 0;
  searchMessage.textContent = query
    ? (visibleCount ? `Showing ${visibleCount} destination${visibleCount === 1 ? '' : 's'} for “${destinationInput.value.trim()}”.` : '')
    : 'Showing all popular destinations.';
  document.getElementById('destinations').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('year').textContent = new Date().getFullYear();

// Demo only: the search filters destination cards. Real booking and payment
// functionality would require a backend or third-party booking integration.
