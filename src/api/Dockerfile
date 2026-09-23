FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY src/api/package.json src/api/package.json
COPY src/extension/package.json src/extension/package.json
RUN npm ci
COPY packages/contracts packages/contracts
COPY src/api src/api
RUN npm run build -w @time-logger/contracts && npm run prisma:generate -w @time-logger/api && npm run build -w @time-logger/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/src/api/package.json ./src/api/package.json
COPY --from=build /app/src/api/dist ./src/api/dist
COPY --from=build /app/src/api/prisma ./src/api/prisma
USER node
CMD ["node", "src/api/dist/server.js"]
