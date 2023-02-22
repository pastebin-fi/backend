FROM node:14

WORKDIR /app

COPY package*.json .

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["ts-node", "src"]
