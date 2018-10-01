#!/bin/sh


cd jekyll
git pull 

git commit -am "auto commit $(date)" 
if [ "$?" -ne "0" ]; then  
  echo "$(date "+%Y-%m-%d %H:%M:%S") - fail to commit jekyll" && exit 1
fi

git push

if [ "$?" -ne "0" ]; then  
  echo "$(date "+%Y-%m-%d %H:%M:%S") - fail to push jekyll" && exit 1
fi

cd ..

docker exec jk /urlmd/buildJK.sh

JEKYLL_ENV=production jekyll build --config jekyll/_config_local.yml -s jekyll -d site

if [ "$?" -ne "0" ]; then  
echo "$(date "+%Y-%m-%d %H:%M:%S") - fail to build jekyll" && exit 1
fi

cd site
git pull
git commit -am "auto commit $(date "+%Y-%m-%d %H:%M:%S")"
if [ "$?" -ne "0" ]; then  
 "$(date "+%Y-%m-%d %H:%M:%S") - fail to commit site" && exit 1
fi

git push
if [ "$?" -ne "0" ]; then  
echo "$(date "+%Y-%m-%d %H:%M:%S") - fail to push site" && exit 1
fi
cd ..
echo "success build and push site"
echo 
exit 0
