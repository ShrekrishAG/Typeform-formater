# Render Docker runtime looks for Dockerfile at the repo root.
FROM node:20-bookworm-slim

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/src ./src

ENV NODE_ENV=production

CMD ["npm", "start"]
