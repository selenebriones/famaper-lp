#!/usr/bin/env bash
# Compila la landing y la copia al repo Famaper, que es lo que Plesk sincroniza
# como docroot de fmpracks.com. Después hay que commitear y hacer push allá.
#
# El build se versiona dentro de Famaper a propósito: Plesk solo sincroniza ese
# repo. Por eso este script deja un sello con el commit de origen — sin él nadie
# podría saber después qué código está publicado.
set -euo pipefail

DESTINO="${1:-../Famaper/racks-industriales}"

cd "$(dirname "$0")"

# --- Candado 1: el árbol tiene que estar limpio -----------------------------
# Publicar desde cambios sin commitear deja en producción código que no existe
# en ningún lado más. En equipo eso es imposible de rastrear después.
if [ -n "$(git status --porcelain)" ]; then
	echo "ABORTADO: hay cambios sin commitear en famaper-lp."
	echo
	git status --short
	echo
	echo "Commitea primero. Lo que se publica tiene que corresponder a un commit."
	exit 1
fi

COMMIT="$(git rev-parse --short HEAD)"
RAMA="$(git rev-parse --abbrev-ref HEAD)"
FECHA="$(date '+%Y-%m-%d %H:%M')"

# --- Candado 2: ese commit debería estar en GitHub --------------------------
# No aborta: a veces se publica algo urgente antes de subirlo. Pero avisa, que
# es justo así como se pierde el fuente de lo que está en línea.
if ! git branch -r --contains HEAD 2>/dev/null | grep -q 'origin/'; then
	echo "AVISO: el commit $COMMIT no está en GitHub todavía."
	echo "       Si no lo subes, nadie más podrá reproducir lo que quedó publicado."
	echo
fi

npm run build

# Sello de versión. Queda servido en /racks-industriales/version.json, así que
# se puede comprobar qué hay publicado sin entrar al servidor:
#   curl -s https://fmpracks.com/racks-industriales/version.json
cat > dist/version.json <<JSON
{
  "commit": "$COMMIT",
  "rama": "$RAMA",
  "compilado": "$FECHA",
  "repo": "famaper-lp"
}
JSON

mkdir -p "$DESTINO"
rsync -a --delete dist/ "$DESTINO/"

# Se escribe después del rsync --delete, que si no lo borraría en cada corrida.
cat > "$DESTINO/LEEME.md" <<'MARKDOWN'
# No edites nada de esta carpeta

Todo lo que hay aquí es **generado**. Sale de compilar el repo `famaper-lp`
(`./deploy.sh`), y la siguiente publicación borra y reescribe la carpeta
completa: cualquier cambio hecho directamente aquí se pierde sin aviso y sin
dejar rastro en el historial.

Los cambios de la landing se hacen en `famaper-lp/src/`. Ver `DEPLOY.md` en ese
repo.

Para saber qué versión está publicada:

    curl -s https://fmpracks.com/racks-industriales/version.json
MARKDOWN

echo
echo "Landing compilada desde $RAMA ($COMMIT) y copiada a $DESTINO"
echo
echo "Falta publicarla — en el repo Famaper:"
echo "  git add racks-industriales"
echo "  git commit -m \"Actualizar landing de racks industriales ($COMMIT)\""
echo "  git push"
echo
echo "Y luego, en Plesk: Git -> Pull."
