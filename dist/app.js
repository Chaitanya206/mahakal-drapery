/* Customer catalogue. Content and permanent IDs live in catalog.js. */
(() => {
  'use strict';
  const config = window.CATALOG;
  const categories = config.categories;
  const products = config.products.filter(p => !p.retired);
  const grid = document.querySelector('#products');
  const nav = document.querySelector('#categories');
  const dialog = document.querySelector('#product-dialog');
  const money = new Intl.NumberFormat(config.locale, {style:'currency',currency:config.currency,maximumFractionDigits:2});
  let active = 'all', lastTrigger;
  const el = (tag, cls, text) => {const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const byCode = new Map(categories.map(c=>[c.code,c]));
  const entries = code => products.filter(p=>p.categoryCode===code);
  const categoryLabel = c => c.name + (c.age ? ' · '+c.age : '');
  const rentText = p => typeof p.rent==='number' && Number.isFinite(p.rent) ? money.format(p.rent) : 'Confirm with shop';
  const availability = p => p.available===true ? 'YES' : p.available===false ? 'NO' : 'Not confirmed';
  document.title=config.brand+' — Costume Catalogue';
  document.querySelector('#currency-label').textContent=config.currency;
  // Fail visibly on duplicate IDs instead of associating a code with two costumes.
  if(new Set(config.products.map(p=>p.id)).size!==config.products.length || products.some(p=>!byCode.has(p.categoryCode))){
    grid.append(el('p','catalog-error','The catalogue is temporarily unavailable. Please contact the shop.'));
    console.error('Catalogue data contains a duplicate ID or unknown category.');return;
  }
  function categoryButton(category) {
    const code=category?.code||'all';
    const b=el('button','category-button');b.type='button';b.dataset.category=code;b.setAttribute('aria-pressed',String(active===code));
    const text=el('span','category-label');text.append(el('span','',category?category.name:'All categories'));
    if(category)text.append(el('small','',category.code+(category.age?' · '+category.age:'')));
    b.append(text,el('span','category-count',String(category?entries(code).length:categories.length).padStart(2,'0')));
    b.addEventListener('click',()=>select(code));return b;
  }
  function renderNav(){
    nav.replaceChildren(categoryButton(null));
    let group='';
    categories.forEach(c=>{if(c.group!==group){group=c.group;nav.append(el('p','category-group-label',group));}nav.append(categoryButton(c));});
  }
  function select(code,focusHeading=false){
    active=code;
    nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===code)));
    render();
    if(focusHeading){const heading=document.querySelector('#result-count');heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'auto'});}
  }
  function photo(holder,p){
    holder.replaceChildren();
    if(!p.image){holder.classList.add('awaiting-photo');holder.append(el('span','placeholder-code',p.id),el('span','placeholder-label','Photo to be added'));return;}
    holder.classList.remove('awaiting-photo');
    const image=el('img');image.width=768;image.height=1024;image.loading='lazy';image.alt=p.imageAlt||p.name||p.id;
    image.onerror=()=>{holder.classList.add('awaiting-photo');holder.replaceChildren(el('span','placeholder-code',p.id),el('span','placeholder-label','Photo unavailable'));};
    image.src=p.image;holder.append(image);
  }
  function render(){
    grid.replaceChildren();grid.className=active==='all'?'category-overview':'product-grid';
    document.querySelector('#empty').hidden=true;
    const result=document.querySelector('#result-count');
    if(active==='all'){
      result.textContent=categories.length+' categories · '+products.length+' catalogue IDs';
      for(const category of categories){
        const items=entries(category.code);const b=el('button','category-tile');b.type='button';
        b.append(el('span','tile-code',String(category.order).padStart(2,'0')+' / '+category.code),el('h3','',category.name),el('p','tile-age',category.age||category.group));
        b.append(el('p','tile-range',items.length ? items[0].id+' — '+items[items.length-1].id : 'No active entries'));
        b.append(el('span','tile-bottom',items.length+' entries · View collection ↗'));
        b.addEventListener('click',()=>select(category.code,true));grid.append(b);
      }
      return;
    }
    const category=byCode.get(active), visible=entries(active);
    result.textContent=categoryLabel(category)+' · '+visible.length+' entries';
    document.querySelector('#empty').hidden=visible.length>0;
    for(const p of visible){
      const card=el('article','product-card');const b=el('button','product-open');b.type='button';b.setAttribute('aria-label','View costume '+p.id+(p.name?', '+p.name:''));
      const holder=el('div','product-photo');photo(holder,p);
      if(p.image)holder.append(el('span','product-category',category.name));
      const copy=el('div','product-copy');copy.append(el('p','product-code',p.id),el('h3','',p.name||'Name to be added'));
      const bottom=el('div','product-bottom'),price=el('p','product-price');price.append(el('span','','RENT '),document.createTextNode(rentText(p)));bottom.append(price,el('span','card-arrow','↗'));
      copy.append(bottom,el('p','entry-availability','Available: '+availability(p)));
      b.append(holder,copy);b.addEventListener('click',()=>open(p,b));card.append(b);grid.append(card);
    }
  }
  function open(p,trigger){
    lastTrigger=trigger;const category=byCode.get(p.categoryCode);
    photo(document.querySelector('.detail-photo'),p);
    document.querySelector('#detail-category').textContent=category.name;
    document.querySelector('#detail-title').textContent=p.name||p.id;
    document.querySelector('#detail-code').textContent='COSTUME ID: '+p.id;
    document.querySelector('#detail-price').textContent=rentText(p);
    document.querySelector('#detail-description').textContent=p.description||'Quote this costume ID when contacting Mahakal Drapery about the outfit.';
    const specs=document.querySelector('#detail-specs');specs.replaceChildren();
    [['Category',category.name],['Age',category.age||'Not specified'],['Costume name',p.name||'To be added'],['Size',p.size||'To be added'],['Available',availability(p)]].forEach(([key,value])=>{const row=el('div');row.append(el('dt','',key),el('dd','',value));specs.append(row);});
    dialog.showModal();document.body.classList.add('dialog-open');
  }
  document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');lastTrigger?.focus();});
  renderNav();render();
})();
