FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run css:build
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/views ./src/views
COPY --from=build /app/src/public ./src/public
COPY data ./data

EXPOSE 8080 8443 80 443

USER node

CMD ["node", "dist/server.js"]
