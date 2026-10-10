// Shared, versioned progress state for classic browser scripts.
(function () {
  'use strict';
  const KEY = 'vc.progress';
  const OPEN_KEY = 'vc.openBiomes';
  const listeners = new Set();
  const empty = () => ({ version: 1, defeated: {}, visited: [], milestones: {} });
  const validId = id => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 100 && !['constructor', 'prototype'].includes(id);
  function flags(value) {
    const result = {};
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [id, done] of Object.entries(value)) {
        if (validId(id) && done === true) result[id] = true;
      }
    }
    return result;
  }
  function sanitize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || (value.version !== undefined && value.version !== 1)) return empty();
    return { version: 1, defeated: flags(value.defeated),
      visited: Array.isArray(value.visited) ? [...new Set(value.visited.filter(validId))] : [],
      milestones: flags(value.milestones) };
  }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  let state = sanitize(read(KEY, null));
  let open = read(OPEN_KEY, []);
  const get = () => JSON.parse(JSON.stringify(state));
  function notify() {
    for (const cb of listeners) {
      try { cb(get()); } catch (error) { console.error('Progress listener failed:', error); }
    }
  }
  function save(value) {
    state = sanitize(value);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Keep the in-memory state. */ }
    notify();
    return get();
  }
  function set(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return get();
    return save({ ...state, ...patch, version: 1 });
  }
  function toggle(field, id, done) {
    if (!validId(id)) return get();
    const values = { ...state[field] };
    if (done === true) values[id] = true;
    else delete values[id];
    return set({ [field]: values });
  }
  function visit(id, done) {
    if (!validId(id)) return get();
    return set({ visited: done === true ? [...state.visited, id] : state.visited.filter(value => value !== id) });
  }
  function openBiome(id) {
    if (!validId(id)) return get();
    open = read(OPEN_KEY, []);
    const list = Array.isArray(open) ? open.filter(validId) : [];
    if (!list.includes(id)) list.push(id);
    open = list;
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(open)); } catch { /* Keep the in-memory state. */ }
    notify();
    return get();
  }
  function bossIds(biome) {
    return (biome.creatures?.boss ?? biome.bosses ?? []).map(boss => typeof boss === 'string' ? boss : boss.id);
  }
  function orderedBiomes(biomes) {
    return [...(biomes ?? globalThis.VP_DATA?.biomes ?? [])].sort((a, b) => a.order - b.order);
  }
  function minReach(biomes) {
    const ordered = orderedBiomes(biomes);
    let last = -1;
    ordered.forEach((biome, index) => { if (bossIds(biome).some(id => state.defeated[id])) last = index; });
    if (last < 0) return 1;
    while (last + 1 < ordered.length) {
      last++;
      if (bossIds(ordered[last]).length) break;
    }
    return Math.min(9, Math.max(1, ordered[last].order));
  }
  function reach(biomes) {
    return Math.min(9, Math.max(minReach(biomes), ...orderedBiomes(biomes)
      .filter(biome => state.visited.includes(biome.id)).map(biome => biome.order)));
  }
  function setReach(n, biomes) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return get();
    const end = Math.min(9, Math.max(minReach(biomes), Math.floor(n)));
    return set({ visited: orderedBiomes(biomes).filter(biome => biome.order <= end).map(biome => biome.id) });
  }
  function revealedBiomes(biomes) {
    const ordered = [...(biomes ?? globalThis.VP_DATA?.biomes ?? [])].sort((a, b) => a.order - b.order);
    // Read legacy reveals on each call so same-tab tools can still open biomes.
    open = read(OPEN_KEY, []);
    const revealed = new Set([...state.visited, ...(Array.isArray(open) ? open.filter(validId) : [])]);
    if (ordered.length) revealed.add(ordered[0].id);
    let last = -1;
    ordered.forEach((biome, index) => { if (bossIds(biome).some(id => state.defeated[id])) last = index; });
    if (last >= 0) {
      let end = last;
      while (end + 1 < ordered.length) {
        end++;
        if (bossIds(ordered[end]).length) break;
      }
      for (let index = 0; index <= end; index++) revealed.add(ordered[index].id);
    }
    return ordered.filter(biome => revealed.has(biome.id)).map(biome => biome.id);
  }
  function exportToUrl() {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    const encoded = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    return (globalThis.location?.href?.split('#')[0] ?? '') + '#p=' + encoded;
  }
  function importFromUrl(hash) {
    try {
      const value = String(hash).split('#').pop();
      const encoded = new URLSearchParams(value).get('p');
      if (!encoded || encoded.length > 100000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return false;
      const raw = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
      const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, char => char.charCodeAt(0))));
      if (!parsed || parsed.version !== 1 || typeof parsed.defeated !== 'object' || !Array.isArray(parsed.visited) || typeof parsed.milestones !== 'object') return false;
      save(parsed);
      return true;
    } catch { return false; }
  }
  function reset() {
    open = [];
    try { localStorage.removeItem(OPEN_KEY); } catch { /* Storage may be disabled. */ }
    return save(empty());
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) state = sanitize(read(KEY, null));
    if (event.key === OPEN_KEY || event.key === null) open = read(OPEN_KEY, []);
    if ([KEY, OPEN_KEY, null].includes(event.key)) notify();
  });
  globalThis.VCProgress = { get, set, defeat: (id, done) => toggle('defeated', id, done), visit, openBiome,
    milestone: (id, done) => toggle('milestones', id, done), revealedBiomes, reach, minReach, setReach,
    onChange(cb) { if (typeof cb !== 'function') return () => {}; listeners.add(cb); return () => listeners.delete(cb); },
    exportToUrl, importFromUrl, reset };
})();
