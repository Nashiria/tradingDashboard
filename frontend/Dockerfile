FROM node:18-alpine AS build

WORKDIR /app

ARG REACT_APP_API_URL=http://localhost:8080
ARG REACT_APP_WS_URL=ws://localhost:8080/ws

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL

COPY frontend/package*.json ./frontend/
COPY shared/package.json ./shared/package.json
COPY shared/dist ./shared/dist

WORKDIR /app/frontend
RUN npm install

WORKDIR /app

COPY frontend ./frontend
COPY shared ./shared

WORKDIR /app/frontend
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
