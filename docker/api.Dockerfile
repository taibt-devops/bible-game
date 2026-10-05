# Backend Manna: Node 24 + SQLite tích hợp (không cần npm install). Dữ liệu nằm ở volume /data.
# Đổi image gốc nếu Docker Hub giới hạn tải: NODE_IMAGE=mirror.gcr.io/library/node:24-alpine
ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DB_PATH=/data/manna.db \
    SERVE_STATIC=0
COPY package.json ./
COPY server ./server
COPY src ./src
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
