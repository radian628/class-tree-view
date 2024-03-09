FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# RUN npm run writeDB

#CMD ["npm", "run", "serve-dev"]
# Run this one the first time
CMD ["sh","-c","npm run writeDB; node backend/build_prereqs.js"]
# afterwards use this to skip DB creation
# CMD ["sh","-c","node backend/build_prereqs.js"]
