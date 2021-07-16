# Readme

1. Install docker daemon

        sudo apt install docker.io

2. Build image

        docker build -t bitcointransaction .

3. Run image 

    Path `/storage` MUST be a mount to working directory 
    containing `wallets.....dat.json` and `config.json` files.

        docker run \
            --restart unless-stopped \
            --name bitcointransaction \
            -p 808**6:8080 \
            -p 3086:3000 \
            -e API_URL=http://work.people-bitcoins.ru:8086 \
            -e SELF_URL=http://work.people-bitcoins.ru:3086 \
            -e BTC_NODE_HOST=work.people-bitcoins.ru \
            -v "/var/www/www-root/data/www/work.people-bitcoins.ru:/storage" \
            -e DANGEROUSLY_DISABLE_HOST_CHECK=true \
            bitcointransaction

4. Open UI

        http://work.people-bitcoins.ru:3086/

### Dev mode

      docker rm -f bitcointransaction

      docker pull node:13

      docker tag node:13 bitcointransaction

      docker run \
         --rm \
         --name bitcointransaction \
         --workdir /usr/src/app \
         -v $(pwd):/usr/src/app \
         -v $(pwd)/storage:/storage \
         -p 127.0.0.1:8086:8080 \
         -p 127.0.0.1:3086:3000 \
         -t -d --entrypoint /bin/bash \
         node:13

      docker exec -it bitcointransaction /bin/bash

      # $ yarn dev