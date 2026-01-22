# Deal or No Deal Fantasy Football

A fun fantasy mini game. Play a game based on the popular game show, only using Fantasy Football projections instead of money. Play with league mates until everyone has one RB and one WR for the week. After all the games are complete, the highest scoring line-up wins.

Play Game: [https://dondff.vercel.app/](https://dondff.vercel.app/)

OpenAPI references:
https://learn.openapis.org/specification/parameters.html
https://github.com/seriousme/fastify-openapi-glue

Fastify:
belcheti@Tims-MacBook-Pro dondff % mkdir dondff-fastify-gen
belcheti@Tims-MacBook-Pro dondff % npx github:seriousme/fastify-openapi-glue -b dondff-fastify-gen -p dondff-fastify openapi.yaml 

LoopBack4
npm i -g @loopback/cli

Building locally (apple silicon):
```
docker buildx create --name dondff-builder --use
docker buildx inspect --bootstrap
```

### BUILD
Locally, execute:
```bash
./scripts/build-and-export-images.sh
```

Then, on the server, execute:
```bash
docker@sh2:~/docker$ pwd
/home/docker/docker
docker@sh2:~/docker$ ./down-dondff
[+] Running 5/5
 ✔ Container dondff-frontend  Removed                                                                                                                                                                           11.1s
 ✔ Container dondff-backend   Removed                                                                                                                                                                           11.0s
 ✔ Container dondff-postgres  Removed                                                                                                                                                                            0.8s
 ✔ Network docker_dondff      Removed                                                                                                                                                                            0.2s
 ! Network internal           Resource is still in use                                                                                                                                                           0.0s
docker@sh2:~/docker$ dondff/
images/                load-images-and-up.sh
docker@sh2:~/docker$ dondff/load-images-and-up.sh
```