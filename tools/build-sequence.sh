#!/usr/bin/env bash
# Régénère la séquence d'images de l'ouverture à partir des boucles d'origine.
#
#   tools/build-sequence.sh
#
# Produit :
#   seq/desktop/0001.webp…  (boucle 16:9, 1600 px de large)
#   seq/mobile/0001.webp…   (boucle 9:16, 900 px de large)
#   video/desktop.mp4, video/mobile.mp4  (repli sans JavaScript)
# puis met à jour dans index.html le nombre d'images et la version (cache).
#
# Dépendances : ffmpeg, cwebp (brew install ffmpeg webp).
# Les vidéos d'origine ne sont jamais modifiées.

set -euo pipefail

SITE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCES="${SOURCES:-$SITE/../Visuels Higgsfield}"
SRC_DESKTOP="$SOURCES/Seamless-loop-The-glass-and-mother-of-p-2.mp4"
SRC_MOBILE="$SOURCES/Seamless-loop-The-glass-and-mother-of-p.mp4"

QUALITE=70
PLAFOND=$((6 * 1024 * 1024))   # au-delà de 6 Mo par format, on garde une image sur deux

# Raccord au bleu nuit #0D2640 : la courbe abaisse le halo bleuté du fond,
# le plancher (lutrgb) remonte le reste exactement au bleu nuit.
# La sculpture, bien plus claire, n'est pas touchée.
RACCORD="curves=g='0/0 0.18/0.14 0.32/0.32 1/1':b='0/0 0.38/0.24 0.56/0.56 1/1',lutrgb=r='max(val,13)':g='max(val,38)':b='max(val,64)'"
# Pour la vidéo, le H.264 éclaircit un peu les aplats : on vise juste sous le bleu nuit,
# le calque « lighten » de la page ramène ensuite le fond exactement à #0D2640.
RACCORD_VIDEO="curves=g='0/0 0.18/0.12 0.32/0.32 1/1':b='0/0 0.38/0.21 0.56/0.56 1/1',lutrgb=r='max(val,9)':g='max(val,32)':b='max(val,56)'"

for outil in ffmpeg cwebp; do
  command -v "$outil" >/dev/null || { echo "Outil manquant : $outil (brew install ffmpeg webp)" >&2; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

taille_dossier() { find "$1" -type f -name '*.webp' -exec stat -f %z {} + | awk '{s+=$1} END {print s+0}'; }

# $1 = nom (desktop|mobile), $2 = vidéo source, $3 = largeur
construire() {
  local nom="$1" src="$2" largeur="$3" pas=1
  local dest="$SITE/seq/$nom"

  while :; do
    rm -rf "$TMP/$nom" "$dest"
    mkdir -p "$TMP/$nom" "$dest"

    ffmpeg -v error -i "$src" \
      -vf "select='not(mod(n\\,$pas))',scale=$largeur:-2:flags=lanczos,$RACCORD" \
      -fps_mode vfr "$TMP/$nom/%04d.png"

    for png in "$TMP/$nom"/*.png; do
      cwebp -quiet -q "$QUALITE" -m 6 "$png" -o "$dest/$(basename "${png%.png}").webp"
    done

    local total; total=$(taille_dossier "$dest")
    if [ "$total" -le "$PLAFOND" ] || [ "$pas" -ge 2 ]; then break; fi
    echo "  $nom : $((total / 1024)) Ko > 6 Mo, on garde une image sur deux"
    pas=2
  done

  local n; n=$(find "$dest" -name '*.webp' | wc -l | tr -d ' ')
  echo "  $nom : $n images, $(( $(taille_dossier "$dest") / 1024 )) Ko"
  eval "NB_${nom}=$n"
}

# Repli sans JavaScript : la même boucle, étalonnée, en H.264 léger
video() {
  local nom="$1" src="$2" largeur="$3"
  mkdir -p "$SITE/video"
  ffmpeg -v error -y -i "$src" -vf "scale=$largeur:-2:flags=lanczos,$RACCORD_VIDEO,format=yuv420p" \
    -c:v libx264 -preset slow -crf 27 -movflags +faststart -an "$SITE/video/$nom.mp4"
}

echo "Séquence desktop…"
construire desktop "$SRC_DESKTOP" 1600
echo "Séquence mobile…"
construire mobile "$SRC_MOBILE" 900
echo "Vidéos de repli…"
video desktop "$SRC_DESKTOP" 1280
video mobile "$SRC_MOBILE" 720

# Version : empreinte des images et vidéos, pour invalider le cache long du navigateur
VERSION=$(cat "$SITE"/seq/*/*.webp "$SITE"/video/*.mp4 | shasum | cut -c1-8)

perl -pi -e "
  s/data-seq-desktop=\"\\d+\"/data-seq-desktop=\"$NB_desktop\"/;
  s/data-seq-mobile=\"\\d+\"/data-seq-mobile=\"$NB_mobile\"/;
  s/data-seq-version=\"\\w+\"/data-seq-version=\"$VERSION\"/;
  s/(seq\\/(?:desktop|mobile)\\/0001\\.webp\\?v=)\\w+/\${1}$VERSION/g;
  s/(video\\/(?:desktop|mobile)\\.mp4\\?v=)\\w+/\${1}$VERSION/g;
" "$SITE/index.html"

echo "Terminé. Version $VERSION inscrite dans index.html."
