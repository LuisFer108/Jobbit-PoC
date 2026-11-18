const { Queue } = require("bullmq");

// Pegas la URL completa que te da Redis Cloud (reemplaza los asteriscos con tu contraseña real si la copiaste)
const connection = {
    url: "redis://default:zSR6AlCW94xTLCpTZo1vP6efSbqUsum7@egg-afternoon-spa-31967.db.redis.io:12398"
};

const jobQueue = new Queue("jobbit-tasks", { connection });

module.exports = { jobQueue, connection };