// Стартовые данные: настройки, расценки работ и каталог.
// Цены каталога собраны со страниц baucenter.ru (Краснодар) через поисковую выдачу
// и требуют проверки. verified: 1 — цена найдена на странице товара,
// 0 — рыночная оценка. Всё редактируется в админке.

export const SETTINGS = [
  { key: 'markup', value: 0.2, label: 'Наценка на смету (доля)' },
  { key: 'taxRate', value: 0.06, label: 'Налог УСН «доходы» (доля)' },
  { key: 'supplierDiscount', value: 0.08, label: 'Скидка у поставщика, не видна клиенту (доля)' },
  { key: 'reserveLaminate', value: 0.07, label: 'Запас ламината (доля)' },
  { key: 'reserveTile', value: 0.1, label: 'Запас плитки (доля)' },
  { key: 'reserveWallpaper', value: 0.15, label: 'Запас обоев (доля)' },
  { key: 'windowArea', value: 2.0, label: 'Площадь одного окна, м²' },
  { key: 'doorArea', value: 1.6, label: 'Площадь одного дверного проёма, м²' },
  { key: 'ceilingWhitePerM2', value: 550, label: 'Натяжной потолок белый, ₽/м² (подряд)' },
  { key: 'ceilingColorPerM2', value: 650, label: 'Натяжной потолок цветной, ₽/м² (подряд)' },
  { key: 'spotInstall', value: 350, label: 'Монтаж точечного светильника в потолок, ₽/шт' },
  { key: 'estimateValidDays', value: 5, label: 'Срок действия сметы, дней' },
];

export const WORK_RATES = [
  { id: 'plaster', name: 'Штукатурка стен по маякам', unit: 'м²', price: 550 },
  { id: 'screed', name: 'Стяжка пола', unit: 'м²', price: 450 },
  { id: 'putty', name: 'Шпаклёвка под обои в 2 слоя со шлифовкой', unit: 'м²', price: 350 },
  { id: 'wallpaper', name: 'Поклейка обоев', unit: 'м²', price: 250 },
  { id: 'waterproofing', name: 'Гидроизоляция санузла', unit: 'м²', price: 450 },
  { id: 'tileWall', name: 'Укладка плитки на стены', unit: 'м²', price: 1600 },
  { id: 'tileFloor', name: 'Укладка плитки на пол', unit: 'м²', price: 1600 },
  { id: 'pipeBox', name: 'Короб под трубы с люком', unit: 'шт', price: 5000 },
  { id: 'laminate', name: 'Укладка ламината с подложкой', unit: 'м²', price: 350 },
  { id: 'plinth', name: 'Монтаж плинтуса ПВХ', unit: 'м.п.', price: 150 },
  { id: 'door', name: 'Установка межкомнатной двери', unit: 'шт', price: 3500 },
  { id: 'electricPoint', name: 'Электрика: штроба, кабель, подрозетник', unit: 'точка', price: 700 },
  { id: 'panel', name: 'Сборка электрощитка', unit: 'шт', price: 4000 },
  { id: 'socketInstall', name: 'Установка розеток и выключателей', unit: 'шт', price: 250 },
  { id: 'plumbingRough', name: 'Разводка воды и канализации', unit: 'санузел', price: 12000 },
  { id: 'bathtubInstall', name: 'Установка ванны с экраном', unit: 'шт', price: 4000 },
  { id: 'trayInstall', name: 'Установка душевого поддона и ограждения', unit: 'шт', price: 6000 },
  { id: 'drainInstall', name: 'Душ с трапом: уклон, трап, стеклянное ограждение', unit: 'шт', price: 18000 },
  { id: 'toiletCompactInstall', name: 'Установка унитаза-компакта', unit: 'шт', price: 3000 },
  { id: 'installationInstall', name: 'Монтаж инсталляции с подвесным унитазом', unit: 'шт', price: 7000 },
  { id: 'sinkInstall', name: 'Установка раковины', unit: 'шт', price: 2500 },
  { id: 'faucetInstall', name: 'Установка смесителя', unit: 'шт', price: 1500 },
  { id: 'towelInstall', name: 'Установка полотенцесушителя', unit: 'шт', price: 2500 },
  { id: 'cleanup', name: 'Вывоз мусора, подъём материалов, уборка', unit: 'м²', price: 350 },
];

const BC = 'https://baucenter.ru';

// category: тип позиции; kind: подтип (вариант санузла, вид унитаза, цвет электрики).
// coverage — сколько м² покрывает одна единица (рулон обоев, мешок не нужен — считается в движке).
export const CATALOG = [
  // Черновые материалы (клиент их не выбирает, движок берёт по id)
  { id: 'rough-plaster', category: 'rough', name: 'Штукатурка гипсовая KNAUF Ротбанд 30 кг', unit: 'меш.', price: 650, verified: 0, url: `${BC}/shtukaturki/1263801` },
  { id: 'rough-screed', category: 'rough', name: 'Пескобетон М300 40 кг', unit: 'меш.', price: 300, verified: 0 },
  { id: 'rough-primer', category: 'rough', name: 'Грунтовка глубокого проникновения 10 л', unit: 'шт', price: 700, verified: 0 },
  { id: 'rough-putty', category: 'rough', name: 'Шпаклёвка KNAUF Ротбанд Финиш 25 кг', unit: 'меш.', price: 624, verified: 1, url: `${BC}/product/gipsovaya-shpaklevka-25-kg-knauf-rotband-finish-ctg-29116-29171-29179-511000586/` },
  { id: 'rough-waterproof', category: 'rough', name: 'Гидроизоляция обмазочная 15 кг', unit: 'шт', price: 2500, verified: 0 },
  { id: 'rough-tileglue', category: 'rough', name: 'Клей для плитки Церезит СМ 11 25 кг', unit: 'меш.', price: 600, verified: 1, url: `${BC}/catalog/kleya-dlya-plitki-ctg-29116-29171-29175/` },
  { id: 'rough-grout', category: 'rough', name: 'Затирка для швов 2 кг', unit: 'шт', price: 450, verified: 0 },
  { id: 'rough-wpglue', category: 'rough', name: 'Клей для флизелиновых обоев', unit: 'шт', price: 450, verified: 0 },
  { id: 'rough-underlay', category: 'rough', name: 'Подложка под ламинат', unit: 'м²', price: 60, verified: 0 },
  { id: 'rough-plinth', category: 'rough', name: 'Плинтус ПВХ 2,5 м с углами и заглушками', unit: 'шт', price: 330, verified: 0 },
  { id: 'rough-misc', category: 'rough', name: 'Расходники: серпянка, маяки, уголки, СВП', unit: 'м²', price: 100, verified: 0 },
  { id: 'rough-electric', category: 'rough', name: 'Кабель, гофра, подрозетник, клеммы на точку', unit: 'точка', price: 600, verified: 0 },
  { id: 'rough-panel', category: 'rough', name: 'Щиток, автоматы, УЗО', unit: 'компл.', price: 6000, verified: 0 },
  { id: 'rough-plumbing', category: 'rough', name: 'Трубы ПП, фитинги, канализация, краны', unit: 'санузел', price: 8000, verified: 0 },

  // Ламинат, цена за м²
  { id: 'lam-laminely', category: 'laminate', name: 'LAMINELY Открытие Дуб Светлый 8 мм, 33 кл.', unit: 'м²', price: 519, color: '#d9bf94', verified: 1, url: `${BC}/laminat/844478/` },
  { id: 'lam-expert', category: 'laminate', name: 'EXPERT CHOICE Дуб Валькирия 8 мм, 33 кл.', unit: 'м²', price: 789, color: '#c49a6c', verified: 1, url: `${BC}/product/laminat-expert-choice-dub-valkiriya-8-mm-33-klass-2-22-m2-ctg-29448-29470-29471-150002577/` },
  { id: 'lam-sanfloor', category: 'laminate', name: 'SAN FLOOR Дуб Ковас 12 мм, 33 кл.', unit: 'м²', price: 1150, color: '#a7825a', verified: 0, url: `${BC}/laminat/706451/` },
  { id: 'lam-egger', category: 'laminate', name: 'EGGER HOME Дуб Паркетный 8 мм, 32 кл.', unit: 'м²', price: 1100, color: '#b98e5f', verified: 0, url: `${BC}/product/laminat-egger-home-dub-parketnyy-s-faskoy-8-mm-32-klass-1-994-m2-ctg-29448-29470-29471-150002709/` },
  { id: 'lam-tarkett', category: 'laminate', name: 'TARKETT Estetica, 33 кл.', unit: 'м²', price: 1690, color: '#8a6a4a', verified: 1, url: `${BC}/new/1153765/` },
  { id: 'lam-grey', category: 'laminate', name: 'Ламинат серый дуб 8 мм, 33 кл.', unit: 'м²', price: 890, color: '#a9a49b', verified: 0 },

  // Обои, цена за рулон 10×1,06 м
  { id: 'wp-grey', category: 'wallpaper', name: 'Флизелиновые обои светло-серые 10×1,06 м', unit: 'рул.', price: 2000, coverage: 10.6, color: '#d6d3cc', verified: 0 },
  { id: 'wp-beige', category: 'wallpaper', name: 'Флизелиновые обои тёплый беж 10×1,06 м', unit: 'рул.', price: 2000, coverage: 10.6, color: '#e6dccb', verified: 0 },
  { id: 'wp-white', category: 'wallpaper', name: 'Обои под покраску Swedtex антивандальные 10×1,06 м', unit: 'рул.', price: 1390, coverage: 10.6, color: '#f3f1ec', verified: 1, url: `${BC}/catalog/oboi-pod-pokrasku-ctg-29494-29512-29517/` },
  { id: 'wp-sage', category: 'wallpaper', name: 'Флизелиновые обои шалфей 10×1,06 м', unit: 'рул.', price: 2400, coverage: 10.6, color: '#c3cbb7', verified: 0 },
  { id: 'wp-graphite', category: 'wallpaper', name: 'Флизелиновые обои графит 10×1,06 м', unit: 'рул.', price: 2600, coverage: 10.6, color: '#6f7074', verified: 0 },

  // Плитка на стены санузла, ₽/м²
  { id: 'tw-beige', category: 'tileWall', name: 'Плитка настенная светло-бежевая 25×40', unit: 'м²', price: 900, color: '#ece2d3', verified: 0 },
  { id: 'tw-white', category: 'tileWall', name: 'Плитка настенная белая глянец 30×60', unit: 'м²', price: 1050, color: '#f6f6f3', verified: 0 },
  { id: 'tw-brick', category: 'tileWall', name: 'Керамогранит Брикстори белый 30×60', unit: 'м²', price: 1290, color: '#f1efea', verified: 0, url: `${BC}/plitka_dlya_vannoy/977528/` },
  { id: 'tw-grey', category: 'tileWall', name: 'Керамогранит Гран Пале серый 49,7×49,7', unit: 'м²', price: 1190, color: '#b7b6b1', verified: 0, url: `${BC}/plitka_dlya_vannoy/966050/` },
  { id: 'tw-marble', category: 'tileWall', name: 'Керамогранит под мрамор 60×120', unit: 'м²', price: 1990, color: '#eeece8', verified: 1, url: `${BC}/new/1228603/` },

  // Плитка на пол санузла, ₽/м²
  { id: 'tf-proteo', category: 'tileFloor', name: 'Керамогранит Протео белый 40×40', unit: 'м²', price: 469, color: '#ecebe7', verified: 1 },
  { id: 'tf-albus', category: 'tileFloor', name: 'Керамогранит Альбус светло-серый 40×40 матовый', unit: 'м²', price: 859, color: '#c9c8c3', verified: 1 },
  { id: 'tf-techno', category: 'tileFloor', name: 'Керамогранит Техногрес Профи бежевый 30×30', unit: 'м²', price: 589, color: '#d7c9b0', verified: 1, url: `${BC}/keramogranit_tekhnicheskiy/774661/` },
  { id: 'tf-dream', category: 'tileFloor', name: 'Керамогранит Дрим вуд бежевый 19,4×120', unit: 'м²', price: 2390, color: '#c8a77f', verified: 1 },
  { id: 'tf-graphite', category: 'tileFloor', name: 'Керамогранит графит 60×60 матовый', unit: 'м²', price: 1290, color: '#55575b', verified: 0 },

  // Двери, цена за комплект: полотно, коробка, наличники, фурнитура
  { id: 'door-palitra', category: 'door', name: 'Дверь Палитра белая (полотно + коробка + наличник + фурнитура)', unit: 'компл.', price: 6700, color: '#f7f7f5', verified: 0, url: `${BC}/catalog/mezhkomnatnye-dveri-ctg-29559-29563-29566/mezhkomnatnye-belye-dveri-tag-2918015/` },
  { id: 'door-royalty', category: 'door', name: 'Дверь Роялти белая 2000×700, комплект', unit: 'компл.', price: 9900, color: '#f4f4f1', verified: 0, url: `${BC}/dveri_mezhkomnatnye/604703/` },
  { id: 'door-aura', category: 'door', name: 'Дверь Аура эмаль белая 2000×800, комплект', unit: 'компл.', price: 13500, color: '#fbfbfa', verified: 0, url: `${BC}/product/dver-mezhkomnatnaya-glukhaya-2000kh800-mm-aura-emal-belaya-ctg-29559-29563-29566-609006174/` },

  // Электрика: цена за точку (механизм + рамка), kind — цвет
  { id: 'el-ekf-black', category: 'electric', kind: 'black', name: 'EKF Стокгольм, чёрный', unit: 'точка', price: 270, color: '#1e1e22', verified: 1, url: `${BC}/rozetki_i_vyklyuchateli_skrytoy_ustanovki/1242090/` },
  { id: 'el-ekf-white', category: 'electric', kind: 'white', name: 'EKF Стокгольм, белый', unit: 'точка', price: 240, color: '#ffffff', verified: 0 },
  { id: 'el-smart-black', category: 'electric', kind: 'black', name: 'Smartbuy Нептун, чёрный', unit: 'точка', price: 300, color: '#1e1e22', verified: 1 },

  // Точечные светильники
  { id: 'spot-gx53', category: 'spot', name: 'Светильник GX53 белый + LED-лампа', unit: 'шт', price: 400, color: '#ffffff', verified: 0 },
  { id: 'spot-gx53-black', category: 'spot', name: 'Светильник GX53 чёрный + LED-лампа', unit: 'шт', price: 480, color: '#1e1e22', verified: 0 },

  // Ванна или душ, kind: bathtub / tray / drain
  { id: 'bath-acryl', category: 'bath', kind: 'bathtub', name: 'Ванна акриловая 170×70 с каркасом и экраном', unit: 'компл.', price: 16000, verified: 0 },
  { id: 'bath-tray', category: 'bath', kind: 'tray', name: 'Душевой поддон 90×90 + стеклянное ограждение', unit: 'компл.', price: 22000, verified: 0 },
  { id: 'bath-drain', category: 'bath', kind: 'drain', name: 'Линейный трап + стеклянная перегородка', unit: 'компл.', price: 24000, verified: 0 },

  // Смеситель для ванны или душа
  { id: 'bf-flumen-main', category: 'bathFaucet', name: 'Смеситель FLUMEN Main с душевым набором', unit: 'шт', price: 2999, verified: 1, url: `${BC}/smesiteli_dlya_vanny/666527/` },
  { id: 'bf-flumen-rois', category: 'bathFaucet', name: 'Смеситель FLUMEN Rois с длинным изливом', unit: 'шт', price: 5490, verified: 1 },
  { id: 'bf-ampm-gem', category: 'bathFaucet', name: 'Смеситель AM.PM Gem', unit: 'шт', price: 9090, verified: 1 },
  { id: 'bf-shower-system', category: 'bathFaucet', name: 'Душевая система AM.PM GEM с верхним душем', unit: 'шт', price: 18990, verified: 0, url: `${BC}/dushevye_kolonny/712315/` },

  // Унитаз, kind: compact / installation
  { id: 'wc-flumen', category: 'toilet', kind: 'compact', name: 'Унитаз-компакт FLUMEN Main безободковый', unit: 'шт', price: 9499, verified: 1 },
  { id: 'wc-ampm-like', category: 'toilet', kind: 'compact', name: 'Унитаз-компакт AM.PM Like, сиденье микролифт', unit: 'шт', price: 15990, verified: 1, url: `${BC}/unitazy_i_aksessuary_dlya_unitazov/559412/` },
  { id: 'wc-install-set', category: 'toilet', kind: 'installation', name: 'Инсталляция + подвесной унитаз + кнопка, комплект', unit: 'компл.', price: 24000, verified: 0 },
  { id: 'wc-install-ampm', category: 'toilet', kind: 'installation', name: 'Инсталляция AM.PM + подвесной унитаз безободковый', unit: 'компл.', price: 32000, verified: 0 },

  // Раковина
  { id: 'sink-cabinet', category: 'sink', name: 'Раковина с тумбой 60 см', unit: 'шт', price: 9000, verified: 0 },
  { id: 'sink-oslo', category: 'sink', name: 'Раковина FLUMEN Oslo 51,5×25,5 (без тумбы)', unit: 'шт', price: 4890, verified: 1 },
  { id: 'sink-cabinet-80', category: 'sink', name: 'Раковина с подвесной тумбой 80 см', unit: 'шт', price: 16000, verified: 0 },

  // Смеситель для раковины
  { id: 'sf-lippe', category: 'sinkFaucet', name: 'Смеситель FLUMEN Lippe хром', unit: 'шт', price: 2190, verified: 1 },
  { id: 'sf-milardo', category: 'sinkFaucet', name: 'Смеситель Milardo Note хром', unit: 'шт', price: 2990, verified: 1 },
  { id: 'sf-ampm-like', category: 'sinkFaucet', name: 'Смеситель AM.PM Like с поворотным изливом', unit: 'шт', price: 4990, verified: 1 },

  // Полотенцесушитель
  { id: 'towel-water', category: 'towel', name: 'Полотенцесушитель водяной хром', unit: 'шт', price: 5500, verified: 0 },
  { id: 'towel-electric', category: 'towel', name: 'Полотенцесушитель электрический', unit: 'шт', price: 9000, verified: 0 },
];
