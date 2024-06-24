FROM node:21-bookworm

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 2052

CMD ["node", "."]
