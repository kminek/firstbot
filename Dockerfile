FROM mhart/alpine-node:6.3.0

WORKDIR /app
ADD . .

RUN npm install

CMD ["node", "firstbot.js"]
