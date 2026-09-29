/* Ouverture : la sculpture s’enroule au défilement, les titres se révèlent par étapes.
   Séquence d’images dessinée sur <canvas> ; le poster <img> reste en place tant
   que le canvas n’a rien dessiné. Sans JavaScript : vidéo en boucle (noscript). */

(() => {
  const section = document.querySelector('.ouverture');
  if (!section) return;

  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  apparitionTitres(reduit);
  if (reduit) return;

  const cadre = section.querySelector('.ouverture__cadre');
  const portrait = matchMedia('(max-width: 899px) and (orientation: portrait)');
  const version = section.dataset.seqVersion;

  const SEUILS_ETAPES = [0.1, 0.34];  // progression à laquelle paraissent les étapes 2 et 3
  const DELAI_TITRE = 300;            // le titre (étape 2) paraît de lui-même : c’est l’élément LCP
  const DELAI_REVELATION = 4000;      // sans défilement, l’étape 3 paraît après ce délai (ms)
  const LISSAGE = 0.12;               // constante de temps du rattrapage (s), proche d’un scrub 0.5
  const LOT = 6;                      // images chargées en parallèle

  const jeux = {
    desktop: creerJeu('desktop', +section.dataset.seqDesktop),
    mobile: creerJeu('mobile', +section.dataset.seqMobile),
  };
  let jeu = jeux[portrait.matches ? 'mobile' : 'desktop'];

  const canvas = document.createElement('canvas');
  canvas.className = 'ouverture__canvas';
  cadre.append(canvas);
  const ctx = canvas.getContext('2d');

  let geo = null;
  let cible = 0;
  let actuel = 0;
  let dessinee = -1;
  let rafId = 0;
  let precedent = 0;
  let etapeMin = 1;

  section.dataset.etape = '1';

  function creerJeu(nom, n) {
    const images = new Array(n);
    return { nom, n, images, url: i => `seq/${nom}/${String(i + 1).padStart(4, '0')}.webp?v=${version}`, lance: false };
  }

  /* Chargement : d’abord une image sur huit (le défilement a vite une couverture
     grossière), puis on comble. Le défilement reste libre pendant ce temps. */
  function charger(j) {
    if (j.lance) return;
    j.lance = true;
    const ordre = [];
    for (let pas = 8; pas >= 1; pas /= 2) {
      for (let i = 0; i < j.n; i += pas) if (!ordre.includes(i)) ordre.push(i);
    }
    let prochain = 0;
    const suivant = () => {
      if (prochain >= ordre.length) return;
      const i = ordre[prochain++];
      const img = new Image();
      img.decoding = 'async';
      img.src = j.url(i);
      img.decode().then(() => {
        j.images[i] = img;
        if (j === jeu) demander(true);
      }, () => {}).finally(suivant);
    };
    for (let k = 0; k < LOT; k++) suivant();
  }

  function imageProche(i) {
    const { images, n } = jeu;
    for (let d = 0; d < n; d++) {
      if (images[i - d]) return images[i - d];
      if (images[i + d]) return images[i + d];
    }
    return null;
  }

  /* Même géométrie que le poster en CSS (variables de .ouverture__cadre) :
     la sculpture occupe --remplissage de la zone, centrée. */
  function mesurer() {
    const s = getComputedStyle(cadre);
    const v = nom => parseFloat(s.getPropertyValue(nom));
    const r = cadre.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ratio = v('--ratio');
    const w = Math.min(r.width * v('--remplissage') / v('--obj-l'),
                       r.height * v('--remplissage') / v('--obj-h') * ratio);
    const h = w / ratio;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    geo = {
      x: (r.width / 2 - v('--obj-x') * w) * dpr,
      y: (r.height / 2 - v('--obj-y') * h) * dpr,
      w: w * dpr,
      h: h * dpr,
    };
    dessinee = -1;
  }

  function progression() {
    const r = section.getBoundingClientRect();
    const course = section.offsetHeight - window.innerHeight;
    return course > 0 ? Math.min(Math.max(-r.top / course, 0), 1) : 0;
  }

  function majEtape(p) {
    const etape = Math.max(etapeMin, p >= SEUILS_ETAPES[1] ? 3 : p >= SEUILS_ETAPES[0] ? 2 : 1);
    if (section.dataset.etape !== String(etape)) section.dataset.etape = etape;
  }

  function dessiner(forcer) {
    const i = Math.round(actuel * (jeu.n - 1));
    const img = imageProche(i);
    if (!img || !geo) return;
    const cle = jeu.images[i] ? i : -2 - i;   // redessiner quand l’image exacte arrive
    if (cle === dessinee && !forcer) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, geo.x, geo.y, geo.w, geo.h);
    dessinee = cle;
    cadre.classList.add('ouverture__cadre--canvas');
  }

  function boucle(t) {
    const dt = precedent ? Math.min((t - precedent) / 1000, 0.1) : 1 / 60;
    precedent = t;
    actuel += (cible - actuel) * (1 - Math.exp(-dt / LISSAGE));
    if (Math.abs(cible - actuel) < 0.0005) actuel = cible;
    dessiner(false);
    if (actuel !== cible) {
      rafId = requestAnimationFrame(boucle);
    } else {
      rafId = 0;
      precedent = 0;
    }
  }

  function demander(forcer) {
    if (forcer) dessinee = -1;
    if (!rafId) rafId = requestAnimationFrame(boucle);
  }

  function auDefilement() {
    cible = progression();
    majEtape(cible);
    demander(false);
  }

  function auRedimensionnement() {
    const voulu = jeux[portrait.matches ? 'mobile' : 'desktop'];
    if (voulu !== jeu) {
      jeu = voulu;
      cadre.classList.remove('ouverture__cadre--canvas');
      charger(jeu);
    }
    mesurer();
    auDefilement();
    demander(true);
  }

  mesurer();
  cible = actuel = progression();
  majEtape(cible);

  // L’image 1 est le poster déjà chargé : on la reprend tout de suite.
  const poster = cadre.querySelector('img');
  const depart = () => {
    const img = new Image();
    img.src = jeu.url(0);
    img.decode().then(() => { jeu.images[0] = img; demander(true); }, () => {});
    charger(jeu);
  };
  if (document.readyState === 'complete') depart();
  else window.addEventListener('load', depart, { once: true });
  if (poster && !poster.complete) poster.addEventListener('load', () => demander(true), { once: true });

  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auRedimensionnement, { passive: true });

  setTimeout(() => { etapeMin = Math.max(etapeMin, 2); majEtape(cible); }, DELAI_TITRE);
  const minuterie = setTimeout(() => { etapeMin = 3; majEtape(cible); }, DELAI_REVELATION);
  window.addEventListener('scroll', () => clearTimeout(minuterie), { once: true, passive: true });
})();

/* Après l’ouverture, seule animation : l’apparition discrète des titres de section. */
function apparitionTitres(reduit) {
  if (reduit || !('IntersectionObserver' in window)) return;
  const titres = document.querySelectorAll('main > section:not(.ouverture) h2');
  const obs = new IntersectionObserver(entrees => {
    for (const e of entrees) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('est-visible');
      obs.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  for (const t of titres) {
    t.classList.add('apparition');
    obs.observe(t);
  }
}
