# Readme

1. Install docker daemon

        sudo apt install docker.io

2. Build image

        docker build -t bitcointransaction .

3. Run image 

    Path `/storage` MUST be a mount to working directory 
    containing `wallets.....dat` and `config.json` files.

        docker run \
            --net btc \
            --restart unless-stopped \
            --name bitcointransaction \
            -p 8086:8080 \
            -p 3086:3000 \
            -e API_URL=http://work.people-bitcoins.ru:8086 \
            -v /var/www/www-root/data/www/work.people-bitcoins.ru:/storage
            bitcointransaction

4. Open UI

        http://work.people-bitcoins.ru:3086/

### Dev mode

      docker rm -f bitcointransaction

      docker build -t bitcointransaction -f dev.Dockerfile .

      docker run \
         --rm \
         --name bitcointransaction \
         -td \
         -v $(pwd):/usr/src/app \
         -v $(pwd)/storage:/storage \
         -p 127.0.0.1:8086:8080 \
         -p 127.0.0.1:3086:3000 \
         -t -d --entrypoint /bin/bash \
         bitcointransaction

      docker exec -it bitcointransaction /bin/bash

      # $ yarn dev