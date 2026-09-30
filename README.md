# gyn64.fr : 11ᵉ Journée de Sénologie & de Gynécologie du Pays Basque

Site statique d’une page (HTML, CSS, JS sans framework ni étape de build), hébergé sur l’offre gratuite OVH 100 Mo.

```
index.html              page unique (textes, balises SEO, données structurées JSON-LD)
mentions-legales.html   mentions légales
404.html                page d’erreur
css/site.css            styles (variables de couleurs et de typographie en tête)
js/sequence.js          ouverture : séquence d’images au défilement, révélation des titres
seq/desktop/, seq/mobile/   images de la séquence (générées)
video/                  boucles de repli pour les navigateurs sans JavaScript (générées)
fonts/                  Cormorant Garamond et Manrope en woff2 (auto-hébergées)
img/                    logos, QR code, images de partage
favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest
robots.txt, sitemap.xml, .htaccess (+ un .htaccess de cache dans seq/, fonts/, img/, video/)
tools/                  scripts de génération : à ne pas mettre en ligne
```

## Informations à compléter

Tant qu’elles manquent, elles s’affichent sur le site en rose, entre crochets et encadrées de pointillés. Pour les retrouver :

```bash
grep -n "a-completer" index.html mentions-legales.html
```

| Où | Marqueur | À faire |
|---|---|---|
| Infos pratiques | `[À CONFIRMER]` | heure de fin de la journée |
| L’édition 2026 | `[TEXTE À VALIDER]` | relire les deux phrases proposées (uniquement des faits connus), puis supprimer le marqueur |
| Mentions légales | `[ADRESSE DU SIÈGE]`, `[À COMPLÉTER]` (RNA), `[NOM]` | adresse de l’association, numéro RNA, directeur ou directrice de la publication |
| JSON-LD (`index.html`, bloc `application/ld+json`) | `endDate` 16:00 | fin provisoire : la corriger quand elle sera confirmée (`startDate` 08:45 est confirmé) |
| Organisation | bloc `organisation__partenaires` (`hidden`) | ajouter les logos, puis retirer l’attribut `hidden` |

Aucun prix n’est affiché, ni dans la page ni dans les données structurées (`offers` sans `price`). Quand le tarif sera fixé, ajouter dans `offers` : `"price": "…", "priceCurrency": "EUR"`.

## Modifier les textes

Tout est dans `index.html`, section par section (commentaires `<!-- 1. Ouverture -->`, etc.). Chaque créneau du programme est un `<li class="creneau">` (heure, titre, intervenant) ; accueil, pauses et déjeuner portent en plus la classe `creneau--pause`. Après une modification du programme, mettre aussi à jour la liste `performer` du JSON-LD.

Règles typographiques à conserver :

- apostrophe typographique `’`, guillemets `« »` ;
- espace fine insécable avant `; : ! ?` : `&#8239;` ;
- espace insécable entre « Dr » ou « Pr » et le nom, entre le jour et le mois, et dans les heures (`8&nbsp;h&nbsp;45`) : `&nbsp;` ;
- majuscules accentuées (`É`, `À`) ;
- « 11ᵉ » s’écrit `11<sup>e</sup>`.

Si la date, le lieu ou les thèmes changent, les mettre à jour aussi dans : `<title>`, `meta description`, balises `og:` et `twitter:`, bloc JSON-LD, `tools/partage.html` (images de partage).

## Régénérer la séquence d’images

Après un nouvel étalonnage des boucles dans `../Visuels Higgsfield/` (mêmes noms de fichiers) :

```bash
brew install ffmpeg webp        # une seule fois
tools/build-sequence.sh
```

Le script :

1. extrait chaque image des boucles d’origine (desktop : version 16:9, 1600 px ; mobile : version 9:16, 900 px), en appliquant le raccord au bleu nuit ;
2. encode en WebP qualité 70 ;
3. ne garde qu’une image sur deux si un format dépasse 6 Mo (aujourd’hui : desktop 145 images, 5,4 Mo ; mobile 73 images, 3,3 Mo) ;
4. produit les vidéos de repli sans JavaScript ;
5. inscrit dans `index.html` le nombre d’images et une nouvelle version (`?v=…`), pour que les navigateurs ne gardent pas l’ancienne séquence en cache.

Les commandes exactes, pour une image source `SRC` :

```bash
RACCORD="curves=g='0/0 0.18/0.14 0.32/0.32 1/1':b='0/0 0.38/0.24 0.56/0.56 1/1',lutrgb=r='max(val,13)':g='max(val,38)':b='max(val,64)'"

# desktop (mobile : vidéo 9:16 et scale=900)
ffmpeg -i "Seamless-loop-The-glass-and-mother-of-p-2.mp4" \
  -vf "select='not(mod(n\,1))',scale=1600:-2:flags=lanczos,$RACCORD" \
  -fps_mode vfr tmp/%04d.png            # mod(n\,2) pour une image sur deux
for f in tmp/*.png; do cwebp -q 70 -m 6 "$f" -o "seq/desktop/$(basename "${f%.png}").webp"; done
```

Le raccord : le fond des vidéos est plus sombre que le bleu nuit `#0D2640`, avec un halo bleuté. La courbe abaisse ce halo, le plancher `lutrgb` ramène tout le fond exactement à `#0D2640`, et la sculpture n’est pas touchée. Les vidéos d’origine ne sont jamais modifiées.

**Si le cadrage de la sculpture change** (nouvelle génération Higgsfield), mettre à jour sa boîte englobante dans `css/site.css`, `.ouverture__cadre` : `--obj-l`, `--obj-h` (taille relative) et `--obj-x`, `--obj-y` (centre relatif), pour le desktop puis pour le mobile. Le poster et le canvas s’en servent tous les deux.

## Images de partage et favicons

`img/partage-og.jpg` (1200×630, WhatsApp, LinkedIn, iMessage) et `img/partage-1x1.jpg`, `-4x3.jpg`, `-16x9.jpg` (données structurées Google) sont rendues depuis le gabarit `tools/partage.html`, aux polices du site :

```bash
python3 -m http.server 8064 &                       # depuis le dossier Site
npx --yes -p playwright playwright install chromium  # une seule fois
npx --yes -p playwright node tools/build-partage.mjs
```

## Tester en local

```bash
python3 -m http.server 8064
```

puis ouvrir http://localhost:8064. Les `.htaccess` ne sont pas lus en local : redirections, cache et en-têtes ne se vérifient qu’en ligne.

## Aperçu pour les clients (GitHub Pages)

Le dépôt https://github.com/loupeirrot/gyn64-site publie automatiquement un aperçu à l’adresse **https://loupeirrot.github.io/gyn64-site/**, en une à deux minutes après chaque `git push` sur `main`. Tous les chemins du site sont relatifs, ce qui lui permet de fonctionner dans ce sous-dossier comme à la racine de gyn64.fr. Seule la page 404 garde des chemins absolus (pour OVH) : sur l’aperçu, elle s’affiche sans style.

L’aperçu ne lit pas les `.htaccess` (pas de redirections ni d’en-têtes de cache). Sa balise canonical pointe vers https://gyn64.fr/, ce qui évite qu’il fasse concurrence au vrai site dans Google. `PROMPT_CLAUDE_CODE.md` est exclu du dépôt (`.gitignore`).

## Mettre en ligne sur OVH

1. **Identifiants FTP** : espace client OVHcloud, *Web Cloud > Hébergements > gyn64.fr > FTP-SSH* (serveur `ftp.clusterXXX.hosting.ovh.net`, identifiant, mot de passe à définir).
2. **Envoyer les fichiers** dans le dossier `www/`, en excluant `tools/`, `.git/`, `README.md`, `PROMPT_CLAUDE_CODE.md` et `.DS_Store`. Avec FileZilla, glisser le contenu du dossier `Site` sans ces éléments, en affichant les fichiers cachés pour transférer les `.htaccess`. Ou en ligne de commande :

   ```bash
   brew install lftp
   lftp -u IDENTIFIANT ftp.clusterXXX.hosting.ovh.net -e "mirror -R --delete --verbose \
     --exclude-glob tools/ --exclude-glob .git/ --exclude-glob .DS_Store \
     --exclude README.md --exclude PROMPT_CLAUDE_CODE.md \
     ./ www/; quit"
   ```

   Poids total envoyé : environ 11 Mo, bien sous les 100 Mo.
3. **HTTPS** : *Hébergements > gyn64.fr > Informations générales > Certificat SSL* : commander le certificat Let’s Encrypt gratuit. Dans *Multisite*, vérifier que `gyn64.fr` **et** `www.gyn64.fr` pointent vers `www/`, avec SSL activé sur les deux.
4. **Vérifier** : `http://gyn64.fr`, `http://www.gyn64.fr` et `https://www.gyn64.fr` doivent tous rediriger (301) vers `https://gyn64.fr/`. Une adresse inconnue doit afficher la page 404.
5. **HSTS** : une fois le HTTPS confirmé, décommenter la ligne `Strict-Transport-Security` dans `.htaccess` et renvoyer ce fichier.

Mises à jour ultérieures : renvoyer seulement les fichiers modifiés. HTML, CSS et JS sont revalidés à chaque visite. Les fichiers de `seq/`, `fonts/`, `img/` et `video/` sont mis en cache un an : si l’un d’eux change, changer son nom ou son `?v=` dans le HTML (le script de séquence le fait tout seul).

## Après la mise en ligne

- [ ] Déclarer `gyn64.fr` dans **Google Search Console** et **Bing Webmaster Tools** (vérification par enregistrement DNS TXT, dans *Web Cloud > Noms de domaine > gyn64.fr > Zone DNS* chez OVH), puis soumettre `https://gyn64.fr/sitemap.xml`.
- [ ] Tester les données structurées : https://search.google.com/test/rich-results?url=https://gyn64.fr/
- [ ] Mettre le lien gyn64.fr sur la page HelloAsso, le LinkedIn et les profils des organisateurs (liens entrants).
- [ ] Tester le partage du lien sur WhatsApp, LinkedIn (https://www.linkedin.com/post-inspector/) et iMessage.
- [ ] Vérifier que le QR code de la section Inscription ouvre bien la page HelloAsso.

## Statistiques (plus tard)

Aucune mesure d’audience ni aucun cookie aujourd’hui, donc pas de bannière. Si des statistiques sont demandées, Plausible (sans cookie) se branche à l’emplacement commenté dans le `<head>` d’`index.html`. Il faut alors ajouter `https://plausible.io` à `script-src` et `connect-src` dans la ligne `Content-Security-Policy` du `.htaccess`, et mettre à jour les mentions légales.

## Édition suivante : archiver 2026 sous /2026/

L’accueil présente toujours l’édition en cours. Au lancement de l’édition 2027 :

1. Créer `2026/` et y copier `index.html`, `css/`, `js/`, `seq/`, `video/`, `img/` (les polices restent partagées : dans la copie, remplacer `../fonts/` par `../../fonts/` dans `2026/css/site.css`).
2. Dans `2026/index.html` :
   - canonical et `og:url` → `https://gyn64.fr/2026/` ;
   - remplacer les boutons HelloAsso par la mention « Inscriptions closes » ;
   - dans le JSON-LD, retirer `offers` (l’événement reste daté et décrit) ;
   - ajouter un lien « Édition en cours » vers `/`.
3. Ajouter `https://gyn64.fr/2026/` au `sitemap.xml`.
4. Mettre à jour l’accueil pour 2027 (textes, dates, JSON-LD, images de partage, séquence si nouveau visuel), et ajouter dans le pied de page un lien « Édition 2026 » vers `/2026/`.
5. Surveiller le quota : chaque édition archivée pèse environ 10 Mo. Au besoin, supprimer `video/` et la séquence mobile des archives et garder le poster.
