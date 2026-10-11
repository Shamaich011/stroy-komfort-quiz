(function () {
  const app = document.getElementById('app');
  const logoutBtn = document.getElementById('logout');
  const STATUS = { new: 'Новая', contacted: 'Связались', measure: 'Замер', contract: 'Договор', work: 'В работе', done: 'Завершено', lost: 'Отказ' };
  const CATEGORY = {
    rough: 'Черновые материалы', laminate: 'Ламинат', wallpaper: 'Обои', tileWall: 'Плитка — стены', tileFloor: 'Плитка — пол',
    door: 'Двери', electric: 'Розетки и выключатели', spot: 'Светильники', bath: 'Ванна / душ', bathFaucet: 'Смеситель ванна/душ',
    toilet: 'Унитаз', sink: 'Раковина', sinkFaucet: 'Смеситель раковины', towel: 'Полотенцесушитель',
  };
  const KIND_HINT = { bath: 'bathtub / tray / drain', toilet: 'compact / installation', electric: 'black / white' };
  const SLOT_LABEL = {
    laminate: 'Ламинат', wallpaper: 'Обои', door: 'Двери', electric: 'Электрика', spot: 'Светильники', tileWall: 'Плитка стены',
    tileFloor: 'Плитка пол', toilet: 'Унитаз', bath: 'Ванна/душ', bathFaucet: 'Смеситель ванны', sink: 'Раковина', sinkFaucet: 'Смеситель раковины', towel: 'Полотенцесушитель',
  };
  let tab = 'leads', statusFilter = '';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('ru-RU'));
  const dt = (s) => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  async function api(url, opts = {}) {
    const res = await fetch('/api/admin' + url, {
      ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { showLogin(); throw new Error('auth'); }
    if (!res.ok) throw new Error(data.error || 'Ошибка');
    return data;
  }

  function showLogin(error = '') {
    logoutBtn.classList.add('hidden');
    app.innerHTML = `<div class="card" style="max-width:380px;margin:40px auto">
      <h2>Вход в админку</h2>
      <form id="loginForm" style="margin-top:14px">
        <label><span class="lbl">Пароль</span><input class="inp" type="password" name="password" autocomplete="current-password" required></label>
        ${error ? `<p class="err">${esc(error)}</p>` : ''}
        <button class="btn block" style="margin-top:12px">Войти</button>
      </form></div>`;
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: e.target.password.value }) });
      if (res.ok) render(); else showLogin((await res.json().catch(() => ({}))).error || 'Ошибка входа');
    });
  }

  function tabs() {
    const t = { leads: 'Заявки', stats: 'Статистика', prices: 'Наценка и работы', catalog: 'Каталог' };
    return `<div class="tabs seg">${Object.entries(t).map(([k, v]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>`;
  }

  async function render() {
    try { await api('/me'); } catch { return; }
    logoutBtn.classList.remove('hidden');
    app.innerHTML = tabs() + '<div id="body"><div class="card">Загрузка…</div></div>';
    const body = document.getElementById('body');
    try {
      if (tab === 'leads') await renderLeads(body);
      else if (tab === 'stats') await renderStats(body);
      else if (tab === 'prices') await renderPrices(body);
      else await renderCatalog(body);
    } catch (e) {
      if (e.message !== 'auth') body.innerHTML = `<div class="card err">${esc(e.message)}</div>`;
    }
  }

  // ---------- Заявки ----------

  async function renderLeads(body) {
    const leads = await api('/leads' + (statusFilter ? `?status=${statusFilter}` : ''));
    const statusSelect = (l) => `<select class="inp small" data-status="${l.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
    body.innerHTML = `
      <div class="seg">${[['', 'Все'], ...Object.entries(STATUS)].map(([k, v]) => `<button class="${k === statusFilter ? 'on' : ''}" data-filter="${k}">${v}</button>`).join('')}</div>
      ${leads.length ? '' : '<div class="card muted">Заявок пока нет.</div>'}
      ${leads.map((l) => `<div class="lead">
        <div class="lead-top">
          <div><span class="who">№${l.id} · ${esc(l.name)}</span> · <a href="tel:${esc(l.phone.replace(/[^\d+]/g, ''))}">${esc(l.phone)}</a><br>
            <span class="muted">${dt(l.created_at)} · ${l.source === 'calc' ? 'Калькулятор' : 'Квиз'}${l.area ? ` · ${fmt(l.area)} м²` : ''}</span></div>
          ${statusSelect(l)}
        </div>
        ${l.client_total ? `<div class="money" style="margin-top:8px"><span>Смета <b>${fmt(l.client_total)} ₽</b></span><span class="profit">Прибыль <b>${fmt(l.net_profit)} ₽</b></span></div>` : ''}
        ${l.comment ? `<p class="muted" style="margin:6px 0 0">💬 ${esc(l.comment)}</p>` : ''}
        <button class="btn ghost sm" style="margin-top:8px" data-open="${l.id}">Подробнее</button>
        <div id="lead-${l.id}"></div>
      </div>`).join('')}`;
  }

  async function openLead(id) {
    const box = document.getElementById(`lead-${id}`);
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const l = await api(`/leads/${id}`);
    const d = l.data;
    let html = '';
    if (d.answers) {
      html += `<p>${Object.values(d.answers).map(esc).join(' · ')}</p>`;
    }
    if (d.totals) {
      const t = d.totals;
      const names = Object.fromEntries(d.lines.filter((x) => x.itemId).map((x) => [x.itemId, x.name]));
      html += `
        <h3>Выбор клиента</h3>
        <p style="font-size:13px">${Object.entries(SLOT_LABEL).filter(([k]) => d.input.options[k]).map(([k, v]) => `<b>${v}:</b> ${esc(names[d.input.options[k]] || d.input.options[k])}`).join('<br>')}</p>
        <p class="muted">${d.input.rooms.map((r) => `${esc(r.name)} ${r.length}×${r.width} м`).join(' · ')} · потолок ${d.input.height} м
          ${d.input.options.screed ? '' : ' · без стяжки'}${d.input.options.plaster ? '' : ' · без штукатурки'}</p>
        <h3>Экономика</h3>
        <table><tbody>
          <tr><td>Материалы по цене магазина</td><td class="num">${fmt(t.materialsRetail)} ₽</td></tr>
          <tr><td>Скидка поставщика (ваша, скрыта от клиента)</td><td class="num profit">${fmt(t.supplierDiscount)} ₽</td></tr>
          <tr><td>Работы (себестоимость)</td><td class="num">${fmt(t.works)} ₽</td></tr>
          <tr><td>Подряд (потолок)</td><td class="num">${fmt(t.subcontract)} ₽</td></tr>
          <tr><td>Наценка ${Math.round(d.settings.markup * 100)}%</td><td class="num">${fmt(t.markup)} ₽</td></tr>
          <tr><td>Налог ${Math.round(d.settings.taxRate * 100)}%</td><td class="num">${fmt(t.tax)} ₽</td></tr>
          <tr><td><b>Цена клиенту</b></td><td class="num"><b>${fmt(t.clientTotal)} ₽</b></td></tr>
          <tr><td>Ваши затраты (со скидкой)</td><td class="num">${fmt(t.ourCost)} ₽</td></tr>
          <tr><td><b>Чистая прибыль после налога</b></td><td class="num profit"><b>${fmt(t.netProfit)} ₽</b></td></tr>
        </tbody></table>
        <h3>Строки сметы</h3>
        <div class="scroll"><table><thead><tr><th>Позиция</th><th class="num">Кол-во</th><th class="num">Себест.</th><th class="num">Клиенту</th></tr></thead><tbody>
          ${d.lines.map((x) => `<tr><td>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}
            ${x.type === 'material' && !x.verified ? ' <span class="badge warn">цена не проверена</span>' : ''}</td>
            <td class="num">${x.qty} ${esc(x.unit)}</td><td class="num">${fmt(x.cost)}</td><td class="num">${fmt(x.clientPrice)}</td></tr>`).join('')}
        </tbody></table></div>`;
    }
    html += `<h3>Комментарий</h3><textarea class="inp" rows="2" data-comment="${id}">${esc(l.comment)}</textarea>
      <button class="btn sm" style="margin-top:6px" data-savecomment="${id}">Сохранить</button> <span class="saved hidden" id="cs-${id}">Сохранено</span>`;
    box.innerHTML = html;
  }

  // ---------- Статистика ----------

  async function renderStats(body) {
    const s = await api('/stats');
    const count = (k) => s.byStatus.find((x) => x.status === k)?.n || 0;
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><span class="muted">Расчётов с заявкой</span><b>${s.n}</b></div>
        <div class="stat"><span class="muted">Сумма смет</span><b>${fmt(s.total)} ₽</b></div>
        <div class="stat"><span class="muted">Потенциальная прибыль</span><b class="profit">${fmt(s.profit)} ₽</b></div>
        <div class="stat"><span class="muted">Средняя площадь</span><b>${fmt(s.avgArea)} м²</b></div>
      </div>
      <div class="card"><h2>Воронка</h2><table><tbody>${Object.entries(STATUS).map(([k, v]) => `<tr><td>${v}</td><td class="num">${count(k)}</td></tr>`).join('')}</tbody></table></div>
      <div class="card"><h2>Что выбирают чаще</h2>
        ${Object.keys(s.popular).length ? Object.entries(s.popular).map(([slot, list]) => `<h3>${SLOT_LABEL[slot] || slot}</h3>
          ${list.map((x) => `<div class="line" style="padding-left:0"><span class="n">${esc(x.name)}</span><span>${x.n}</span></div>`).join('')}`).join('') : '<p class="muted">Пока нет данных.</p>'}
      </div>`;
  }

  // ---------- Наценка и работы ----------

  async function renderPrices(body) {
    const { settings, rates } = await api('/refs');
    body.innerHTML = `
      <div class="card"><h2>Наценка, налог, скидка</h2>
        <p class="hint" style="margin-top:8px">Доли указываются дробью: 0.2 = 20%. Изменения сразу применяются к новым расчётам.</p>
        <table><tbody>${settings.map((s) => `<tr><td>${esc(s.label)}</td>
          <td class="num"><input class="inp small price" type="number" step="any" min="0" value="${s.value}" data-setting="${esc(s.key)}"></td></tr>`).join('')}</tbody></table></div>
      <div class="card"><h2>Расценки на работы (ваша себестоимость)</h2>
        <table><tbody>${rates.map((r) => `<tr><td>${esc(r.name)}</td><td class="muted">₽/${esc(r.unit)}</td>
          <td class="num"><input class="inp small price" type="number" step="any" min="0" value="${r.price}" data-rate="${esc(r.id)}"></td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- Каталог ----------

  async function renderCatalog(body) {
    const { catalog } = await api('/refs');
    const groups = {};
    for (const c of catalog) (groups[c.category] ||= []).push(c);
    body.innerHTML = `<p class="hint" style="margin:0 0 12px">Цены — по полке магазина, без вашей скидки. «Проверено» — цена сверена с сайтом. Выключенные позиции не видны клиенту.</p>` +
      Object.entries(CATEGORY).filter(([k]) => groups[k]).map(([cat, title]) => `<div class="card"><h2>${title}</h2>
        <div class="scroll"><table><thead><tr><th>Название</th><th>Ед.</th><th class="num">Цена, ₽</th>${cat === 'rough' ? '' : '<th>Показ</th>'}<th>Проверено</th><th></th></tr></thead><tbody>
        ${groups[cat].map((c) => `<tr data-item="${esc(c.id)}">
          <td><input class="inp small" data-f="name" value="${esc(c.name)}" style="min-width:220px">
            ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="muted">ссылка</a>` : ''}${c.kind ? ` <span class="badge">${esc(c.kind)}</span>` : ''}
            ${c.color ? ` <span class="badge" style="background:${esc(c.color)};border:1px solid #ccc">&nbsp;&nbsp;&nbsp;</span>` : ''}</td>
          <td>${esc(c.unit)}</td>
          <td class="num"><input class="inp small price" type="number" step="any" min="0" data-f="price" value="${c.price}"></td>
          ${cat === 'rough' ? '' : `<td><input type="checkbox" data-f="enabled" ${c.enabled ? 'checked' : ''}></td>`}
          <td><input type="checkbox" data-f="verified" ${c.verified ? 'checked' : ''}></td>
          <td><button class="btn sm" data-saveitem="${esc(c.id)}">ОК</button></td></tr>`).join('')}
        </tbody></table></div>
        ${cat === 'rough' ? '' : `<details style="margin-top:10px"><summary class="muted" style="cursor:pointer">+ Добавить позицию</summary>
          <form class="row2" data-add="${cat}" style="margin-top:10px">
            <label style="grid-column:1/-1"><span class="lbl">Название</span><input class="inp" name="name" required></label>
            <label><span class="lbl">Цена, ₽</span><input class="inp" name="price" type="number" step="any" min="0" required></label>
            <label><span class="lbl">Единица</span><input class="inp" name="unit" value="${esc(groups[cat][0]?.unit || 'шт')}" required></label>
            <label><span class="lbl">Цвет #RRGGBB</span><input class="inp" name="color" placeholder="#c49a6c"></label>
            ${KIND_HINT[cat] ? `<label><span class="lbl">Вид: ${KIND_HINT[cat]}</span><input class="inp" name="kind" required></label>` : ''}
            ${cat === 'wallpaper' ? '<label><span class="lbl">Покрытие рулона, м²</span><input class="inp" name="coverage" type="number" step="any" value="10.6"></label>' : ''}
            <label style="grid-column:1/-1"><span class="lbl">Ссылка на товар</span><input class="inp" name="url" placeholder="https://baucenter.ru/..."></label>
            <button class="btn">Добавить</button>
          </form></details>`}
      </div>`).join('');
  }

  // ---------- События ----------

  app.addEventListener('click', async (e) => {
    const t = e.target;
    try {
      if (t.dataset.tab) { tab = t.dataset.tab; render(); }
      else if (t.dataset.filter !== undefined) { statusFilter = t.dataset.filter; render(); }
      else if (t.dataset.open) { await openLead(t.dataset.open); }
      else if (t.dataset.savecomment) {
        const id = t.dataset.savecomment;
        await api(`/leads/${id}`, { method: 'PATCH', body: { comment: app.querySelector(`[data-comment="${id}"]`).value } });
        document.getElementById(`cs-${id}`).classList.remove('hidden');
      } else if (t.dataset.saveitem) {
        const row = t.closest('tr');
        const val = (f) => row.querySelector(`[data-f="${f}"]`);
        const patch = { name: val('name').value, price: Number(val('price').value), verified: val('verified').checked };
        if (val('enabled')) patch.enabled = val('enabled').checked;
        await api(`/catalog/${encodeURIComponent(t.dataset.saveitem)}`, { method: 'PATCH', body: patch });
        t.textContent = '✓';
        setTimeout(() => { t.textContent = 'ОК'; }, 1200);
      }
    } catch (err) { if (err.message !== 'auth') alert(err.message); }
  });

  app.addEventListener('change', async (e) => {
    const t = e.target;
    try {
      if (t.dataset.status) await api(`/leads/${t.dataset.status}`, { method: 'PATCH', body: { status: t.value } });
      else if (t.dataset.setting) await api(`/settings/${t.dataset.setting}`, { method: 'PATCH', body: { value: Number(t.value) } });
      else if (t.dataset.rate) await api(`/rates/${t.dataset.rate}`, { method: 'PATCH', body: { price: Number(t.value) } });
      else return;
      t.style.borderColor = 'var(--ok)';
    } catch (err) { if (err.message !== 'auth') { t.style.borderColor = 'var(--error)'; alert(err.message); } }
  });

  app.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form.dataset.add) return;
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    body.category = form.dataset.add;
    body.price = Number(body.price);
    try { await api('/catalog', { method: 'POST', body }); render(); } catch (err) { if (err.message !== 'auth') alert(err.message); }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showLogin();
  });

  render();
})();
