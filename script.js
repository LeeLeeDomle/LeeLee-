// ===== CONTACT SECTION =====
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const sendButton = contactForm.querySelector('button');

contactForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name || !email || !message) {
    formStatus.textContent = 'Please fill in your name, email, and message.';
    return;
  }

  formStatus.textContent = 'Sending...';
  sendButton.disabled = true;

  fetch(contactForm.action, {
    method: 'POST',
    body: new FormData(contactForm),
    headers: { 'Accept': 'application/json' }
  })
    .then(function (response) {
      if (response.ok) {
        formStatus.textContent = 'Thanks, ' + name + '! Your message has been sent.';
        contactForm.reset();
      } else {
        formStatus.textContent = 'Something went wrong. Please try again or use WhatsApp.';
      }
      sendButton.disabled = false;
    })
    .catch(function () {
      formStatus.textContent = 'Could not send. Check your connection or use WhatsApp.';
      sendButton.disabled = false;
    });
});