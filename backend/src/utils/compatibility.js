// SCRUM-95: Definir pesos del recomendador baseline (suman 1.0 / 100%)
const WEIGHTS = {
    skills: 0.35,     // 35%: alineación de habilidades técnicas obligatorias y deseables
    experience: 0.20, // 20%: años de experiencia mínimos requeridos
    salary: 0.15,     // 15%: compatibilidad con el rango salarial esperado
    location: 0.15,   // 15%: cercanía geográfica / trabajo remoto
    mode: 0.15        // 15%: preferencia de modalidad (remoto, híbrido, presencial)
};

function normalize(text) {
    return String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Perfil usa "Remoto/Híbrido/Presencial"; vacantes usan remote/hybrid/onsite
function normalizeMode(mode) {
    const m = normalize(mode);
    if (m.startsWith("remot") || m === "remote") return "remote";
    if (m.startsWith("hibrid") || m === "hybrid") return "hybrid";
    if (m.startsWith("presen") || m === "onsite") return "onsite";
    return "";
}

// Normaliza el rango salarial a un nivel ordinal:
// 1 = Menos de 2 millones (< 2M)
// 2 = De 2 a 5 millones (2M - 5M)
// 3 = Más de 5 millones (> 5M)
function normalizeSalary(val) {
    if (!val) return 0;
    const s = normalize(val);
    if (s.includes("menos") || s.includes("<") || s.includes("1m") || s === "1") return 1;
    if (s.includes("mas") || s.includes(">") || (s.includes("5m") && !s.includes("2")) || s === "3") return 3;
    if (s.includes("2") || s.includes("5") || s === "2") return 2;
    return 0;
}

// SCRUM-96: habilidades (ponderadas por peso must = 2, nice = 1)
function skillsScore(offerSkills, profileSkillIds) {
    if (!offerSkills || offerSkills.length === 0) return 100;
    const total = offerSkills.reduce((s, k) => s + (Number(k.weight) || 1), 0);
    if (total === 0) return 100;
    const matched = offerSkills
        .filter((k) => profileSkillIds && profileSkillIds.has(k.skill_id))
        .reduce((s, k) => s + (Number(k.weight) || 1), 0);
    return Math.min(100, Math.round((matched / total) * 100));
}

// SCRUM-97: experiencia
function experienceScore(profileYears, minYears) {
    const need = Number(minYears) || 0;
    const have = Number(profileYears) || 0;
    if (have >= need || need === 0) return 100;
    return Math.min(100, Math.max(0, Math.round((have / need) * 100)));
}

// SCRUM-98: ubicación (remoto en la vacante siempre encaja)
function locationScore(profileLocation, offerLocation, offerMode) {
    if (normalizeMode(offerMode) === "remote") return 100;
    const a = normalize(profileLocation);
    const b = normalize(offerLocation);
    if (!a || !b) return 0;
    return a === b || a.includes(b) || b.includes(a) ? 100 : 0;
}

// SCRUM-99: modalidad
function modeScore(profileMode, offerMode) {
    const a = normalizeMode(profileMode);
    const b = normalizeMode(offerMode);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if (a === "hybrid" || b === "hybrid") return 50;
    return 0;
}

// SCRUM-100: salario
function salaryScore(profileSalary, offerSalary) {
    const p = normalizeSalary(profileSalary);
    const o = normalizeSalary(offerSalary);

    // Si el usuario o la vacante no especifica salario, no se penaliza (100%)
    if (!p || !o) return 100;

    // Coincidencia exacta de rango
    if (p === o) return 100;

    // La vacante paga más que la expectativa del candidato -> Muy favorable para el candidato
    if (o > p) return 100;

    // La vacante ofrece un rango inmediatamente inferior (ej: candidato espera 2-5M y vacante ofrece <2M) -> Negociable
    if (p === o + 1) return 50;

    // La vacante ofrece 2 rangos por debajo de la expectativa (ej: candidato espera >5M y vacante ofrece <2M)
    return 0;
}

// SCRUM-101: score total
function computeCompatibility(profile, offer, offerSkills, profileSkillIds) {
    const breakdown = {
        skills: Math.round(skillsScore(offerSkills, profileSkillIds)),
        experience: Math.round(experienceScore(profile.experience_years, offer.min_experience_years)),
        salary: Math.round(salaryScore(profile.salary_range, offer.salary_range)),
        location: Math.round(locationScore(profile.preferred_location, offer.location, offer.work_mode)),
        mode: Math.round(modeScore(profile.work_mode, offer.work_mode))
    };

    const weightedScore = Math.round(
        breakdown.skills * WEIGHTS.skills +
        breakdown.experience * WEIGHTS.experience +
        breakdown.salary * WEIGHTS.salary +
        breakdown.location * WEIGHTS.location +
        breakdown.mode * WEIGHTS.mode
    );

    const score = Math.max(0, Math.min(100, weightedScore));

    return { score, breakdown };
}

module.exports = {
    WEIGHTS,
    skillsScore,
    experienceScore,
    salaryScore,
    locationScore,
    modeScore,
    computeCompatibility
};