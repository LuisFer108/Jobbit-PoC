const { Queue } = require("bullmq");

// Conexión básica a Redis (por defecto corre en el puerto 6379 de tu PC)
const connection = {
    host: "localhost",
    port: 6379
};

// Creamos nuestra cola para procesar notificaciones o tareas pesadas
const jobQueue = new Queue("jobbit-tasks", { connection });

module.exports = { jobQueue, connection };