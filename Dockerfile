FROM node:24-alpine AS signs
WORKDIR /repo
COPY apps/signs/package.json apps/signs/package-lock.json ./apps/signs/
RUN npm --prefix apps/signs ci
COPY shared/ ./shared/
COPY apps/signs/ ./apps/signs/
WORKDIR /repo/apps/signs
RUN npm run build

FROM node:24-alpine AS damage-calculator
WORKDIR /repo
COPY apps/damage-calculator/package.json apps/damage-calculator/package-lock.json ./apps/damage-calculator/
RUN npm --prefix apps/damage-calculator ci
COPY shared/ ./shared/
COPY apps/damage-calculator/ ./apps/damage-calculator/
WORKDIR /repo/apps/damage-calculator
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY apps/hub/ /usr/share/nginx/html/
COPY shared/i18n/ /usr/share/nginx/html/shared/i18n/
COPY shared/analytics/ /usr/share/nginx/html/shared/analytics/
COPY shared/progress/ /usr/share/nginx/html/shared/progress/
COPY apps/progress/index.html /usr/share/nginx/html/progress/
COPY apps/progress/assets/ /usr/share/nginx/html/progress/assets/
COPY apps/progress/img/ /usr/share/nginx/html/progress/img/
COPY apps/progress/data/data.js /usr/share/nginx/html/progress/data/data.js
COPY apps/progress/locales/messages.js /usr/share/nginx/html/progress/locales/messages.js
COPY shared/player/core.js /usr/share/nginx/html/shared/player/core.js
COPY shared/shopping/core.js /usr/share/nginx/html/shared/shopping/core.js
COPY apps/bestiary/index.html /usr/share/nginx/html/bestiary/
COPY apps/bestiary/assets/ /usr/share/nginx/html/bestiary/assets/
COPY apps/bestiary/data/data.js /usr/share/nginx/html/bestiary/data/data.js
COPY apps/bestiary/img/ /usr/share/nginx/html/bestiary/img/
COPY apps/smithy/index.html /usr/share/nginx/html/smithy/
COPY apps/smithy/assets/ /usr/share/nginx/html/smithy/assets/
COPY apps/smithy/data/data.js /usr/share/nginx/html/smithy/data/data.js
COPY apps/smithy/img/ /usr/share/nginx/html/smithy/img/
COPY apps/provisions/index.html /usr/share/nginx/html/provisions/
COPY apps/provisions/assets/ /usr/share/nginx/html/provisions/assets/
COPY apps/provisions/locales/messages.js /usr/share/nginx/html/provisions/locales/messages.js
COPY apps/provisions/data/data.js /usr/share/nginx/html/provisions/data/data.js
COPY apps/provisions/img/ /usr/share/nginx/html/provisions/img/
COPY apps/comfort/index.html /usr/share/nginx/html/comfort/
COPY apps/comfort/assets/ /usr/share/nginx/html/comfort/assets/
COPY apps/comfort/locales/messages.js /usr/share/nginx/html/comfort/locales/messages.js
COPY apps/comfort/data/data.js /usr/share/nginx/html/comfort/data/data.js
COPY apps/comfort/img/ /usr/share/nginx/html/comfort/img/
COPY apps/expedition/index.html /usr/share/nginx/html/expedition/
COPY apps/expedition/assets/ /usr/share/nginx/html/expedition/assets/
COPY apps/expedition/locales/messages.js /usr/share/nginx/html/expedition/locales/messages.js
COPY apps/expedition/data/data.js /usr/share/nginx/html/expedition/data/data.js
COPY apps/items/index.html /usr/share/nginx/html/items/
COPY apps/items/assets/ /usr/share/nginx/html/items/assets/
COPY apps/items/locales/messages.js /usr/share/nginx/html/items/locales/messages.js
COPY apps/items/data/data.js /usr/share/nginx/html/items/data/data.js
COPY --from=signs /repo/apps/signs/dist-static/ /usr/share/nginx/html/signs/
COPY --from=damage-calculator /repo/apps/damage-calculator/dist-static/ /usr/share/nginx/html/damage-calculator/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
