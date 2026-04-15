FROM node:22-alpine

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 再复制源码
COPY . .
RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]
