// Pure shopping-list calculations shared by Smithy and Provisions.
(function (root) {
  'use strict';
  const lookup = (items, id) => Array.isArray(items) ? items.find(item => item.id === id) : items?.[id];
  const positive = (value, fallback = 1) => Number.isFinite(value) && value > 0 ? value : fallback;
  function add(map, item, amount, fuel) {
    if (!item || !Number.isFinite(amount) || amount <= 0) return;
    const current = map.get(item) || { item, amount: 0, fuel: false };
    current.amount += amount;
    current.fuel ||= !!fuel;
    map.set(item, current);
  }
  /**
   * Lines: {item, quantity} for products, {pieceId, have, want} for quality upgrades,
   * or {materials, quantity} for an explicit recipe. Item definitions can carry
   * levels, recipe, materials/yields, or a mead base. Results preserve recipe order.
   * Batch costs are proportional, matching Smithy's existing recipe breakdown.
   */
  function sumMaterials(lines, items) {
    const result = new Map();
    for (const line of lines || []) {
      if (line && line.materialId) {
        add(result, line.materialId, positive(line.amount ?? line.quantity, 1), line.fuel);
        continue;
      }
      const id = line.pieceId || line.item || line.id;
      const definition = lookup(items, id);
      const quantity = positive(line.quantity ?? line.amount, 1);
      if (definition?.levels) {
        const have = Number.isFinite(line.have) ? line.have : 0;
        const want = Number.isFinite(line.want) ? line.want : 1;
        for (const level of definition.levels) {
          if (level.quality > have && level.quality <= want) {
            for (const material of level.materials || []) add(result, material.item, material.amount * quantity, material.fuel);
          }
        }
      } else {
        const recipe = line.materials ? line : definition?.recipe || definition?.base || definition;
        if (recipe?.materials?.length) {
          const batches = quantity / positive(definition?.yields ?? recipe.yields);
          for (const material of recipe.materials) add(result, material.item, material.amount * batches, material.fuel);
        } else if (!line.pieceId) add(result, id, quantity, line.fuel);
      }
    }
    return [...result.values()];
  }
  function actionFor(station) {
    const value = (station || '').toLowerCase();
    if (value.includes('smelt') || value.includes('blast furnace')) return 'Smelt';
    if (value.includes('spin')) return 'Spin';
    if (value.includes('refin')) return 'Refine';
    return 'Craft';
  }
  /** Expand recipes up to depth edges. Cycles and empty recipes remain base materials. */
  function breakdown(materials, items, depth = 3) {
    const result = new Map();
    const steps = new Map();
    const limit = Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 3;
    function expand(id, amount, fuel, level, visited) {
      const item = lookup(items, id);
      const recipe = item?.recipe;
      if (level >= limit || visited.has(id) || !recipe?.materials?.length) {
        add(result, id, amount, fuel);
        return;
      }
      const station = recipe.station || 'Station';
      const key = station + '|' + id;
      const step = steps.get(key) || { station, product: id, productName: item.name || id, amount: 0, action: actionFor(station) };
      step.amount += amount;
      steps.set(key, step);
      const path = new Set(visited);
      path.add(id);
      // Recipes are crafted in whole batches: 15 Iron Nails (10 per craft) need 2 Iron, not 1.5.
      const batches = Math.ceil(amount / positive(recipe.yields) - 1e-9);
      for (const material of recipe.materials) expand(material.item, material.amount * batches, material.fuel, level + 1, path);
    }
    for (const material of materials || []) {
      if (Number.isFinite(material.amount) && material.amount > 0) expand(material.item, material.amount, material.fuel, 0, new Set());
    }
    return {
      materials: [...result.values()],
      steps: [...steps.values()].map(step => ({ ...step, text: `${step.action} ${step.amount}× ${step.productName} at ${step.station}` })),
    };
  }
  /** Format an already resolved list in its supplied order; game names stay English. */
  function formatList(lines, locale = 'en') {
    let numbers;
    try { numbers = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 10 }); }
    catch { numbers = new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: 10 }); }
    return (lines || []).map(line => `${numbers.format(line.amount)}× ${line.name || line.item || line.id}`).join('\n');
  }
  /** Shared cart (localStorage 'va.cart'): raw materials and goods added from Items/Traders. */
  const CART_KEY = 'va.cart';
  const cart = Object.freeze({
    read() {
      try {
        const parsed = JSON.parse(root.localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    },
    write(lines) {
      try { root.localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(lines) ? lines : [])); return true; }
      catch { return false; }
    },
    addMaterial(id, amount = 1, name) {
      const count = Number.isFinite(amount) && amount > 0 ? amount : 1;
      const lines = cart.read();
      const existing = lines.find(line => line && line.materialId === id);
      if (existing) {
        existing.amount = positive(existing.amount, 0) + count;
        if (name && !existing.name) existing.name = name;
      } else {
        const line = { id: 'mat_' + id + '_' + Math.random().toString(36).slice(2, 7), materialId: id, amount: count, setId: null, pieceId: null };
        if (name) line.name = String(name);
        lines.push(line);
      }
      return cart.write(lines);
    },
    hasMaterial(id) { return cart.read().some(line => line && line.materialId === id); },
  });
  root.VCShopping = Object.freeze({ sumMaterials, breakdown, formatList, cart });
})(globalThis);
