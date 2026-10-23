FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package*.json ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:deploy && node dist/server.js"]
