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