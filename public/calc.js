(function () {
  const app = document.getElementById('app');
  const barSum = document.getElementById('barSum');
  const barSub = document.getElementById('barSub');
  const STORE_KEY = 'sk-calc-v1';

  const SLOT_CATEGORY = {
    laminate: 'laminate', wallpaper: 'wallpaper', door: 'door', electric: 'electric', spot: 'spot',
    tileWall: 'tileWall', tileFloor: 'tileFloor', toilet: 'toilet', bath: 'bath',
    bathFaucet: 'bathFaucet', sink: 'sink', sinkFaucet: 'sinkFaucet', towel: 'towel',
  };
  const BATH_KINDS = { bathtub: 'Ванна', tray: 'Душевой поддон', drain: 'Душ с трапом' };
  const TOILET_KINDS = { compact: 'Унитаз-компакт', installation: 'Инсталляция' };
  const COLORED_CEILING = '#ece5d8';

  let catalog = null, roomTypes = {}, result = null, lastError = '', submitted = null;
  let state = load() || {
    height: 2.7,
    rooms: [
      { type: 'living', name: 'Комната', length: 5.2, width: 4, windows: 1, doors: 1 },
      { type: 'hall', name: 'Коридор', length: 3, width: 1.4, windows: 0, doors: 0 },
      { type: 'bath', name: 'Санузел', length: 2, width: 2, windows: 0, doors: 1 },
    ],
    screed: true, plaster: true, ceilingColor: 'white',
    spotsCount: '', socketsCount: '', switchesCount: '',
    bathKind: 'bathtub', toiletKind: 'compact', vizTab: 'room',
    options: {},
    contact: { name: '', phone: '', consent: false },
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* приватный режим */ }
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  const item = (id) => {
    for (const list of Object.values(catalog || {})) {
      const x = list.find((i) => i.id === id);
      if (x) return x;
    }
    return null;
  };
  const isWet = (t) => t === 'bath' || t === 'wc';
  const hasWet = () => state.rooms.some((r) => isWet(r.type));
  const hasBath = () => state.rooms.some((r) => r.type === 'bath');

  function itemsFor(slot) {
    const list = catalog[SLOT_CATEGORY[slot]] || [];
    if (slot === 'bath') return list.filter((i) => i.kind === state.bathKind);
    if (slot === 'toilet') return list.filter((i) => i.kind === state.toiletKind);
    return list;
  }

  function ensureDefaults() {
    for (const k of ['bath', 'toilet']) {
      const kinds = new Set((catalog[k] || []).map((i) => i.kind));
      const key = k === 'bath' ? 'bathKind' : 'toiletKind';
      if (!kinds.has(state[key])) state[key] = [...kinds][0];
    }
    for (const slot of Object.keys(SLOT_CATEGORY)) {
      const list = itemsFor(slot);
      if (!list.some((i) => i.id === state.options[slot])) state.options[slot] = list[0]?.id;
    }
  }

  function buildInput() {
    const n = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
    return {
      height: n(state.height),
      rooms: state.rooms.map((r) => ({
        type: r.type, name: r.name, length: n(r.length), width: n(r.width), windows: n(r.windows), doors: n(r.doors),
      })),
      options: {
        ...state.options,
        screed: state.screed, plaster: state.plaster, ceilingColor: state.ceilingColor,
        spotsCount: n(state.spotsCount), socketsCount: n(state.socketsCount), switchesCount: n(state.switchesCount),
      },
    };
  }

  // ---------- Разметка ----------

  function optCard(slot, x) {
    const on = state.options[slot] === x.id ? ' on' : '';
    const sw = x.color ? `<span class="sw" style="background:${esc(x.color)}"></span>` : '';
    return `<button type="button" class="opt${on}" data-act="pick" data-slot="${slot}" data-id="${esc(x.id)}">
      ${sw}<span><span class="t">${esc(x.name)}</span><span class="p">≈ ${fmt(x.price)} ₽/${esc(x.unit)} в смете</span></span></button>`;
  }
  const opts = (slot) => `<div class="opts">${itemsFor(slot).map((x) => optCard(slot, x)).join('')}</div>`;
  const seg = (act, map, current) => `<div class="seg">${Object.entries(map)
    .filter(([k]) => act !== 'bathKind' || (catalog.bath || []).some((i) => i.kind === k))
    .map(([k, label]) => `<button type="button" class="${k === current ? 'on' : ''}" data-act="${act}" data-val="${k}">${label}</button>`).join('')}</div>`;
  const step = (n, title, body) => `<section class="card"><div class="step-head"><span class="step-num">${String(n).padStart(2, '0')}</span><h2>${title}</h2></div>${body}</section>`;

  function roomRow(r, i) {
    const num = (field, label, step = '0.1') => `<label><span class="lbl">${label}</span>
      <input class="inp small" type="number" inputmode="decimal" min="0" step="${step}" data-room="${i}" data-field="${field}" value="${esc(r[field])}"></label>`;
    return `<div class="room">
      <div class="full">
        <input class="inp small" data-room="${i}" data-field="name" value="${esc(r.name)}" aria-label="Название">
        ${r.name === roomTypes[r.type]?.label.split(' /')[0] ? '' : `<span class="muted">${esc(roomTypes[r.type]?.label.split(' /')[0] || '')}</span>`}
        <button type="button" class="x" data-act="delRoom" data-i="${i}" aria-label="Удалить">×</button>
      </div>
      ${num('length', 'Длина, м')}${num('width', 'Ширина, м')}${num('windows', 'Окон', '1')}${num('doors', 'Дверей', '1')}
    </div>`;
  }

  function render() {
    ensureDefaults();
    let n = 1;
    const parts = [];
    parts.push(step(n++, 'Квартира', `
      <div class="row2" style="margin-bottom:12px">
        <label><span class="lbl">Высота потолка, м</span><input class="inp" type="number" inputmode="decimal" step="0.05" min="2" max="5" data-field="height" value="${esc(state.height)}"></label>
        <div><span class="lbl">Площадь</span><div style="padding:11px 0;font-weight:600" id="areaOut">${result ? fmt(result.area) + ' м²' : '—'}</div></div>
      </div>
      ${state.rooms.map(roomRow).join('')}
      <div class="adds">${Object.entries(roomTypes).map(([t, v]) => `<button type="button" class="btn ghost sm" data-act="addRoom" data-type="${t}">+ ${esc(v.label.split(' /')[0])}</button>`).join('')}</div>
      <label class="check"><input type="checkbox" data-field="screed" ${state.screed ? 'checked' : ''}> Нужна стяжка пола</label>
      <label class="check"><input type="checkbox" data-field="plaster" ${state.plaster ? 'checked' : ''}> Нужна штукатурка стен (новостройка без отделки)</label>`));

    parts.push(`<section class="card" id="vizCard"></section>`);

    if (state.rooms.some((r) => !isWet(r.type))) {
      parts.push(step(n++, 'Пол — ламинат', opts('laminate')));
      parts.push(step(n++, 'Стены — обои', `<p class="hint">Стены шпаклюются в 2 слоя под обои.</p>${opts('wallpaper')}`));
    }
    if (hasWet()) {
      parts.push(step(n++, 'Санузел', `
        ${hasBath() ? `<h3>Ванна или душ</h3>${seg('bathKind', BATH_KINDS, state.bathKind)}${opts('bath')}` : ''}
        <h3>Унитаз</h3>${seg('toiletKind', TOILET_KINDS, state.toiletKind)}${opts('toilet')}
        <h3>Плитка на стены</h3>${opts('tileWall')}
        <h3>Плитка на пол</h3>${opts('tileFloor')}
        ${hasBath() ? `<h3>Раковина</h3>${opts('sink')}<h3>Смеситель для ванны / душа</h3>${opts('bathFaucet')}
        <h3>Смеситель для раковины</h3>${opts('sinkFaucet')}<h3>Полотенцесушитель</h3>${opts('towel')}` : ''}`));
    }
    parts.push(step(n++, 'Потолок', `
      <p class="hint">Натяжной матовый потолок во всей квартире.</p>
      ${seg('ceilingColor', { white: 'Белый', color: 'Цветной' }, state.ceilingColor)}
      <h3>Точечные светильники</h3>${opts('spot')}
      <label style="display:block;margin-top:12px"><span class="lbl">Количество светильников</span>
        <input class="inp" type="number" inputmode="numeric" min="0" step="1" data-field="spotsCount" value="${esc(state.spotsCount)}" placeholder="авто: ${result?.geometry.spots ?? ''}"></label>`));
    parts.push(step(n++, 'Двери и электрика', `
      ${state.rooms.some((r) => Number(r.doors) > 0) ? `<h3>Межкомнатные двери</h3>${opts('door')}` : ''}
      <h3>Розетки и выключатели</h3>${opts('electric')}
      <div class="row2" style="margin-top:12px">
        <label><span class="lbl">Розеток</span><input class="inp" type="number" inputmode="numeric" min="0" step="1" data-field="socketsCount" value="${esc(state.socketsCount)}" placeholder="авто: ${result?.geometry.sockets ?? ''}"></label>
        <label><span class="lbl">Выключателей</span><input class="inp" type="number" inputmode="numeric" min="0" step="1" data-field="switchesCount" value="${esc(state.switchesCount)}" placeholder="авто: ${result?.geometry.switches ?? ''}"></label>
      </div>`));
    parts.push(`<section class="card" id="est"></section>`);
    app.innerHTML = parts.join('');
    renderViz();
    renderEstimate();
  }

  function renderViz() {
    const card = document.getElementById('vizCard');
    if (!card) return;
    const color = (slot, fallback) => item(state.options[slot])?.color || fallback;
    const tab = hasWet() ? state.vizTab : 'room';
    const common = {
      ceiling: state.ceilingColor === 'color' ? COLORED_CEILING : '#fbfbf9',
      electric: color('electric', '#ffffff'), spot: color('spot', '#ffffff'),
      spots: Number(state.spotsCount) || result?.geometry.spots || 8,
    };
    const svg = tab === 'bath'
      ? Viz.bath({
        ...common, tileWall: color('tileWall', '#eee'), tileFloor: color('tileFloor', '#ccc'),
        bathKind: item(state.options.bath)?.kind || 'bathtub', toiletKind: item(state.options.toilet)?.kind || 'compact',
        sinkCabinet: /тумб/i.test(item(state.options.sink)?.name || ''),
      })
      : Viz.room({ ...common, floor: color('laminate', '#c49a6c'), wall: color('wallpaper', '#ddd'), door: color('door', '#f7f7f5') });
    card.innerHTML = `
      ${hasWet() ? `<div class="viz-tabs seg">${['room', 'bath'].map((t) => `<button type="button" class="${t === tab ? 'on' : ''}" data-act="vizTab" data-val="${t}">${t === 'room' ? 'Комната' : 'Санузел'}</button>`).join('')}</div>` : ''}
      ${svg}
      <p class="viz-note">Схема меняется вместе с выбором: цвет пола, стен, плитки, потолка, розеток, вид сантехники. Это иллюстрация, а не дизайн-проект.</p>`;
  }

  function renderEstimate() {
    const card = document.getElementById('est');
    if (!card) return;
    if (submitted) {
      card.innerHTML = `<div class="okmsg"><div class="stamp">Заявка<br>№${submitted.id}</div>
        <h2>Спасибо, ${esc(state.contact.name)}!</h2>
        <p class="muted">Смета на ${fmt(submitted.total)} ₽ сохранена. Мы перезвоним в течение 15 минут, ответим на вопросы и договоримся о бесплатном замере.</p>
        <button type="button" class="btn ghost" data-act="again">Новый расчёт</button></div>`;
      return;
    }
    if (!result) {
      card.innerHTML = `<h2>Смета</h2><p class="err">${esc(lastError || 'Считаем…')}</p>`;
      return;
    }
    const secs = result.sections.map((s) => `<details class="sec"><summary><span>${esc(s.title)}</span><span>${fmt(s.total)} ₽</span></summary>
      ${s.lines.map((l) => `<div class="line"><span class="n">${esc(l.name)}</span><span class="q">${l.qty.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${esc(l.unit)}</span><span>${fmt(l.price)} ₽</span></div>`).join('')}
    </details>`).join('');
    const c = state.contact;
    card.innerHTML = `
      <div class="step-head"><span class="step-num">₽</span><h2>Ваша смета</h2></div>
      ${lastError ? `<p class="err">${esc(lastError)}</p>` : ''}
      ${secs}
      <div class="total-big"><span>Итого за ${fmt(result.area)} м²<br><span class="muted">≈ ${fmt(result.perM2)} ₽/м², материалы и работы</span></span><b>${fmt(result.total)} ₽</b></div>
      <p class="muted">Предварительный расчёт по ценам магазина на сегодня, действителен ${result.validDays} дн. Точная смета — после бесплатного замера.</p>
      <h3>Получить смету и записаться на замер</h3>
      <div class="row2">
        <label><span class="lbl">Имя</span><input class="inp" data-contact="name" value="${esc(c.name)}" autocomplete="name"></label>
        <label><span class="lbl">Телефон</span><input class="inp" type="tel" data-contact="phone" value="${esc(c.phone)}" placeholder="+7 900 000 00 00" autocomplete="tel"></label>
      </div>
      <label class="check"><input type="checkbox" data-contact="consent" ${c.consent ? 'checked' : ''}> Согласен на обработку персональных данных для связи со мной по расчёту</label>
      <p class="err hidden" id="formErr"></p>
      <button type="button" class="btn block" data-act="submit">Отправить смету</button>`;
  }

  function renderBar() {
    if (result && !lastError) {
      barSum.textContent = `${fmt(result.total)} ₽`;
      barSub.textContent = `${fmt(result.area)} м² · ≈ ${fmt(result.perM2)} ₽/м²`;
    } else {
      barSum.textContent = result ? `${fmt(result.total)} ₽` : '—';
      barSub.textContent = lastError || 'Считаем…';
    }
  }

  // ---------- Расчёт ----------

  let timer = null, seq = 0;
  function recalc() {
    save();
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const my = ++seq;
      try {
        const res = await fetch('/api/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildInput()) });
        const data = await res.json();
        if (my !== seq) return;
        if (!res.ok) { lastError = data.error || 'Ошибка расчёта'; } else { result = data; lastError = ''; }
      } catch {
        if (my !== seq) return;
        lastError = 'Нет связи с сервером';
      }
      renderBar();
      renderEstimate();
      const area = document.getElementById('areaOut');
      if (area && result) area.textContent = `${fmt(result.area)} м²`;
      for (const f of ['spotsCount', 'socketsCount', 'switchesCount']) {
        const el = app.querySelector(`[data-field="${f}"]`);
        const key = { spotsCount: 'spots', socketsCount: 'sockets', switchesCount: 'switches' }[f];
        if (el && result) el.placeholder = `авто: ${result.geometry[key]}`;
      }
      renderViz();
    }, 250);
  }

  async function submit() {
    const err = document.getElementById('formErr');
    const btn = app.querySelector('[data-act="submit"]');
    const showErr = (t) => { err.textContent = t; err.classList.remove('hidden'); };
    const c = state.contact;
    if (String(c.name).trim().length < 2) return showErr('Укажите имя');
    if (String(c.phone).replace(/\D/g, '').length < 10) return showErr('Укажите телефон');
    if (!c.consent) return showErr('Нужно согласие на обработку персональных данных');
    btn.disabled = true; btn.textContent = 'Отправляем…';
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: c.name, phone: c.phone, consent: true, input: buildInput() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось отправить');
      submitted = data;
      renderEstimate();
      document.getElementById('est').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      showErr(e.message);
      btn.disabled = false; btn.textContent = 'Отправить смету';
    }
  }

  // ---------- События ----------

  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act } = el.dataset;
    if (act === 'pick') { state.options[el.dataset.slot] = el.dataset.id; }
    else if (act === 'bathKind' || act === 'toiletKind') { state[act] = el.dataset.val; state.options[act === 'bathKind' ? 'bath' : 'toilet'] = null; }
    else if (act === 'ceilingColor') { state.ceilingColor = el.dataset.val; }
    else if (act === 'vizTab') { state.vizTab = el.dataset.val; save(); return renderViz(); }
    else if (act === 'addRoom') {
      const t = el.dataset.type, def = roomTypes[t];
      state.rooms.push({ type: t, name: def.label.split(' /')[0], length: '', width: '', windows: def.windows, doors: def.doors });
    } else if (act === 'delRoom') { state.rooms.splice(Number(el.dataset.i), 1); }
    else if (act === 'submit') { return submit(); }
    else if (act === 'again') { submitted = null; renderEstimate(); return; }
    else return;
    render();
    recalc();
  });

  app.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.contact) {
      state.contact[el.dataset.contact] = el.type === 'checkbox' ? el.checked : el.value;
      return save();
    }
    const field = el.dataset.field;
    if (!field) return;
    if (el.dataset.room !== undefined) state.rooms[Number(el.dataset.room)][field] = el.value;
    else state[field] = el.type === 'checkbox' ? el.checked : el.value;
    recalc();
  });

  document.getElementById('barBtn').addEventListener('click', () => {
    document.getElementById('est')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  (async function init() {
    try {
      const data = await (await fetch('/api/catalog')).json();
      catalog = data.categories;
      roomTypes = data.roomTypes;
    } catch {
      app.innerHTML = '<div class="card"><p class="err">Не удалось загрузить каталог. Обновите страницу.</p></div>';
      return;
    }
    render();
    recalc();
  })();
})();
