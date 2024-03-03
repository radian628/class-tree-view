FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run updatedb

CMD ["npm", "run", "serve-dev"]
