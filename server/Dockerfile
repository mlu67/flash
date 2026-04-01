FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src ./src
COPY data ./data

EXPOSE 3001

ENV PORT=3001

CMD ["node", "src/index.js"]
