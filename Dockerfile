FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs config.example.json ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
RUN mkdir /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=8080 DATA_DIR=/data
EXPOSE 8080
VOLUME /data
CMD ["node", "server.mjs"]
