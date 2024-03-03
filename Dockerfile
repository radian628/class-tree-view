FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run writeDB

CMD ["npm", "run", "serve-dev"]
# CMD ["npm", "run", "writeDB"]
