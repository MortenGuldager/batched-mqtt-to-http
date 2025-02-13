const mqtt = require('mqtt');
const axios = require('axios');

const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_TOPIC = process.env.MQTT_TOPIC;
const HTTP_ENDPOINT = process.env.HTTP_ENDPOINT;
const HTTP_AUTH_SECRET = process.env.HTTP_AUTH_SECRET;
const BATCH_SIZE = process.env.BATCH_SIZE;

const options = { keepalive: 60, reconnectPeriod: 500 };
const client = mqtt.connect(MQTT_BROKER, options);

let messageQueue = [];
let seq = 0;

client.on('connect', () => {
    console.log(`Connected to MQTT Broker ${MQTT_BROKER} ${MQTT_TOPIC}`);
    client.subscribe(MQTT_TOPIC);
});

client.on('message', (topic, message) => {
    messageQueue.push({ topic, message: message.toString() });

    if (messageQueue.length >= BATCH_SIZE) {
        flushMessages();
    }
});

async function flushMessages() {
    if (messageQueue.length === 0) return;

    console.log(`Forwarding ${messageQueue.length} messages via HTTP POST to ${HTTP_ENDPOINT}`);

    const messagesToSend = messageQueue.slice();
    messageQueue = [];
    seq += 1;
    try {
        await axios.post(HTTP_ENDPOINT, {seq:seq, messages:messagesToSend}, {
            headers: { 
                'Content-Type': 'application/json' ,
                'Authorization': HTTP_AUTH_SECRET
            }
        });
    } catch (error) {
        console.error("HTTP POST failed:", error.message);
    }
}