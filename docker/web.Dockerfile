# Giao diện Manna: nginx phục vụ trang tĩnh và chuyển /api/ về backend.
# Đổi image gốc nếu Docker Hub giới hạn tải: NGINX_IMAGE=mirror.gcr.io/library/nginx:1.27-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine
FROM ${NGINX_IMAGE}
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html sw.js manifest.webmanifest /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY styles /usr/share/nginx/html/styles
COPY src /usr/share/nginx/html/src
