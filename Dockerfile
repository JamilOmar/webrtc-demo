FROM keymetrics/pm2:10-alpine
RUN apk update && apk upgrade && \
apk add --no-cache bash git openssh tzdata
COPY . .

RUN npm install --no-optional
RUN npm -g config set user root
RUN npm install typescript -g
RUN npm run build
ENTRYPOINT [ "pm2-runtime", "start", "pm2.json" ]
EXPOSE 80