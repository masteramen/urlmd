docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)
docker run --rm --name jk -p 80:4000 -v /blog:/site bretfisher/jekyll-serve
