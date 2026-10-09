// Usage: npm run preview -- 8090, then node scripts/check-mobile.mjs 8090
// Tests the assembled site in a clean headless Chrome at a 360 px viewport.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchClean, attachPage, enable, collectErrors, goto, evaluate } from './lib/cdp.mjs';

const port = Number(process.argv[2] ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Expected a preview server port between 1 and 65535');
}
const origin = `http://localhost:${port}`;
const pages = ['/', '/bestiary/', '/smithy/', '/signs/', '/damage-calculator/', '/privacy/', '/progress/', '/provisions/', '/comfort/', '/expedition/', '/items/'];
const languages = JSON.parse(readFileSync(new URL('../shared/i18n/languages.json', import.meta.url), 'utf8'));
const biomes = ['meadows', 'black-forest', 'ocean', 'swamp'];
const progressBiomes = JSON.parse(readFileSync(new URL('../data/biomes.json', import.meta.url), 'utf8')).map(biome => biome.id);
const browser = await launchClean({ headless: true, profileRoot: fileURLToPath(new URL('../', import.meta.url)) });
let cdp;
let failures = 0;
let checked = 0;
try {
  cdp = await attachPage(browser.port);
  await enable(cdp);
  const errors = collectErrors(cdp);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 360, height: 800, deviceScaleFactor: 1, mobile: true,
  });
  // Set storage before each app initializes, including React and the consent banner.
  for (const { code } of languages) {
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `if (location.origin === ${JSON.stringify(origin)}) {
        localStorage.clear();
        localStorage.setItem('vc.language', ${JSON.stringify(code)});
        localStorage.setItem('vc.openBiomes', location.pathname === '/progress/'
          ? ${JSON.stringify(JSON.stringify(progressBiomes))}
          : ${JSON.stringify(JSON.stringify(biomes))});
      }`,
    });
    try {
      for (const page of pages) {
        await goto(cdp, origin + page, { waitMs: 100 });
        await evaluate(cdp, `return (async () => {
          for (let attempt = 0; attempt < 100; attempt++) {
            const root = document.querySelector('#root');
            if (document.documentElement.lang === ${JSON.stringify(code)} && (!root || root.children.length)) break;
            if (attempt === 99) throw new Error('Page or language did not initialize');
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          await document.fonts.ready;
          // Wait for accordion transitions, late layout effects and the consent banner.
          await new Promise(resolve => setTimeout(resolve, 350));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        })();`);
        const states = page === '/progress/' ? ['page'] : page === '/expedition/' ? ['page', 'raids', 'drawer'] : page === '/comfort/' ? ['page', 'drawer', 'shopping'] : ['page', 'drawer'];
        for (const state of states) {
          const drawerOpen = state === 'drawer';
          if (state === 'raids') await evaluate(cdp, `document.getElementById('tab-raids').click();`);
          if (page === '/expedition/' && state === 'drawer') await evaluate(cdp, `document.getElementById('tab-boss').click();`);
          if (state === 'shopping') {
            await evaluate(cdp, `VCProgressDrawer.close();
              document.getElementById('seasonal').click();
              document.getElementById('best-build').click();
              document.getElementById('open-shopping').click();
              if (document.getElementById('shopping-panel').getAttribute('aria-modal') !== 'true') throw new Error('Shopping drawer did not open');`);
          }
          if (drawerOpen) {
            await evaluate(cdp, `return (async () => {
              const trigger = document.querySelector('.vc-progress-trigger');
              if (!trigger) throw new Error('Progress trigger is missing');
              const banner = document.querySelector('.vc-consent-banner');
              if (banner && !banner.hidden && trigger.getBoundingClientRect().bottom > banner.getBoundingClientRect().top) {
                throw new Error('Progress trigger overlaps the consent banner');
              }
              trigger.click();
              for (let attempt = 0; !document.querySelector('.vc-progress-panel .saga-row'); attempt++) {
                if (attempt === 100) throw new Error('Progress drawer did not load');
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              VCProgress.set({ visited: ${JSON.stringify(progressBiomes)} });
              await new Promise(resolve => setTimeout(resolve, 350));
              await document.fonts.ready;
            })();`);
          } else if (page === '/progress/') {
            await evaluate(cdp, `VCProgress.setReach(9, VP_DATA.biomes);`);
          }
          if (page === '/progress/' && await evaluate(cdp, `return !!document.querySelector('.vc-progress-trigger');`)) {
            throw new Error('Full Progress page must not show a drawer trigger');
          }
          const result = await evaluate(cdp, `
          const width = document.documentElement.clientWidth;
          const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          const isScrollableTableContent = element => {
            const table = element.closest('table');
            if (!table) return false;
            for (let wrapper = table.parentElement; wrapper && wrapper !== document.body; wrapper = wrapper.parentElement) {
              if (['auto', 'scroll'].includes(getComputedStyle(wrapper).overflowX)) return true;
            }
            return false;
          };
          const overflowing = [...document.body.querySelectorAll('*')].find(element => {
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height || isScrollableTableContent(element)) return false;
            return rect.right > width + 0.5 || rect.left < -0.5;
          });
          const first = scrollWidth > width && overflowing ? overflowing.tagName.toLowerCase() +
            (overflowing.id ? '#' + overflowing.id : '') +
            [...overflowing.classList].slice(0, 3).map(name => '.' + name).join('') : null;
          const panel = document.querySelector(${JSON.stringify(state === 'shopping' ? '#shopping-panel' : '.vc-progress-panel')});
          const panelOverflow = panel && !panel.closest('[hidden]') ? panel.scrollWidth > panel.clientWidth : false;
          return { width, scrollWidth, first, panelOverflow };
        `);
          if (result.width !== 360) throw new Error(`Unexpected viewport width: ${result.width}`);
          checked++;
          const failed = result.scrollWidth > 360 || result.panelOverflow;
          if (failed) failures++;
          console.log(`${failed ? 'FAIL' : 'OK  '} ${code.padEnd(2)} ${(page + (state === 'page' ? '' : ' [' + state + ']')).padEnd(29)} scrollWidth=${result.scrollWidth} first=${result.first ?? 'none'}`);
        }
      }
    } finally {
      await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
  }
  console.log(`\n${checked} page states checked (${pages.length} routes × ${languages.length} languages, including open drawers), ${failures} pages with scrollWidth > 360.`);
  const errorCount = errors.consoleErrors.length + errors.exceptions.length + errors.failedRequests.length;
  console.log(`Browser errors: ${errorCount}`);
  if (errorCount) console.error(JSON.stringify(errors, null, 2));
  process.exitCode = failures || errorCount ? 1 : 0;
} finally {
  cdp?.close();
  await browser.kill();
}
