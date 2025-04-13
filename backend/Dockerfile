FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# 基本的な依存関係のみインストール
RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
