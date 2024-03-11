FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run writeDB

CMD ["npm", "run", "build-frontend"]
CMD ["npm", "run", "backend"]
# CMD ["npm", "run", "writeDB"]
