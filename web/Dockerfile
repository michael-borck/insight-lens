# ---- Build stage: typecheck + build the frontend ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# Self-host serves from a root domain, so build assets root-relative (not /insight-lens/).
ENV BASE_URL=/
RUN npm run build

# ---- Runtime stage: lean Node server (no build tooling, no source maps) ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 8080
# tsx runs the TypeScript server directly — no separate compile step at runtime.
CMD ["npx", "tsx", "server/index.ts"]
