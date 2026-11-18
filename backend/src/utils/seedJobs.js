const pool = require("../db");

const DIVERSE_JOBS = [
    {
        title: "Ejecutivo Comercial B2B",
        company: "Alimentos del Campo SAS",
        description: "Lidera la prospección, negociación y cierre de cuentas corporativas. Excelente ambiente y comisiones atractivas.",
        min_experience_years: 2,
        location: "Bogotá",
        work_mode: "hybrid",
        salary_range: "2M - 5M",
        skills: [
            { name: "Negociación Comercial", req: "must", weight: 2 },
            { name: "Prospección de Clientes", req: "must", weight: 2 },
            { name: "Venta B2B Corporativa", req: "must", weight: 2 },
            { name: "Manejo de CRM", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Coordinador de Recursos Humanos",
        company: "Grupo Horizonte",
        description: "Gestión integral del talento humano, procesos de selección, bienestar corporativo y legislación laboral.",
        min_experience_years: 2,
        location: "Medellín",
        work_mode: "hybrid",
        salary_range: "2M - 5M",
        skills: [
            { name: "Reclutamiento y Selección", req: "must", weight: 2 },
            { name: "Gestión del Talento Humano", req: "must", weight: 2 },
            { name: "Legislación Laboral", req: "must", weight: 2 },
            { name: "Clima y Cultura Organizacional", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Analista Contable y Financiero",
        company: "Asesorías Contables SAS",
        description: "Responsable de contabilidad general, análisis de balances, conciliaciones bancarias y facturación.",
        min_experience_years: 1,
        location: "Cali",
        work_mode: "onsite",
        salary_range: "2M - 5M",
        skills: [
            { name: "Contabilidad General", req: "must", weight: 2 },
            { name: "Análisis Financiero", req: "must", weight: 2 },
            { name: "Facturación y Cobranzas", req: "must", weight: 2 },
            { name: "Excel Avanzado", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Especialista en Marketing Digital y Redes",
        company: "Agencia Impacto Creativo",
        description: "Gestión de redes sociales, creación de contenido persuasivo, pauta digital en Meta Ads y Google Ads.",
        min_experience_years: 2,
        location: "Remoto Colombia",
        work_mode: "remote",
        salary_range: "2M - 5M",
        skills: [
            { name: "Marketing Digital", req: "must", weight: 2 },
            { name: "Community Management", req: "must", weight: 2 },
            { name: "Creación de Contenido (Copywriting)", req: "must", weight: 2 },
            { name: "Publicidad Digital (Ads)", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Supervisor de Operaciones y Logística",
        company: "Logística Express Colombia",
        description: "Supervisión de almacén, control de inventarios, optimización de despachos y coordinación con transportistas.",
        min_experience_years: 2,
        location: "Barranquilla",
        work_mode: "onsite",
        salary_range: "2M - 5M",
        skills: [
            { name: "Gestión de Inventarios", req: "must", weight: 2 },
            { name: "Logística y Distribución", req: "must", weight: 2 },
            { name: "Gestión de Almacén y Bodega", req: "must", weight: 2 },
            { name: "Cadena de Suministro (Supply Chain)", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Asesor de Servicio al Cliente y PQR",
        company: "Contact Global",
        description: "Atención cálida y oportuna a clientes multicanal, gestión de requerimientos y resolución de solicitudes.",
        min_experience_years: 0,
        location: "Bucaramanga",
        work_mode: "remote",
        salary_range: "Menos de 2M",
        skills: [
            { name: "Atención y Servicio al Cliente", req: "must", weight: 2 },
            { name: "Gestión de PQR", req: "must", weight: 2 },
            { name: "Comunicación Asertiva", req: "must", weight: 2 },
            { name: "Manejo de Contact Center", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Profesional en Seguridad y Salud en el Trabajo (SST)",
        company: "Constructora Andina",
        description: "Diseño, ejecución y auditoría del SG-SST, primeros auxilios, inspecciones preventivas y bienestar laboral.",
        min_experience_years: 2,
        location: "Bogotá",
        work_mode: "onsite",
        salary_range: "2M - 5M",
        skills: [
            { name: "Seguridad y Salud en el Trabajo (SST)", req: "must", weight: 2 },
            { name: "Primeros Auxilios", req: "must", weight: 2 },
            { name: "Legislación Laboral", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Diseñador Gráfico y Audiovisual",
        company: "Estudio Magenta",
        description: "Creación de piezas gráficas para branding, piezas publicitarias y edición de video corporativo.",
        min_experience_years: 1,
        location: "Medellín",
        work_mode: "hybrid",
        salary_range: "2M - 5M",
        skills: [
            { name: "Diseño Gráfico", req: "must", weight: 2 },
            { name: "Adobe Photoshop", req: "must", weight: 2 },
            { name: "Adobe Illustrator", req: "must", weight: 2 },
            { name: "Edición de Video", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Docente y Tutor Virtual",
        company: "Instituto Formar",
        description: "Acompañamiento a estudiantes en entornos e-learning, diseño de material pedagógico y evaluaciones.",
        min_experience_years: 1,
        location: "Remoto Colombia",
        work_mode: "remote",
        salary_range: "2M - 5M",
        skills: [
            { name: "Pedagogía y Docencia", req: "must", weight: 2 },
            { name: "Plataformas E-Learning", req: "must", weight: 2 },
            { name: "Tutoría y Asesoría Académica", req: "must", weight: 2 },
            { name: "Creación de Material Didáctico", req: "nice", weight: 1 }
        ]
    },
    {
        title: "Analista Legal y Contractual",
        company: "Consultores Jurídicos del Valle",
        description: "Revisión y redacción de contratos comerciales y laborales, cumplimiento normativo y apoyo legal.",
        min_experience_years: 2,
        location: "Cali",
        work_mode: "hybrid",
        salary_range: "2M - 5M",
        skills: [
            { name: "Derecho Laboral y Contratos", req: "must", weight: 2 },
            { name: "Cumplimiento Normativo (Compliance)", req: "must", weight: 2 },
            { name: "Redacción Jurídica", req: "must", weight: 2 },
            { name: "Protección de Datos Personales", req: "nice", weight: 1 }
        ]
    }
];

async function seedJobs(client = pool) {
    try {
        // Asegurar fuente
        let sourceRes = await client.query("SELECT id FROM offer_sources WHERE name = 'Dataset inicial Jobbit'");
        let sourceId;
        if (!sourceRes.rows[0]) {
            const insSource = await client.query("INSERT INTO offer_sources (name, type) VALUES ('Dataset inicial Jobbit', 'dataset') RETURNING id");
            sourceId = insSource.rows[0].id;
        } else {
            sourceId = sourceRes.rows[0].id;
        }

        // Limpieza de caracteres raros en títulos de vacantes previas si los hubiera
        await client.query("UPDATE job_offers SET company = 'TechBogotá SAS' WHERE id = 1 AND company LIKE '%Bogot%'");
        await client.query("UPDATE job_offers SET title = 'Diseñador UX/UI' WHERE id = 4 AND (title LIKE '%Dise%' OR title LIKE '%UX%')");
        await client.query("UPDATE job_offers SET company = 'Montaña Labs' WHERE id = 6 AND company LIKE '%Monta%'");
        await client.query("UPDATE job_offers SET title = 'Científico de Datos' WHERE id = 8 AND title LIKE '%Cient%'");
        await client.query("UPDATE job_offers SET title = 'Desarrollador Móvil' WHERE id = 9 AND title LIKE '%vil%'");

        for (const job of DIVERSE_JOBS) {
            // Verificar si ya existe por título y empresa
            const existing = await client.query(
                "SELECT id FROM job_offers WHERE title = $1 AND company = $2",
                [job.title, job.company]
            );

            let offerId;
            if (existing.rows[0]) {
                offerId = existing.rows[0].id;
            } else {
                const ins = await client.query(
                    `INSERT INTO job_offers (source_id, created_by, title, company, description, min_experience_years, location, work_mode, salary_range, status)
                     VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, 'active')
                     RETURNING id`,
                    [sourceId, job.title, job.company, job.description, job.min_experience_years, job.location, job.work_mode, job.salary_range]
                );
                offerId = ins.rows[0].id;
            }

            // Asociar habilidades requeridas
            for (const skillReq of job.skills) {
                const sRow = await client.query("SELECT id FROM skills WHERE name = $1", [skillReq.name]);
                if (sRow.rows[0]) {
                    const skillId = sRow.rows[0].id;
                    await client.query(
                        `INSERT INTO offer_skills (offer_id, skill_id, requirement, weight)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (offer_id, skill_id) DO UPDATE SET requirement = EXCLUDED.requirement, weight = EXCLUDED.weight`,
                        [offerId, skillId, skillReq.req, skillReq.weight]
                    );
                }
            }
        }

        console.log(`Vacantes multirubro y sus habilidades precargadas correctamente.`);
    } catch (err) {
        console.error("Error al precargar vacantes diversas:", err);
    }
}

module.exports = {
    DIVERSE_JOBS,
    seedJobs
};
