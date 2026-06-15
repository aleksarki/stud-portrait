# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# skip chromedriver
ENV CHROMEDRIVER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./

RUN npm install --ignore-scripts --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
