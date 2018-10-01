#!/bin/sh
git cd jekyll
git pull
git commit -am "auto commit"
git push

if [ "$?" -ne "0" ]; then  
    echo "usage: $0 <area> <hours>"  
    exit 2  
fi  

JEKYLL_ENV=production jekyll build --config jekyll/_config_local.yml -s jekyll -d site  
exit 0
