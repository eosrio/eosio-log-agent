const WebSocket = require('ws');
const Tail = require('tail').Tail;
const fs = require('fs');
const config = require("./config.json");

let ws;
let connectionAttempts = 0;

function announce() {
    ws.send(JSON.stringify({
        event: 'announce',
        agent_ts: Date.now(),
        token: config.connection_token,
        chain: config.chain_id,
        agent_name: config.owner
    }));
}

function delayedReconnect() {
    setTimeout(() => {
        console.log('Attempting reconnect...');
        connectionAttempts++;
        connectWs().catch(console.log);
    }, connectionAttempts >= 5 ? 10000 : 2000);
}

async function connectWs() {
    return new Promise((resolve, reject) => {
        console.log('Connecting to server...');
        try {
            ws = new WebSocket(config.log_server, null, {});
        } catch (e) {
            console.log('failed to connect');
            reject(e);
        }
        ws.on('message', (msg) => {
            const data = JSON.parse(msg);
            if (data.event === 'ready') {
                resolve(true);
            }
            if (data.event === 'disconnect') {
                console.log(data);
                process.exit(1);
            }
        });
        ws.on('open', () => {
            console.log('Connected!');
            announce();
            connectionAttempts = 0;
        });
        ws.on('error', (err) => {
            reject(err);
        });
        ws.on('close', (code, reason) => {
            console.log(`Closed connection, CODE: ${code} | REASON: ${reason}`);
            if (code !== 4001) {
                delayedReconnect();
            }
        });
    });
}

let log_tail;
let last_timestamp = 0;

function startStreamingLogs() {
    const log_path = config.log_file;
    if (fs.existsSync(log_path)) {
        log_tail = new Tail(log_path, {
            follow: true
        });
        log_tail.on('line', (line) => {
            last_timestamp = Date.now();
            const payload = {
                event: 'log_line',
                agent_ts: Date.now(),
                agent_id: config.agent_id,
                chain: config.chain_id,
                node_type: config.node_type,
                full_line: line
            };
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify(payload));
                } catch (e) {
                    console.log(e);
                }
            }
        });
        log_tail.on('error', (error) => {
            console.log('ERROR: ', error);
        });
    } else {
        console.error('log file not found!');
        process.exit(1);
    }
}

setInterval(() => {
    if (last_timestamp + 5000 < Date.now()) {
        log_tail.unwatch();
        startStreamingLogs();
    }
}, 1000);

async function main() {
    let connected;
    try {
        connected = await connectWs();
    } catch (e) {
        console.log(e);
    }
    if (connected) {
        startStreamingLogs();
    }
}

main().catch(console.error);
