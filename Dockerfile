FROM node:21-alpine

RUN mkdir -p /app
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 2052

CMD ["node", "."]
