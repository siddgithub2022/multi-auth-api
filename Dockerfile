# Run anywhere with one click: docker build & run
FROM node:20-alpine
WORKDIR /app
# Server deps
COPY server/package.json ./server/package.json
RUN cd server && npm install --production
# Client deps (http-server for standalone 8080)
COPY client/package.json ./client/package.json
RUN cd client && npm install --production
# App source
COPY . .
# Generate swagger/postman at build
RUN node -e "require('./server/utils/swaggerGenerator').generateAll('./swagger'); require('./server/utils/swaggerGenerator').generateAll('./docs'); require('./server/utils/postmanGenerator').generatePostman('./docs/postman_collection.json')"
EXPOSE 3000 8080
# Start both server (3000) and standalone client (8080) via node
CMD ["node", "launcher.js", "both"]
