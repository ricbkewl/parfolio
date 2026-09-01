/* ParFolio branding layer on top of the ATG v148 functional baseline. */
(() => {
  const BRAND = {
    name: 'ParFolio',
    slogan: 'Your Game. Your Score. Your Story.',
    identity: 'PLAY · CONNECT · IMPROVE',
    icon: 'parfolio-app-icon.png'
  };

  const textReplacements = [
    [/Agape Tumoutou Golfers/gi, BRAND.name],
    [/Agape Golf/gi, BRAND.name],
    [/FAITH\s*·\s*FELLOWSHIP\s*·\s*FAIRWAYS/gi, BRAND.identity],
    [/Faith\s*·\s*Fellowship\s*·\s*Fairways/gi, BRAND.identity],
    [/Saved to Serve/gi, BRAND.slogan],
    [/Previous Matches/gi, 'Previous Rounds']
  ];

  function replaceTextNodes(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      let next = node.nodeValue;
      for (const [pattern, replacement] of textReplacements) next = next.replace(pattern, replacement);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function replaceLegacyImages(root = document) {
    root.querySelectorAll('img').forEach(img => {
      const src = (img.getAttribute('src') || '').toLowerCase();
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      if (src.includes('agape-golf-logo') || src.includes('apple-touch-icon') || alt.includes('agape')) {
        img.src = BRAND.icon;
        img.alt = 'ParFolio';
      }
    });
  }

  function removeFaithOnlyContent(root = document) {
    root.querySelectorAll('.scripture').forEach(el => el.remove());
    root.querySelectorAll('blockquote, p, div, small').forEach(el => {
      const t = (el.textContent || '').trim();
      if (/2\s*Timothy\s*1\s*:\s*9/i.test(t) || /2\s*Timoteo\s*1\s*:\s*9/i.test(t)) {
        if (el.children.length === 0 || el.classList.contains('scripture')) el.remove();
      }
    });
  }

  function ensureHomeBrand(root = document) {
    const home = root.querySelector('.home-page');
    if (!home) return;
    const brand = home.querySelector('.home-brand');
    if (brand) brand.textContent = BRAND.identity;
    const logo = home.querySelector('.landing-logo');
    if (logo) {
      logo.src = BRAND.icon;
      logo.alt = 'ParFolio';
    }
    const heading = home.querySelector('h1');
    if (heading && /ParFolio/i.test(heading.textContent || '')) heading.textContent = BRAND.name;
  }

  function applyBranding() {
    document.title = `${BRAND.name} — ${BRAND.slogan}`;
    replaceTextNodes();
    replaceLegacyImages();
    removeFaithOnlyContent();
    ensureHomeBrand();
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyBranding();
    });
  };

  document.addEventListener('DOMContentLoaded', schedule, { once: true });
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
