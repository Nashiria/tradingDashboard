FROM node:18-alpine AS deps

WORKDIR /app

COPY backend/package*.json ./backend/
COPY shared/package.json ./shared/package.json
COPY shared/dist ./shared/dist

WORKDIR /app/backend
RUN npm install

FROM deps AS build

WORKDIR /app

COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./backend/
COPY shared/package.json ./shared/package.json
COPY shared/dist ./shared/dist

WORKDIR /app/backend
RUN npm install --omit=dev

COPY --from=build /app/backend/dist ./dist

EXPOSE 8080

CMD ["npm", "start"]
