FROM node:14

WORKDIR /app

COPY package*.json ./

COPY out ./

RUN npm install

COPY . .

# RUN npm run writeDB

CMD ["npm", "run", "writeDB"]
