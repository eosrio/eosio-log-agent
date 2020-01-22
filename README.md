### Hyperion log streaming agent for eosio nodes

#### Install Node.js

```
# Using Ubuntu
curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Install agent app

```
git clone https://github.com/eosrio/eosio-log-agent
cd eosio-log-agent
npm install
```

#### Edit `config.json`

1. set `owner` to your producer name
2. set `chain_id`
3. request a personal token from the EOS Rio team and set it on `connection_token`
4. set `log_file` to your nodeos log output
5. `agent_id` can be set to any value you want, used to identify different nodes from the same producer
6. `node_type` should be set to **producer**, **seed** or **api**
7. `log_server` can be changed to a relay if your network infrastructure requires it

#### Start and test agent
`node agent.js`

