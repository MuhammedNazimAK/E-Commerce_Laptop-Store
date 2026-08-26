let filters = {
  minPrice: 0,
  maxPrice: Infinity,
  brands: [],
  categories: [],
  rams: [],
  processors: [],
  graphicsCards: [],
  newArrivals: false
};

let sortOption = 'createdAt';
let currentPage = 1;
const itemsPerPage = 9;
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('product-container')) return;

  parseURLParams();
  initEventListeners();
  initPriceSlider();
  fetchProducts();
});

function parseURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const brand = urlParams.get('brand');
  const category = urlParams.get('category');

  if (brand) {
    const brandCheckbox = document.querySelector(`.brand-filter[value="${brand}"]`);
    if (brandCheckbox) {
      brandCheckbox.checked = true;
      filters.brands = [brand];
    }
  }
  if (category) {
    const categoryCheckbox = document.querySelector(`.category-filter[value="${category}"]`);
    if (categoryCheckbox) {
      categoryCheckbox.checked = true;
      filters.categories = [category];
    }
  }
}

function initEventListeners() {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.querySelector('#search-form button[type="submit"]');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSearch(searchInput.value);
    });
  }

  if (searchButton && searchInput) {
    searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleSearch(searchInput.value);
    });
  }

  $('#sort-select').on('change', function () {
    sortOption = $(this).val();
    currentPage = 1;
    fetchProducts();
  });

  document.querySelectorAll('.brand-filter, .category-filter, .ram-filter, .processor-filter, .graphics-card-filter')
    .forEach(checkbox => {
      checkbox.addEventListener('change', updateFilters);
    });

  const newArrivalsFilter = document.getElementById('new-arrivals-filter');
  if (newArrivalsFilter) {
    newArrivalsFilter.addEventListener('change', (e) => {
      filters.newArrivals = e.target.checked;
      fetchProducts();
    });
  }
}

function initPriceSlider() {
  const priceRange = document.getElementById('price-range');
  const minPriceInput = document.getElementById('min-price');
  const maxPriceInput = document.getElementById('max-price');

  if (priceRange && minPriceInput && maxPriceInput) {
    priceRange.addEventListener('input', (e) => {
      maxPriceInput.value = e.target.value;
      filters.maxPrice = Number(e.target.value);
    });

    priceRange.addEventListener('change', fetchProducts);

    minPriceInput.addEventListener('change', (e) => {
      filters.minPrice = Number(e.target.value) || 0;
      fetchProducts();
    });

    maxPriceInput.addEventListener('change', (e) => {
      const val = Number(e.target.value) || 100000;
      filters.maxPrice = val;
      priceRange.value = val;
      fetchProducts();
    });
  }
}

function updateFilters() {
  filters.brands = [...document.querySelectorAll('.brand-filter:checked')].map(el => el.value);
  filters.categories = [...document.querySelectorAll('.category-filter:checked')].map(el => el.value);
  filters.rams = [...document.querySelectorAll('.ram-filter:checked')].map(el => el.value);
  filters.processors = [...document.querySelectorAll('.processor-filter:checked')].map(el => el.value);
  filters.graphicsCards = [...document.querySelectorAll('.graphics-card-filter:checked')].map(el => el.value);
  currentPage = 1;
  fetchProducts();
}

function handleSearch(query) {
  searchQuery = query;
  currentPage = 1;
  fetchProducts();

  const searchModal = document.getElementById('search');
  if (searchModal) {
    searchModal.classList.remove('open');
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
}

async function fetchProducts() {
  try {
    const response = await fetch(`/product-listing/search-and-sort?_=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters,
        sort: sortOption,
        page: currentPage,
        itemsPerPage,
        searchQuery
      }),
    });

    if (!response.ok) throw new Error('Network response failed');

    const data = await response.json();
    updateProductContainer(data.products);
    updatePagination(data.totalProducts);
    currentPage = data.currentPage;

    const productCountElement = document.getElementById('product-count');
    if (productCountElement) {
      const startIndex = (currentPage - 1) * itemsPerPage + 1;
      const endIndex = Math.min(currentPage * itemsPerPage, data.totalProducts);
      productCountElement.textContent = `Showing ${startIndex}–${endIndex} of ${data.totalProducts} results`;
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

function updateProductContainer(products) {
  const container = document.getElementById('product-container');
  if (!container) return;
  container.innerHTML = '';

  products.forEach(product => {
    const productElement = document.createElement('div');
    productElement.className = 'product-list-single product-color--golden fade-in-element';

    const truncatedDescription = truncateString(product.description || '', 150);
    const isUnavailable = product.isPublished === false;

    const originalPrice = product.price || 0;
    const discountedPrice = product.salePrice || originalPrice;
    const discountPercentage = product.discount || (originalPrice > discountedPrice ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0);

    productElement.innerHTML = `
      <div style="display: flex; gap: 20px; align-items: flex-start;">
        <div class="image-box" style="background-color: white; flex: 0 0 250px; width: 250px;">
          <a href="/productDetails/${product._id}" class="image-link">
            <img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 250px; object-fit: contain;">
          </a>
        </div>
        <div class="product-list-content" style="flex: 1; min-width: 0;">
          <h5 class="product-list-link"><a href="/productDetails/${product._id}">${product.name}</a></h5>
          ${isUnavailable ?
            '<span class="product-unavailable">Currently Unavailable</span>' :
            `<span class="product-list-price">
              ${discountedPrice < originalPrice ?
                `<del>₹${originalPrice.toFixed(2)}</del> ₹${discountedPrice.toFixed(2)}
                <span class="discount-percentage">(${discountPercentage}% off)</span>` :
                `₹${originalPrice.toFixed(2)}`
              }
            </span>`
          }
          ${product.offerName ? `<p class="offer-name">${product.offerName}</p>` : ''}
          <p>${truncatedDescription}</p>
          <div class="product-action-icon-link-list">
            ${isUnavailable ? '' : `
              <a href="#" class="btn btn-lg btn-black-default-hover add-to-cart" data-product-id="${product._id}">Add to cart</a>
              <a href="#" class="btn btn-lg btn-black-default-hover add-to-wishlist ${product.inWishlist ? 'added-to-wishlist' : ''}" data-product-id="${product._id}">
                <i class="icon-heart"></i>
              </a>
            `}
          </div>
        </div>
      </div>
    `;

    const addToCartBtn = productElement.querySelector('.add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addToCart(product._id);
      });
    }

    container.appendChild(productElement);
  });

  document.dispatchEvent(new CustomEvent('productsUpdated', { detail: products }));
}

function updatePagination(totalProducts) {
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) return;

  paginationContainer.innerHTML = '';

  const prevButton = document.createElement('li');
  prevButton.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevButton.innerHTML = '<a href="#" aria-label="Previous">&laquo;</a>';
  prevButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      fetchProducts();
    }
  });
  paginationContainer.appendChild(prevButton);

  for (let i = 1; i <= totalPages; i++) {
    const pageItem = document.createElement('li');
    pageItem.innerHTML = `<a href="#" class="${i === currentPage ? 'active' : ''}">${i}</a>`;
    pageItem.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = i;
      fetchProducts();
    });
    paginationContainer.appendChild(pageItem);
  }

  const nextButton = document.createElement('li');
  nextButton.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextButton.innerHTML = '<a href="#" aria-label="Next">&raquo;</a>';
  nextButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      fetchProducts();
    }
  });
  paginationContainer.appendChild(nextButton);
}

function truncateString(str, maxLength) {
  if (str.length > maxLength) {
    return str.slice(0, maxLength) + '...';
  }
  return str;
}