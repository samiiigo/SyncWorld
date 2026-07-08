FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY realtime-server/package.json realtime-server/package.json
RUN npm install

COPY . .
RUN npm run build --workspace realtime-server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=builder /app/realtime-server/dist ./realtime-server/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/realtime-server/package.json ./realtime-server/package.json

USER node
EXPOSE 3000
CMD ["node", "realtime-server/dist/index.js"]
