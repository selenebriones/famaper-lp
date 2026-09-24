#!/usr/bin/env bash
# Compila la landing y la copia al repo Famaper, que es lo que Plesk sincroniza
# como docroot de fmpracks.com. Después hay que commitear y hacer push ahí.
set -euo pipefail

DESTINO="${1:-../Famaper/racks-industriales}"

npm run build

mkdir -p "$DESTINO"
rsync -a --delete dist/ "$DESTINO/"

echo
echo "Landing copiada a $DESTINO"
echo "Falta: cd $DESTINO/.. && git add racks-industriales && git commit && git push"
