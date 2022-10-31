FROM node:14

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["ts-node", "src"]