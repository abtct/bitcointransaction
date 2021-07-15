# Readme

1. Install docker daemon

        sudo apt install docker.io

2. Build image

        docker build -t bitcointransaction .  

3. Run image 

    Path `/storage` MUST be a mount to working directory 
    containing `wallets.....dat` and `config.json` files.

        docker run \
            --restart unless-stopped \
            --name bitcointransaction \
            -p 8085:8080 \
            -v /var/www/www-root/data/www/work.people-bitcoins.ru:/storage
            bitcointransaction

4. Open UI

        http://work.people-bitcoins.ru:8085/