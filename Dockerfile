FROM node:14

WORKDIR /app

COPY package*.json ./

COPY package*.json ./

RUN npm install

COPY . .

# RUN npm run writeDB

CMD ["/bin/bash", "run.sh"]
# CMD ["npm", "run", "build-frontend"]
# CMD ["npm", "run", "backend"]
# CMD ["npm", "run", "writeDB"]
