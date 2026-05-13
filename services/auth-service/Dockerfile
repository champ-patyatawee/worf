FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src/ ./src/

EXPOSE 3010

CMD ["npx", "tsx", "src/index.ts"]