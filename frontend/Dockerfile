FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_ISSUER_URL
ARG VITE_OIDC_REDIRECT_URI

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
ENV VITE_OIDC_ISSUER_URL=$VITE_OIDC_ISSUER_URL
ENV VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
