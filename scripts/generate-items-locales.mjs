// Generates apps/items/locales/messages.json for Items Compendium across 13 languages.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = JSON.parse(readFileSync(path.join(ROOT, 'shared/i18n/languages.json'), 'utf8'));

const smithy = JSON.parse(readFileSync(path.join(ROOT, 'apps/smithy/locales/messages.json'), 'utf8'));
const provisions = JSON.parse(readFileSync(path.join(ROOT, 'apps/provisions/locales/messages.json'), 'utf8'));
const comfort = JSON.parse(readFileSync(path.join(ROOT, 'apps/comfort/locales/messages.json'), 'utf8'));
const hub = JSON.parse(readFileSync(path.join(ROOT, 'apps/hub/locales/messages.json'), 'utf8'));
const bestiary = JSON.parse(readFileSync(path.join(ROOT, 'apps/bestiary/locales/messages.json'), 'utf8'));

const messages = {};

function addExisting(source, key, targetKey = key) {
  if (source[key]) {
    messages[targetKey] = source[key];
    return true;
  }
  return false;
}

// 1. Borrow from existing catalogs
addExisting(provisions, '← Valheim Companion');
addExisting(provisions, 'Close');
addExisting(provisions, 'Reveal');
addExisting(provisions, 'Track your progress →');
addExisting(provisions, 'Fan project, not affiliated with Iron Gate. Data: Valheim Wiki (CC BY-SA 4.0).');
addExisting(provisions, 'Free, ad-free and made in my spare time.');
addExisting(provisions, 'If it helped your run, you can buy me a coffee.');
addExisting(provisions, 'Buy Me a Coffee at ko-fi.com');

addExisting(comfort, 'Locked until you reach this biome.');
addExisting(comfort, 'Add to shopping cart');
addExisting(comfort, 'Added to shopping cart.');

addExisting(smithy, "Can't be teleported");
addExisting(smithy, 'Teleportable');
addExisting(smithy, 'Sources');
addExisting(smithy, 'Used in');
addExisting(smithy, '{count} items');
addExisting(smithy, '{count} weapons');
addExisting(smithy, '{count} more in locked biomes');

addExisting(hub, 'Weapons');
addExisting(hub, 'Armor');
addExisting(provisions, 'Food');
addExisting(provisions, 'Meads');
addExisting(bestiary, 'Category');

// 2. Custom translations across all 13 languages
const manualTranslations = {
  'Items Compendium': {
    en: 'Items Compendium',
    cs: 'Items Compendium',
    de: 'Items Compendium',
    es: 'Items Compendium',
    fr: 'Items Compendium',
    pt: 'Items Compendium',
    zh: 'Items Compendium',
    hi: 'Items Compendium',
    ar: 'Items Compendium',
    bn: 'Items Compendium',
    ru: 'Items Compendium',
    ja: 'Items Compendium',
    id: 'Items Compendium',
  },
  'Search and explore every material, drop, trophy and crafting component across Valheim.': {
    en: 'Search and explore every material, drop, trophy and crafting component across Valheim.',
    cs: 'Hledejte a zkoumejte každý materiál, drop, trofej a řemeslnou surovinu ve Valheimu.',
    de: 'Suchen und erkunden Sie alle Materialien, Beute, Trophäen und Handwerkskomponenten in Valheim.',
    es: 'Busca y explora cada material, botín, trofeo y componente de artesanía en Valheim.',
    fr: 'Recherchez et explorez chaque matériau, butin, trophée et composant d’artisanat dans Valheim.',
    pt: 'Pesquise e explore todos os materiais, espólios, troféus e componentes de criação em Valheim.',
    zh: '搜索并探索英灵神殿中的所有材料、掉落物、战利品和制造组件。',
    hi: 'वाल्हाइम में हर सामग्री, ड्रॉप, ट्रॉफी और क्राफ्टिंग घटक को खोजें और एक्सप्लोर करें।',
    ar: 'ابحث واستكشف كل المواد والغنائم والجوائز ومكونات الصياغة في فالهيم.',
    bn: 'ভালহাইমের প্রতিটি উপাদান, ড্রপ, ট্রফি এবং ক্রাফটিং উপাদান খুঁজুন এবং অন্বেষণ করুন।',
    ru: 'Ищите и исследуйте каждый материал, добычу, трофей и компонент для крафта в Valheim.',
    ja: 'ヴァルハイムのあらゆる素材、ドロップ品、トロフィー、クラフト素材を検索して探索。',
    id: 'Cari dan jelajahi setiap material, jarahan, trofi, dan komponen pembuatan di Valheim.',
  },
  'Search items...': {
    en: 'Search items...',
    cs: 'Hledat položky...',
    de: 'Gegenstände suchen...',
    es: 'Buscar objetos...',
    fr: 'Rechercher des objets...',
    pt: 'Buscar itens...',
    zh: '搜索物品...',
    hi: 'वस्तुएँ खोजें...',
    ar: 'بحث عن العناصر...',
    bn: 'আইটেম অনুসন্ধান করুন...',
    ru: 'Поиск предметов...',
    ja: 'アイテムを検索...',
    id: 'Cari item...',
  },
  'All categories': {
    en: 'All categories',
    cs: 'Všechny kategorie',
    de: 'Alle Kategorien',
    es: 'Todas las categorías',
    fr: 'Toutes les catégories',
    pt: 'Todas as categorias',
    zh: '所有类别',
    hi: 'सभी श्रेणियाँ',
    ar: 'كل الفئات',
    bn: 'সমস্ত বিভাগ',
    ru: 'Все категории',
    ja: 'すべてのカテゴリ',
    id: 'Semua kategori',
  },
  'Metals & Ores': {
    en: 'Metals & Ores',
    cs: 'Kovy a rudy',
    de: 'Metalle & Erze',
    es: 'Metales y minerales',
    fr: 'Métaux et minerais',
    pt: 'Metais e minérios',
    zh: '金属与矿石',
    hi: 'धातु और अयस्क',
    ar: 'المعادن والخامات',
    bn: 'ধাতু এবং আকরিক',
    ru: 'Металлы и руды',
    ja: '金属と鉱石',
    id: 'Logam & Bijih',
  },
  'Monster Drops': {
    en: 'Monster Drops',
    cs: 'Dropy z monster',
    de: 'Monster-Beute',
    es: 'Botín de monstruos',
    fr: 'Butins de monstres',
    pt: 'Espólios de monstros',
    zh: '怪物掉落物',
    hi: 'दानवों से मिलने वाली वस्तुएं',
    ar: 'غنائم الوحوش',
    bn: 'দানবদের ড্রপ',
    ru: 'Добыча с монстров',
    ja: 'モンスターのドロップ',
    id: 'Jatuhan Monster',
  },
  'Trophies': {
    en: 'Trophies',
    cs: 'Trofeje',
    de: 'Trophäen',
    es: 'Trofeos',
    fr: 'Trophées',
    pt: 'Troféus',
    zh: '战利品',
    hi: 'ट्रॉफियां',
    ar: 'الجوائز',
    bn: 'ট্রফি',
    ru: 'Трофеи',
    ja: 'トロフィー',
    id: 'Trofi',
  },
  'Food Ingredients': {
    en: 'Food Ingredients',
    cs: 'Suroviny na jídlo',
    de: 'Nahrungszutaten',
    es: 'Ingredientes de comida',
    fr: 'Ingrédients alimentaires',
    pt: 'Ingredientes de comida',
    zh: '食物配料',
    hi: 'भोजन की सामग्री',
    ar: 'مكونات الطعام',
    bn: 'খাবারের উপকরণ',
    ru: 'Ингредиенты для еды',
    ja: '食材',
    id: 'Bahan Makanan',
  },
  'Building & Crafting': {
    en: 'Building & Crafting',
    cs: 'Stavba a výroba',
    de: 'Bauen & Handwerk',
    es: 'Construcción y artesanía',
    fr: 'Construction et artisanat',
    pt: 'Construção e criação',
    zh: '建造与制造',
    hi: 'निर्माण और क्राफ्टिंग',
    ar: 'البناء والصياغة',
    bn: 'নির্মাণ এবং ক্রাফটিং',
    ru: 'Строительство и крафт',
    ja: '建築とクラフト',
    id: 'Bangunan & Kerajinan',
  },
  'Valuables & Traders': {
    en: 'Valuables & Traders',
    cs: 'Cennosti a obchodníci',
    de: 'Wertsachen & Händler',
    es: 'Objetos de valor y comerciantes',
    fr: 'Objets de valeur et marchands',
    pt: 'Itens valiosos e mercadores',
    zh: '贵重物品与商人',
    hi: 'कीमती वस्तुएं और व्यापारी',
    ar: 'النفائس والتجار',
    bn: 'মূল্যবান জিনিস এবং ব্যবসায়ী',
    ru: 'Ценности и торговцы',
    ja: '貴重品と商人',
    id: 'Barang Berharga & Pedagang',
  },
  'Boss Summoning': {
    en: 'Boss Summoning',
    cs: 'Vyvolání bossů',
    de: 'Boss-Beschwörung',
    es: 'Invocación de jefes',
    fr: 'Invocation de boss',
    pt: 'Invocação de chefes',
    zh: 'Boss 召唤物',
    hi: 'बॉस आह्वान',
    ar: 'استدعاء الزعماء',
    bn: 'বস আহ্বান',
    ru: 'Призыв боссов',
    ja: 'ボスの召喚',
    id: 'Pemanggilan Bos',
  },
  'Biome': {
    en: 'Biome',
    cs: 'Biom',
    de: 'Biom',
    es: 'Bioma',
    fr: 'Biome',
    pt: 'Bioma',
    zh: '生物群系',
    hi: 'बायोम',
    ar: 'المحيط الحيوي',
    bn: 'বায়োম',
    ru: 'Биом',
    ja: 'バイオーム',
    id: 'Bioma',
  },
  'All biomes': {
    en: 'All biomes',
    cs: 'Všechny biomy',
    de: 'Alle Biome',
    es: 'Todos los biomas',
    fr: 'Tous les biomes',
    pt: 'Todos os biomas',
    zh: '所有生物群系',
    hi: 'सभी बायोम',
    ar: 'كل البيئات',
    bn: 'সমস্ত বায়োম',
    ru: 'Все биомы',
    ja: 'すべてのバイオーム',
    id: 'Semua bioma',
  },
  'Comfort': {
    en: 'Comfort',
    cs: 'Komfort',
    de: 'Komfort',
    es: 'Comodidad',
    fr: 'Confort',
    pt: 'Conforto',
    zh: '舒适度',
    hi: 'आराम',
    ar: 'الراحة',
    bn: 'আরাম',
    ru: 'Комфорт',
    ja: '快適さ',
    id: 'Kenyamanan',
  },
  'Dropped by:': {
    en: 'Dropped by:',
    cs: 'Získává se z:',
    de: 'Beute von:',
    es: 'Soltado por:',
    fr: 'Obtenu sur :',
    pt: 'Obtido de:',
    zh: '掉落自：',
    hi: 'प्राप्त होता है:',
    ar: 'يسقط من:',
    bn: 'থেকে পাওয়া যায়:',
    ru: 'Выпадает с:',
    ja: 'ドロップ元：',
    id: 'Dijatuhkan oleh:',
  },
  'Found in:': {
    en: 'Found in:',
    cs: 'Nalézá se v:',
    de: 'Gefunden in:',
    es: 'Encontrado en:',
    fr: 'Trouvé dans :',
    pt: 'Encontrado em:',
    zh: '发现于：',
    hi: 'यहाँ पाया जाता है:',
    ar: 'يوجد في:',
    bn: 'পাওয়া যায়:',
    ru: 'Находится в:',
    ja: '発見場所：',
    id: 'Ditemukan di:',
  },
  'Crafting recipe:': {
    en: 'Crafting recipe:',
    cs: 'Recept na výrobu:',
    de: 'Handwerksrezept:',
    es: 'Receta de fabricación:',
    fr: 'Recette d’artisanat :',
    pt: 'Receita de criação:',
    zh: '制造配方：',
    hi: 'क्राफ्टिंग रेसिपी:',
    ar: 'وصفة الصياغة:',
    bn: 'ক্রাফটিং রেসিপি:',
    ru: 'Рецепт изготовления:',
    ja: 'クラフトレシピ：',
    id: 'Resep pembuatan:',
  },
  'Sold by:': {
    en: 'Sold by:',
    cs: 'Prodává:',
    de: 'Verkauft von:',
    es: 'Vendido por:',
    fr: 'Vendu par :',
    pt: 'Vendido por:',
    zh: '出售者：',
    hi: 'द्वारा बेचा गया:',
    ar: 'يُباع لدى:',
    bn: 'বিক্রেতা:',
    ru: 'Продаётся у:',
    ja: '販売者：',
    id: 'Dijual oleh:',
  },
  'Stations & Upgrades': {
    en: 'Stations & Upgrades',
    cs: 'Stanice a vylepšení',
    de: 'Stationen & Verbesserungen',
    es: 'Estaciones y mejoras',
    fr: 'Stations et améliorations',
    pt: 'Bancadas e melhorias',
    zh: '工作台与升级',
    hi: 'स्टेशन और अपग्रेड',
    ar: 'المحطات والترقيات',
    bn: 'স্টেশন এবং আপগ্রেড',
    ru: 'Станки и улучшения',
    ja: '設備とアップグレード',
    id: 'Stasiun & Peningkatan',
  },
  'No items found matching your filters.': {
    en: 'No items found matching your filters.',
    cs: 'Nebyly nalezeny žádné položky odpovídající vašim filtrům.',
    de: 'Keine Gegenstände gefunden, die Ihren Filtern entsprechen.',
    es: 'No se encontraron objetos que coincidan con tus filtros.',
    fr: 'Aucun objet trouvé correspondant à vos filtres.',
    pt: 'Nenhum item encontrado correspondente aos seus filtros.',
    zh: '未找到符合筛选条件的物品。',
    hi: 'आपके फ़िल्टर से मेल खाने वाली कोई वस्तु नहीं मिली।',
    ar: 'لم يتم العثور على عناصر تطابق معايير التصفية الخاصة بك.',
    bn: 'আপনার ফিল্টারের সাথে মিলে এমন কোনো আইটেম পাওয়া যায়নি।',
    ru: 'По вашим фильтрам ничего не найдено.',
    ja: 'フィルターに一致するアイテムが見つかりませんでした。',
    id: 'Tidak ada item yang cocok dengan filter Anda.',
  },
  'Wiki': {
    en: 'Wiki',
    cs: 'Wiki',
    de: 'Wiki',
    es: 'Wiki',
    fr: 'Wiki',
    pt: 'Wiki',
    zh: '维基',
    hi: 'विकी',
    ar: 'ويكي',
    bn: 'উইকি',
    ru: 'Вики',
    ja: 'ウィキ',
    id: 'Wiki',
  },
  'Weight: {weight}': {
    en: 'Weight: {weight}',
    cs: 'Hmotnost: {weight}',
    de: 'Gewicht: {weight}',
    es: 'Peso: {weight}',
    fr: 'Poids : {weight}',
    pt: 'Peso: {weight}',
    zh: '重量：{weight}',
    hi: 'वजन: {weight}',
    ar: 'الوزن: {weight}',
    bn: 'ওজন: {weight}',
    ru: 'Вес: {weight}',
    ja: '重量：{weight}',
    id: 'Berat: {weight}',
  },
  'Stack: {stack}': {
    en: 'Stack: {stack}',
    cs: 'Stoh: {stack}',
    de: 'Stapel: {stack}',
    es: 'Pila: {stack}',
    fr: 'Pile : {stack}',
    pt: 'Pilha: {stack}',
    zh: '堆叠：{stack}',
    hi: 'ढेर: {stack}',
    ar: 'الحزمة: {stack}',
    bn: 'স্ট্যাক: {stack}',
    ru: 'Стопка: {stack}',
    ja: 'スタック：{stack}',
    id: 'Tumpukan: {stack}',
  },
};

for (const [k, v] of Object.entries(manualTranslations)) {
  messages[k] = v;
}

// Write to apps/items/locales/messages.json
const destDir = path.join(ROOT, 'apps/items/locales');
mkdirSync(destDir, { recursive: true });
writeFileSync(path.join(destDir, 'messages.json'), JSON.stringify(messages, null, 2) + '\n', 'utf8');

console.log(`Generated apps/items/locales/messages.json with ${Object.keys(messages).length} keys.`);
