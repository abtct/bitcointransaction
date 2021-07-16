FROM node:13

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN (cd demo-frontend && npm install)

EXPOSE 8080
EXPOSE 3000

ENTRYPOINT [ "/usr/local/bin/yarn" ]

CMD [ "dev" ]