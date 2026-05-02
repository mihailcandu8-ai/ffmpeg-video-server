FROM jrottenberg/ffmpeg:4.4-alpine
RUN apk add --no-cache nodejs npm curl
WORKDIR /app
COPY package.json .
RUN npm install
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
