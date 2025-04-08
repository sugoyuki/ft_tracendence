FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV PATH /app/node_modules/.bin:$PATH

CMD ["npm", "run", "dev"]
