// Движок расчёта сметы. Чистые функции без доступа к БД:
// на вход — параметры квартиры и выбор клиента, справочники; на выход — строки сметы и итоги.

export const ROOM_TYPES = {
  living: { label: 'Комната', sockets: 5, switches: 1, windows: 1, doors: 1, wet: false },
  kitchen: { label: 'Кухня', sockets: 7, switches: 1, windows: 1, doors: 0, wet: false },
  hall: { label: 'Коридор', sockets: 2, switches: 1, windows: 0, doors: 0, wet: false },
  bath: { label: 'Ванная / совмещённый санузел', sockets: 2, switches: 1, windows: 0, doors: 1, wet: true },
  wc: { label: 'Туалет', sockets: 0, switches: 1, windows: 0, doors: 1, wet: true },
};

// Слоты выбора: ключ в options → категория каталога. Обязательность зависит от наличия санузла.
export const SLOTS = {
  laminate: { category: 'laminate', needs: 'dry' },
  wallpaper: { category: 'wallpaper', needs: 'dry' },
  door: { category: 'door', needs: 'doors' },
  electric: { category: 'electric', needs: 'any' },
  spot: { category: 'spot', needs: 'any' },
  tileWall: { category: 'tileWall', needs: 'wet' },
  tileFloor: { category: 'tileFloor', needs: 'wet' },
  toilet: { category: 'toilet', needs: 'wet' },
  bath: { category: 'bath', needs: 'bath' },
  bathFaucet: { category: 'bathFaucet', needs: 'bath' },
  sink: { category: 'sink', needs: 'bath' },
  sinkFaucet: { category: 'sinkFaucet', needs: 'bath' },
  towel: { category: 'towel', needs: 'bath' },
};

export const SECTIONS = {
  prep: 'Черновые работы',
  floor: 'Пол',
  walls: 'Стены',
  wet: 'Санузел',
  ceiling: 'Потолок',
  doors: 'Двери',
  electric: 'Электрика',
  other: 'Прочее',
};

export class EstimateError extends Error {}

const num = (v, min, max, fallback) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new EstimateError(`Недопустимое значение: ${v}`);
  return n;
};
const int = (v, min, max, fallback) => {
  const n = num(v, min, max, fallback);
  return n === undefined ? n : Math.round(n);
};
const round2 = (n) => Math.round(n * 100) / 100;

// Проверяет и дополняет ввод значениями по умолчанию. Бросает EstimateError.
export function normalizeInput(input, catalog) {
  if (!input || typeof input !== 'object') throw new EstimateError('Пустой запрос');
  const height = num(input.height, 2, 5, 2.7);
  if (!Array.isArray(input.rooms) || input.rooms.length === 0) throw new EstimateError('Добавьте хотя бы одно помещение');
  if (input.rooms.length > 20) throw new EstimateError('Слишком много помещений');

  const rooms = input.rooms.map((r, i) => {
    const type = ROOM_TYPES[r?.type] ? r.type : null;
    if (!type) throw new EstimateError(`Неизвестный тип помещения №${i + 1}`);
    const def = ROOM_TYPES[type];
    return {
      type,
      name: String(r.name || def.label).slice(0, 60),
      length: num(r.length, 0.5, 30),
      width: num(r.width, 0.5, 30),
      windows: int(r.windows, 0, 10, def.windows),
      doors: int(r.doors, 0, 5, def.doors),
    };
  });
  for (const r of rooms) {
    if (r.length === undefined || r.width === undefined) throw new EstimateError(`Укажите размеры: ${r.name}`);
  }

  const o = input.options || {};
  const has = {
    dry: rooms.some((r) => !ROOM_TYPES[r.type].wet),
    wet: rooms.some((r) => ROOM_TYPES[r.type].wet),
    bath: rooms.some((r) => r.type === 'bath'),
    doors: rooms.some((r) => r.doors > 0),
    any: true,
  };
  const options = {
    screed: o.screed !== false,
    plaster: o.plaster !== false,
    ceilingColor: o.ceilingColor === 'color' ? 'color' : 'white',
    socketsCount: int(o.socketsCount, 0, 200, undefined),
    switchesCount: int(o.switchesCount, 0, 100, undefined),
    spotsCount: int(o.spotsCount, 0, 200, undefined),
  };
  for (const [slot, { category, needs }] of Object.entries(SLOTS)) {
    if (!has[needs]) continue;
    const item = catalog.get(o[slot]);
    if (!item || item.category !== category || !item.enabled) {
      throw new EstimateError(`Выберите позицию: ${slot}`);
    }
    options[slot] = item.id;
  }
  return { height, rooms, options };
}

// Геометрия: площади пола, стен, периметры по сухим и мокрым зонам.
export function measure({ height, rooms }, settings) {
  const g = {
    area: 0, dryFloor: 0, dryWalls: 0, dryPerimeter: 0, dryDoors: 0,
    wetFloor: 0, wetWalls: 0, wetPerimeter: 0,
    bathCount: 0, wcCount: 0, doors: 0, windows: 0, sockets: 0, switches: 0,
  };
  for (const r of rooms) {
    const def = ROOM_TYPES[r.type];
    const floor = r.length * r.width;
    const perimeter = 2 * (r.length + r.width);
    const walls = Math.max(0, perimeter * height - r.windows * settings.windowArea - r.doors * settings.doorArea);
    g.area += floor;
    g.doors += r.doors;
    g.windows += r.windows;
    g.sockets += def.sockets;
    g.switches += def.switches;
    if (def.wet) {
      g.wetFloor += floor; g.wetWalls += walls; g.wetPerimeter += perimeter;
      if (r.type === 'bath') g.bathCount++; else g.wcCount++;
    } else {
      g.dryFloor += floor; g.dryWalls += walls; g.dryPerimeter += perimeter; g.dryDoors += r.doors;
    }
  }
  for (const k of Object.keys(g)) g[k] = round2(g[k]);
  return g;
}

export function estimate(rawInput, { settings, rates, catalog }) {
  const input = normalizeInput(rawInput, catalog);
  const { options: o } = input;
  const s = settings;
  const g = measure(input, s);
  const lines = [];

  const material = (section, id, qty) => {
    if (!(qty > 0)) return;
    const item = catalog.get(id);
    if (!item) throw new Error(`Нет позиции каталога ${id}`);
    lines.push({
      section, type: 'material', itemId: id, name: item.name, unit: item.unit,
      qty: round2(qty), unitPrice: item.price, cost: round2(qty * item.price),
      url: item.url || null, verified: !!item.verified,
    });
  };
  const work = (section, id, qty) => {
    if (!(qty > 0)) return;
    const rate = rates.get(id);
    if (!rate) throw new Error(`Нет расценки ${id}`);
    lines.push({
      section, type: 'work', rateId: id, name: rate.name, unit: rate.unit,
      qty: round2(qty), unitPrice: rate.price, cost: round2(qty * rate.price),
    });
  };
  const sub = (section, name, unit, qty, unitPrice) => {
    if (!(qty > 0)) return;
    lines.push({ section, type: 'sub', name, unit, qty: round2(qty), unitPrice, cost: round2(qty * unitPrice) });
  };
  const ceil = Math.ceil;
  const allWalls = g.dryWalls + g.wetWalls;
  const wetUnits = g.bathCount + g.wcCount;

  // Черновые
  if (o.plaster) {
    material('prep', 'rough-plaster', ceil((allWalls * 8.5) / 30));
    work('prep', 'plaster', allWalls);
  }
  if (o.screed) {
    material('prep', 'rough-screed', ceil((g.area * 5 * 20) / 40));
    work('prep', 'screed', g.area);
  }
  material('prep', 'rough-primer', Math.max(1, ceil(((allWalls + g.area) * 0.2) / 10)));
  material('prep', 'rough-misc', g.area);

  // Пол
  if (g.dryFloor > 0) {
    const lam = g.dryFloor * (1 + s.reserveLaminate);
    material('floor', o.laminate, ceil(lam * 10) / 10);
    material('floor', 'rough-underlay', ceil(lam));
    work('floor', 'laminate', g.dryFloor);
    const plinthM = Math.max(0, g.dryPerimeter - g.dryDoors * 0.8);
    material('floor', 'rough-plinth', ceil((plinthM * 1.05) / 2.5));
    work('floor', 'plinth', plinthM);
  }

  // Стены
  if (g.dryWalls > 0) {
    const wp = catalog.get(o.wallpaper);
    material('walls', 'rough-putty', ceil((g.dryWalls * 1.2) / 25));
    work('walls', 'putty', g.dryWalls);
    material('walls', o.wallpaper, ceil((g.dryWalls * (1 + s.reserveWallpaper)) / (wp.coverage || 10.6)));
    material('walls', 'rough-wpglue', Math.max(1, ceil(g.dryWalls / 30)));
    work('walls', 'wallpaper', g.dryWalls);
  }

  // Санузел
  if (wetUnits > 0) {
    const bath = g.bathCount > 0 ? catalog.get(o.bath) : null;
    const showers = bath && bath.kind !== 'bathtub' ? g.bathCount : 0;
    const wpArea = g.wetFloor + g.wetPerimeter * 0.2 + showers * 2;
    material('wet', 'rough-waterproof', ceil((wpArea * 1.5) / 15));
    work('wet', 'waterproofing', wpArea);
    material('wet', o.tileWall, ceil(g.wetWalls * (1 + s.reserveTile) * 10) / 10);
    material('wet', o.tileFloor, ceil(g.wetFloor * (1 + s.reserveTile) * 10) / 10);
    const tiled = g.wetWalls + g.wetFloor;
    material('wet', 'rough-tileglue', ceil((tiled * 5) / 25));
    material('wet', 'rough-grout', ceil((tiled * 0.4) / 2));
    work('wet', 'tileWall', g.wetWalls);
    work('wet', 'tileFloor', g.wetFloor);
    work('wet', 'pipeBox', wetUnits);
    material('wet', 'rough-plumbing', wetUnits);
    work('wet', 'plumbingRough', wetUnits);

    const toilet = catalog.get(o.toilet);
    material('wet', o.toilet, wetUnits);
    work('wet', toilet.kind === 'installation' ? 'installationInstall' : 'toiletCompactInstall', wetUnits);

    if (bath) {
      const n = g.bathCount;
      material('wet', o.bath, n);
      work('wet', { bathtub: 'bathtubInstall', tray: 'trayInstall', drain: 'drainInstall' }[bath.kind] || 'bathtubInstall', n);
      material('wet', o.bathFaucet, n);
      material('wet', o.sink, n);
      work('wet', 'sinkInstall', n);
      material('wet', o.sinkFaucet, n);
      work('wet', 'faucetInstall', 2 * n);
      material('wet', o.towel, n);
      work('wet', 'towelInstall', n);
    }
  }

  // Потолок (подрядчик под ключ) и светильники
  const spots = o.spotsCount ?? Math.max(4, Math.round(g.area / 1.5));
  const ceilRate = o.ceilingColor === 'color' ? s.ceilingColorPerM2 : s.ceilingWhitePerM2;
  sub('ceiling', `Натяжной потолок матовый, ${o.ceilingColor === 'color' ? 'цветной' : 'белый'}`, 'м²', g.area, ceilRate);
  material('ceiling', o.spot, spots);
  sub('ceiling', 'Монтаж точечных светильников в натяжной потолок', 'шт', spots, s.spotInstall);

  // Двери
  if (g.doors > 0) {
    material('doors', o.door, g.doors);
    work('doors', 'door', g.doors);
  }

  // Электрика
  const sockets = o.socketsCount ?? g.sockets;
  const switches = o.switchesCount ?? g.switches;
  const points = sockets + switches;
  if (points > 0) {
    material('electric', 'rough-electric', points);
    work('electric', 'electricPoint', points);
    material('electric', o.electric, points);
    work('electric', 'socketInstall', points);
  }
  material('electric', 'rough-panel', 1);
  work('electric', 'panel', 1);

  work('other', 'cleanup', g.area);

  // Итоги. Клиентская цена строки = себестоимость × k, где k включает наценку и налог.
  const k = (1 + s.markup) / (1 - s.taxRate);
  let materialsRetail = 0, works = 0, subcontract = 0, clientTotal = 0;
  for (const l of lines) {
    if (l.type === 'material') materialsRetail += l.cost;
    else if (l.type === 'work') works += l.cost;
    else subcontract += l.cost;
    l.clientPrice = Math.round(l.cost * k);
    clientTotal += l.clientPrice;
  }
  const discount = materialsRetail * s.supplierDiscount;
  const base = materialsRetail + works + subcontract;
  const tax = clientTotal * s.taxRate;
  const ourCost = base - discount;
  const totals = {
    materialsRetail: Math.round(materialsRetail),
    supplierDiscount: Math.round(discount),
    works: Math.round(works),
    subcontract: Math.round(subcontract),
    base: Math.round(base),
    markup: Math.round(base * s.markup),
    tax: Math.round(tax),
    ourCost: Math.round(ourCost),
    clientTotal,
    netProfit: Math.round(clientTotal - tax - ourCost),
    perM2: g.area > 0 ? Math.round(clientTotal / g.area) : 0,
  };
  return { input, geometry: { ...g, spots, sockets, switches, points }, lines, totals };
}

// То, что можно показать клиенту: без себестоимости, наценки, налога и скидки.
export function publicView(result, settings) {
  const sections = [];
  for (const [key, title] of Object.entries(SECTIONS)) {
    const ls = result.lines.filter((l) => l.section === key);
    if (!ls.length) continue;
    sections.push({
      key, title,
      total: ls.reduce((a, l) => a + l.clientPrice, 0),
      lines: ls.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, price: l.clientPrice, type: l.type, url: l.url || null })),
    });
  }
  const g = result.geometry;
  return {
    total: result.totals.clientTotal,
    perM2: result.totals.perM2,
    area: g.area,
    validDays: settings.estimateValidDays,
    geometry: {
      area: g.area, dryWalls: g.dryWalls, wetWalls: g.wetWalls, doors: g.doors,
      spots: g.spots, sockets: g.sockets, switches: g.switches,
    },
    sections,
  };
}
