#/bin/sh
cd /urlmd
JEKYLL_ENV=production jekyll build --config jekyll/_config_local.yml -s jekyll -d site
