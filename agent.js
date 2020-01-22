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
        agent_id: config.agent_id,
        agent_name: config.owner
    }));
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
            console.log(msg);
        });
        ws.on('open', () => {
            console.log('Connected!');
            announce();
            connectionAttempts = 0;
            resolve(true);
        });
        ws.on('error', (err) => {
            reject(err);
        });
        ws.on('close', (code, reason) => {
            console.log(code, reason);
            console.log('Lost connection!');
            console.log('Attempting reconnect...');
            setTimeout(() => {
                connectionAttempts++;
                connectWs();
            }, connectionAttempts >= 5 ? 10000 : 1000);
        });
    });
}

let log_tail;

function startStreamingLogs() {
    const log_path = config.log_file;
    if (fs.existsSync(log_path)) {
        log_tail = new Tail(log_path);
        log_tail.on('line', (line) => {
            const payload = {
                event: 'log_line',
                agent_ts: Date.now(),
                full_line: line
            };
            ws.send(JSON.stringify(payload));
        });

        log_tail.on('error', (error) => {
            console.log('ERROR: ', error);
        });
    } else {
        console.error('log file not found!');
        process.exit(1);
    }
}

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
