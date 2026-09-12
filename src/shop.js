/* Shared branding, footer and contact details. Edit the shop object in catalog.js. */
export function renderShop(config) {
  'use strict';

  const shop = config.shop || {};
  document.querySelectorAll('[data-shop-description]').forEach(el => {el.textContent=shop.description || '';});
  let socials=document.querySelector('[data-social-links]');
  if(!socials){socials=document.createElement('div');socials.dataset.socialLinks='';document.querySelector('.footer-intro')?.append(socials);}
  socials.replaceChildren();
  for(const link of shop.social_links||[]){try{const url=new URL(link.url);if(url.protocol==='https:'){const a=document.createElement('a');a.href=url.href;a.textContent=link.label;a.target='_blank';a.rel='noopener noreferrer';socials.append(a);}}catch{}}
  const text = (selector, value) => document.querySelectorAll(selector).forEach(el => { el.textContent = value; });

  // Render the shop name plus a real, persistent subtitle in both logo lockups.
  document.querySelectorAll('.brand-lockup .brand-name').forEach(el => {
    el.replaceChildren();
    el.append(document.createTextNode(config.brand));
    const subtitle = document.createElement('span');
    subtitle.className = 'brand-subtitle';
    subtitle.textContent = 'Rental Shop';
    el.append(subtitle);
  });
  // Keep any non-lockup brand fields as plain text.
  document.querySelectorAll('[data-brand]:not(.brand-lockup .brand-name)').forEach(el => { el.textContent = config.brand; });

  text('[data-owner]', shop.owner || '');
  text('[data-services-inline]', (shop.services || []).join(' · '));
  document.querySelectorAll('[data-services]').forEach(el => {
    el.replaceChildren();
    (shop.services || []).forEach(service => { const li = document.createElement('li'); li.textContent = service; el.append(li); });
  });
  text('#year', new Date().getFullYear());
  text('[data-address]', shop.address || 'Shop address to be added');
  document.querySelectorAll('.brand[aria-label]').forEach(el => el.setAttribute('aria-label', config.brand + ' home'));
  if (document.body.dataset.page === 'contact') document.title = config.brand + ' — Visit & Contact';
  document.querySelectorAll('.sample-banner').forEach(el => { el.hidden = !config.demo; });
  function contact(selector, value, href, fallback) {
    document.querySelectorAll(selector).forEach(el => {
      el.replaceChildren();
      if (value && href) {
        const a = document.createElement('a'); a.href = href; a.textContent = value; el.append(a);
      } else el.textContent = value || fallback;
    });
  }
  const phones = shop.phones || (shop.phone ? [{label: shop.phone, number: shop.phone}] : []);
  document.querySelectorAll('[data-contact-phone]').forEach(el => {
    el.replaceChildren();
    phones.forEach(phone => {
      const number = (phone.number || '').replace(/[^+\d]/g, '');
      const valid = /^\+?\d{7,15}$/.test(number);
      const item = document.createElement(valid ? 'a' : 'span');
      item.textContent = phone.label || phone.number;
      if (valid) item.href = 'tel:' + number;
      el.append(item);
    });
    if (!phones.length) el.textContent = 'Contact number coming soon';
  });
  const email = (shop.email || '').trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  contact('[data-contact-email]', email, validEmail ? 'mailto:' + encodeURIComponent(email) : '', '');
  document.querySelectorAll('[data-contact-email], [data-email-section]').forEach(el => { el.hidden = !validEmail; });
  const whatsapp = (shop.whatsapp || '').replace(/\D/g, '');
  document.querySelectorAll('[data-contact-whatsapp]').forEach(el => {
    el.hidden = !/^\d{7,15}$/.test(whatsapp);
    if (!el.hidden) { el.href = 'https://wa.me/' + whatsapp; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
  });
  let directions = '';
  if (shop.mapsUrl) {
    try { const url = new URL(shop.mapsUrl); if (url.protocol === 'https:') directions = url.href; } catch { /* Invalid links stay inactive. */ }
  }
  if (!directions && shop.address?.trim()) directions = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(shop.address.trim());
  document.querySelectorAll('[data-directions]').forEach(el => { el.hidden = !directions; if (directions) el.href = directions; });
  document.querySelectorAll('[data-location-pending]').forEach(el => { el.hidden = Boolean(directions); });
  document.querySelectorAll('[data-hours-note]').forEach(el => { el.hidden = Boolean(shop.hours?.length); });
  document.querySelectorAll('[data-hours]').forEach(el => {
    el.hidden = !shop.hours?.length;
    if (!shop.hours?.length) return;
    el.replaceChildren();
    shop.hours.forEach(({days, time}) => {
      const row = document.createElement('div'); const term = document.createElement('dt'); const value = document.createElement('dd');
      term.textContent = days; value.textContent = time || 'To be confirmed'; row.append(term, value); el.append(row);
    });
  });
}