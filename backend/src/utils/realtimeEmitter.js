const EventEmitter = require("events");

class RealtimeEmitter extends EventEmitter {}

const realtimeEmitter = new RealtimeEmitter();

module.exports = realtimeEmitter;
