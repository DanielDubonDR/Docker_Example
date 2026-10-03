# Todo list: nginx (HTML) + Node.js (API) + MySQL + Docker

## Estructura
```
todo-app/
├── docker-compose.yml
├── api/   (Dockerfile, package.json, server.js)
└── web/   (Dockerfile, nginx.conf, index.html)
```

## A) Manual (comandos docker)
```bash
cd todo-app
docker network create todo-net
docker volume create todo_data

# MySQL
docker run -d --name todo-db --network todo-net \
  -e MYSQL_ROOT_PASSWORD=root_pass -e MYSQL_DATABASE=todo_db \
  -e MYSQL_USER=todo_user -e MYSQL_PASSWORD=todo_pass \
  -v todo_data:/var/lib/mysql mysql:8.0

# API
docker build -t todo-api ./api
docker run -d --name todo-api --network todo-net \
  -e DB_HOST=todo-db -e DB_USER=todo_user \
  -e DB_PASSWORD=todo_pass -e DB_NAME=todo_db todo-api

# Web (nginx)
docker build -t todo-web ./web
docker run -d --name todo-web --network todo-net -p 8080:80 todo-web
```
Abrir http://localhost:8080

Limpiar:
```bash
docker rm -f todo-web todo-api todo-db && docker network rm todo-net && docker volume rm todo_data
```

## B) Docker Compose
```bash
cd todo-app
docker compose up -d --build
```
Abrir http://localhost:8080

Para detener todo usa ```docker compose down``` (o ```down -v``` si también quieres borrar los datos).