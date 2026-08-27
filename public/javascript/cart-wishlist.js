function refreshCounts() {
  fetch('/wishlist-items')
    .then(res => res.json())
    .then(data => {
      document.getElementById('wishlist-count').textContent = data.length;
    })
    .catch(err => console.error('wishlist count error:', err));

  fetch('/cart-items')
    .then(res => res.json())
    .then(data => {
      document.getElementById('cart-count').textContent = data.items.length;
    })
    .catch(err => console.error('cart count error:', err));
}

document.addEventListener('cart:changed', refreshCounts);
document.addEventListener('wishlist:changed', refreshCounts);

document.addEventListener('DOMContentLoaded', refreshCounts);