FROM node:18.16-alpine3.17

WORKDIR /usr/src/app

COPY package*.json .

RUN npm ci --production

ENV NODE_ENV production

COPY . .

EXPOSE 3005

CMD ["npm", "start"]
