FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm start"]