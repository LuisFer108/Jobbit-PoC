const { Worker } = require("bullmq");
const { connection } = require("./jobQueue");
const { notifyCandidatesForNewOffer } = require("../src/utils/notificationService");

const worker = new Worker(
    "jobbit-tasks",
    async (job) => {
        if (job.name === "evaluar-compatibilidad") {
            const { jobId, offerTitle } = job.data;
            console.log(`[Worker] Evaluando candidatos en segundo plano para la vacante: ${offerTitle} (ID: ${jobId})`);
            
            // Ejecutamos la función real de compatibilidad y notificación
            await notifyCandidatesForNewOffer(jobId);
            
            console.log(`[Worker] ¡Proceso de la vacante ${jobId} finalizado con éxito!`);
        }
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`✔ Tarea en segundo plano ${job.id} completada con éxito.`);
});

worker.on("failed", (job, err) => {
    console.error(`❌ La tarea ${job.id} falló:`, err);
});