FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=10000 MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci --omit=dev --workspace=server && npm cache clean --force
COPY --chown=node:node server/src ./server/src
COPY --chown=node:node server/scripts ./server/scripts
COPY --chown=node:node shared ./shared
USER node
WORKDIR /app/server
EXPOSE 10000
CMD ["node", "src/server.js"]
