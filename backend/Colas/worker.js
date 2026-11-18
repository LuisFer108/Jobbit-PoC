const { Worker } = require("bullmq");
const { connection } = require("./jobQueue");

const worker = new Worker(
    "jobbit-tasks",
    async (job) => {
        console.log(`Procesando tarea ${job.id} de tipo: ${job.name}`);
        
        if (job.name === "evaluar-compatibilidad") {
            const { jobId, offerTitle } = job.data;
            console.log(`Evaluando candidatos para la vacante: ${offerTitle} (ID: ${jobId})`);
            
            // Aquí puedes colocar la lógica pesada que antes bloqueaba el hilo principal
            // (Ej: cálculos matemáticos de afinidad, envío masivo de correos, etc.)
            
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulando proceso de 3 segundos
            console.log(`¡Proceso de la vacante ${jobId} finalizado con éxito!`);
        }
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`✔ Tarea ${job.id} completada correctamente.`);
});

worker.on("failed", (job, err) => {
    console.error(`❌ La tarea ${job.id} falló:`, err);
});