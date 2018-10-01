#!/bin/sh


cd jekyll
git pull || (echo "fail to pull jekyll $(date)" && exit 1)
git commit -am "auto commit $(date)"  || (echo "fail to commit jekyll $(date)" && exit 1)
git push  || (echo "fail to push jekyll $(date)" && exit 1)


cd ..

JEKYLL_ENV=production jekyll build --config jekyll/_config_local.yml -s jekyll -d site || (echo "fail to build jekyll $(date)" && exit 1)

cd site
git pull || (echo "fail to pull site $(date)" && exit 1)
git commit -am "auto commit $(date)"  || (echo "fail to commit site $(date)" && exit 1)
git push  || (echo "fail to push site $(date)" && exit 1)
cd ..
echo "success build and push site"
exit 0
