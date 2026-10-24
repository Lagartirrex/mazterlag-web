FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY seed ./seed
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data UPLOADS_DIR=/uploads
VOLUME ["/data", "/uploads"]
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
