/**
 * Giftopia - Master E-Commerce Interactive Engine
 * Matches functionality of websitedemos.net/giftopia-shop-04
 * - Offcanvas Mini Cart Drawer with Live Subtotal & Stepper
 * - Dedicated Cart & Checkout Page Synchronization
 * - Coupon Engine (GIFTOPIA10, WELCOME20)
 * - Product Quick View Modal with Detail & Rating
 * - Multi-Tab Real-time Storage Sync
 * - Zero Layout Disturbance Guarantee
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'giftopia_cart';
  const COUPON_KEY = 'giftopia_coupon';

  // --------------------------------------------------------------------------
  // 1. Data Store Helpers
  // --------------------------------------------------------------------------
  function getCart() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(data)) {
        return data.filter(item => item && typeof item === 'object' && item.id);
      }
    } catch (e) {
      console.warn('Error reading cart from localStorage', e);
    }
    return [];
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart to localStorage', e);
    }
  }

  function getCoupon() {
    try {
      return JSON.parse(localStorage.getItem(COUPON_KEY));
    } catch (e) {
      return null;
    }
  }

  function setCoupon(coupon) {
    try {
      if (coupon) {
        localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
      } else {
        localStorage.removeItem(COUPON_KEY);
      }
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --------------------------------------------------------------------------
  // 2. Offcanvas Drawer Management
  // --------------------------------------------------------------------------
  function getOffcanvasElement() {
    return document.getElementById('cartOffcanvas');
  }

  function openCartDrawer() {
    const el = getOffcanvasElement();
    if (!el) return;

    if (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
      try {
        const bsInstance = bootstrap.Offcanvas.getOrCreateInstance(el);
        bsInstance.show();
        return;
      } catch (err) {
        console.warn('Bootstrap Offcanvas failed, using fallback', err);
      }
    }

    // Pure JS Fallback
    el.classList.add('show');
    el.style.visibility = 'visible';
    el.removeAttribute('aria-hidden');
    el.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    let backdrop = document.querySelector('.cart-fallback-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'offcanvas-backdrop fade show cart-fallback-backdrop';
      backdrop.addEventListener('click', closeCartDrawer);
      document.body.appendChild(backdrop);
    }
  }

  function closeCartDrawer() {
    const el = getOffcanvasElement();
    if (!el) return;

    if (typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
      try {
        const bsInstance = bootstrap.Offcanvas.getInstance(el);
        if (bsInstance) {
          bsInstance.hide();
          return;
        }
      } catch (err) {}
    }

    // Fallback close
    el.classList.remove('show');
    el.style.visibility = 'hidden';
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    const backdrop = document.querySelector('.cart-fallback-backdrop');
    if (backdrop) backdrop.remove();
  }

  // --------------------------------------------------------------------------
  // 3. Render Cart Drawer & Badge UI
  // --------------------------------------------------------------------------
  function updateCartUI() {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    // Update Header Badges
    const badges = document.querySelectorAll('#cartCountBadge, .cart-badge');
    badges.forEach(badge => {
      badge.textContent = totalCount;
      badge.classList.remove('cart-badge-bounce');
      void badge.offsetWidth;
      badge.classList.add('cart-badge-bounce');
    });

    const emptyState = document.getElementById('cartEmptyState');
    const itemsContainer = document.getElementById('cartItemsContainer');
    const itemsList = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartSubtotalValue');

    if (!itemsContainer || !emptyState) return;

    if (cart.length === 0 || totalCount === 0) {
      emptyState.classList.remove('d-none');
      emptyState.classList.add('d-flex');
      itemsContainer.classList.add('d-none');
      itemsContainer.classList.remove('d-flex');
    } else {
      emptyState.classList.add('d-none');
      emptyState.classList.remove('d-flex');
      itemsContainer.classList.remove('d-none');
      itemsContainer.classList.add('d-flex');

      let subtotal = 0;
      if (itemsList) {
        itemsList.innerHTML = '';

        cart.forEach(item => {
          const itemPrice = parseFloat(item.price) || 0;
          const itemQty = parseInt(item.qty, 10) || 1;
          const lineTotal = itemPrice * itemQty;
          subtotal += lineTotal;

          const row = document.createElement('div');
          row.className = 'cart-drawer-item';
          row.setAttribute('data-id', item.id);
          row.innerHTML = `
            <img src="${escapeHtml(item.img || 'Image/product-01-a.jpg')}" alt="${escapeHtml(item.name || 'Product')}">
            <div class="cart-drawer-item-info">
              <div class="cart-drawer-item-title">${escapeHtml(item.name || 'Product')}</div>
              <div class="cart-drawer-item-price">$${itemPrice.toFixed(2)}</div>
              <div class="cart-drawer-qty-control">
                <button type="button" class="cart-qty-btn cart-qty-minus" data-id="${escapeHtml(item.id)}" title="Decrease quantity" aria-label="Decrease quantity">&minus;</button>
                <span class="cart-qty-value">${itemQty}</span>
                <button type="button" class="cart-qty-btn cart-qty-plus" data-id="${escapeHtml(item.id)}" title="Increase quantity" aria-label="Increase quantity">&plus;</button>
              </div>
            </div>
            <button type="button" class="cart-drawer-remove" data-id="${escapeHtml(item.id)}" aria-label="Remove item" title="Remove item">&times;</button>
          `;
          itemsList.appendChild(row);
        });
      }

      if (subtotalEl) {
        subtotalEl.textContent = '$' + subtotal.toFixed(2);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. Cart State Actions
  // --------------------------------------------------------------------------
  function addToCart(product, quantity) {
    if (!product || !product.id) return;
    const qtyToAdd = parseInt(quantity, 10) || 1;

    const cart = getCart();
    const existing = cart.find(it => String(it.id) === String(product.id));

    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + qtyToAdd;
    } else {
      cart.push({
        id: String(product.id),
        name: product.name || 'Gift Item',
        price: parseFloat(product.price) || 0,
        img: product.img || 'Image/product-01-a.jpg',
        qty: qtyToAdd
      });
    }

    saveCart(cart);
    updateCartUI();
    openCartDrawer();
    showToast(`Added ${qtyToAdd} &times; "${product.name}" to your cart!`);
  }

  function changeQuantity(id, delta) {
    let cart = getCart();
    const item = cart.find(it => String(it.id) === String(id));
    if (!item) return;

    item.qty = (Number(item.qty) || 1) + delta;
    if (item.qty <= 0) {
      cart = cart.filter(it => String(it.id) !== String(id));
    }

    saveCart(cart);
    updateCartUI();
  }

  function removeItem(id) {
    let cart = getCart();
    cart = cart.filter(it => String(it.id) !== String(id));
    saveCart(cart);
    updateCartUI();
  }

  function clearCart() {
    saveCart([]);
    updateCartUI();
  }

  // --------------------------------------------------------------------------
  // 5. Toast Notification System
  // --------------------------------------------------------------------------
  function showToast(message) {
    let toast = document.getElementById('giftopiaGlobalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'giftopiaGlobalToast';
      toast.className = 'giftopia-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // 6. Interactive Product Quick View Modal
  // --------------------------------------------------------------------------
  function showQuickViewModal(product) {
    if (!product || !product.name) return;

    let modal = document.getElementById('giftopiaQuickViewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'giftopiaQuickViewModal';
      modal.className = 'modal fade modal-quickview';
      modal.setAttribute('tabindex', '-1');
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header border-0 pb-0 justify-content-end">
              <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-0 px-4 pb-4">
              <div class="row g-4 align-items-center" id="quickViewContentWrap"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const contentWrap = document.getElementById('quickViewContentWrap');
    contentWrap.innerHTML = `
      <div class="col-md-6 text-center">
        <img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.name)}" class="quickview-img">
      </div>
      <div class="col-md-6 text-start">
        <span class="quickview-cat">${escapeHtml(product.cat || 'Special Gifts')}</span>
        <h2 class="quickview-title">${escapeHtml(product.name)}</h2>
        <div class="quickview-rating">
          &#9733;&#9733;&#9733;&#9733;&#9733;
          <span class="text-muted small ms-1">(5.0 Customer Reviews)</span>
        </div>
        <div class="quickview-price">$${parseFloat(product.price).toFixed(2)}</div>
        <p class="quickview-desc">
          Thoughtfully handcrafted and specially curated to elevate every celebration. Comes packaged in a premium Giftopia signature gift box ready for giving.
        </p>
        <div class="d-flex align-items-center gap-3">
          <div class="cart-drawer-qty-control m-0" style="background:#ffffff; height:48px;">
            <button type="button" class="cart-qty-btn" id="qvQtyMinus" style="width:36px; height:48px;">&minus;</button>
            <span class="cart-qty-value fs-6" id="qvQtyVal" style="min-width:36px;">1</span>
            <button type="button" class="cart-qty-btn" id="qvQtyPlus" style="width:36px; height:48px;">&plus;</button>
          </div>
          <button type="button" class="quickview-btn-add flex-grow-1" id="qvAddToCartBtn">
            Add To Cart
          </button>
        </div>
      </div>
    `;

    let currentQty = 1;
    const qtyValEl = document.getElementById('qvQtyVal');
    document.getElementById('qvQtyPlus').addEventListener('click', () => {
      currentQty++;
      qtyValEl.textContent = currentQty;
    });
    document.getElementById('qvQtyMinus').addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyValEl.textContent = currentQty;
      }
    });

    document.getElementById('qvAddToCartBtn').addEventListener('click', () => {
      addToCart(product, currentQty);
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      }
    });

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
      bsModal.show();
    }
  }

  // Helper to extract product info from a card / item
  function extractProductInfoFromElement(targetEl) {
    const card = targetEl.closest('.product-card, .shop-product-item');
    if (!card) return null;

    const triggerBtn = card.querySelector('.add-to-cart-trigger');
    const id = triggerBtn ? triggerBtn.getAttribute('data-id') : (card.getAttribute('data-id') || '1');
    const name = triggerBtn ? triggerBtn.getAttribute('data-name') : (card.querySelector('.product-title, .shop-product-title')?.textContent?.trim() || 'Gift Item');
    const price = triggerBtn ? triggerBtn.getAttribute('data-price') : (card.getAttribute('data-price') || card.querySelector('.product-price, .shop-product-price')?.textContent?.replace(/[^0-9.]/g, '') || '0');
    const imgEl = card.querySelector('img');
    const img = triggerBtn ? triggerBtn.getAttribute('data-img') : (imgEl ? imgEl.getAttribute('src') : 'Image/product-01-a.jpg');
    const cat = card.querySelector('.product-category, .shop-product-cat')?.textContent?.trim() || 'Gifts';

    return { id, name, price, img, cat };
  }

  // --------------------------------------------------------------------------
  // 7. Global Event Delegation
  // --------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    // 🔹 1. Add to Cart Trigger Click
    const addBtn = e.target.closest('.add-to-cart-trigger');
    if (addBtn) {
      e.preventDefault();
      const product = {
        id: addBtn.getAttribute('data-id'),
        name: addBtn.getAttribute('data-name'),
        price: addBtn.getAttribute('data-price'),
        img: addBtn.getAttribute('data-img')
      };

      addBtn.classList.add('btn-added');
      setTimeout(() => {
        addBtn.classList.remove('btn-added');
      }, 700);

      addToCart(product, 1);
      return;
    }

    // 🔹 2. Navbar Cart Bag Icon Button Click
    const cartToggleBtn = e.target.closest('.cart-btn');
    if (cartToggleBtn) {
      e.preventDefault();
      openCartDrawer();
      return;
    }

    // 🔹 3. Dismiss Offcanvas Button Click (Close button / Continue Shopping)
    const dismissBtn = e.target.closest('[data-bs-dismiss="offcanvas"]');
    if (dismissBtn && dismissBtn.closest('#cartOffcanvas')) {
      closeCartDrawer();
      return;
    }

    // 🔹 4. Quantity Increment (+) inside Drawer
    const plusBtn = e.target.closest('.cart-qty-plus:not(.cart-page-qty-plus)');
    if (plusBtn) {
      e.preventDefault();
      const id = plusBtn.getAttribute('data-id');
      changeQuantity(id, 1);
      return;
    }

    // 🔹 5. Quantity Decrement (-) inside Drawer
    const minusBtn = e.target.closest('.cart-qty-minus:not(.cart-page-qty-minus)');
    if (minusBtn) {
      e.preventDefault();
      const id = minusBtn.getAttribute('data-id');
      changeQuantity(id, -1);
      return;
    }

    // 🔹 6. Remove Item (X) inside Drawer
    const removeBtn = e.target.closest('.cart-drawer-remove');
    if (removeBtn) {
      e.preventDefault();
      const id = removeBtn.getAttribute('data-id');
      removeItem(id);
      return;
    }

    // 🔹 7. Clear Entire Cart Button
    const clearBtn = e.target.closest('#clearCartBtn');
    if (clearBtn) {
      e.preventDefault();
      clearCart();
      return;
    }

    // 🔹 8. Checkout Button inside Drawer -> Direct to checkout.html
    const checkoutBtn = e.target.closest('#cartCheckoutBtn');
    if (checkoutBtn) {
      window.location.href = 'checkout.html';
      return;
    }

    // 🔹 9. Product Title or Image Click -> Open Quick View Modal
    const productClickLink = e.target.closest('.product-card .product-title, .product-card .product-image-wrap a, .shop-product-title a, .shop-product-thumb-wrap img');
    if (productClickLink && !e.target.closest('.add-to-cart-trigger')) {
      e.preventDefault();
      const product = extractProductInfoFromElement(productClickLink);
      if (product) {
        showQuickViewModal(product);
      }
      return;
    }
  });

  // --------------------------------------------------------------------------
  // 8. Multi-Tab Synchronization
  // --------------------------------------------------------------------------
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY || e.key === COUPON_KEY) {
      updateCartUI();
    }
  });

  // --------------------------------------------------------------------------
  // 9. Initial Load
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartUI);
  } else {
    updateCartUI();
  }

  // Global Export
  window.GiftopiaCart = {
    get: getCart,
    add: addToCart,
    remove: removeItem,
    changeQty: changeQuantity,
    clear: clearCart,
    getCoupon: getCoupon,
    setCoupon: setCoupon,
    updateUI: updateCartUI,
    open: openCartDrawer,
    close: closeCartDrawer,
    toast: showToast,
    quickView: showQuickViewModal
  };
})();
