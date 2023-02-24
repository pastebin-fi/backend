FROM node:18-alpine3.17

WORKDIR /app

COPY package*.json .

RUN npm i 

COPY src/ .
COPY tsconfig.json .

RUN npx tsc --pretty --project .

EXPOSE 8080

CMD ["node", "target/app.js"]
