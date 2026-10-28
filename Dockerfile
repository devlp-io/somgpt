FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY public ./public

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "server.js"]