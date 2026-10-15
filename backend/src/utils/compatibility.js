// SCRUM-95: Definir pesos del recomendador baseline (suman 1.0 / 100%)
const WEIGHTS = {
    skills: 0.35,     // 35%: alineación de habilidades técnicas obligatorias y deseables
    experience: 0.20, // 20%: años de experiencia mínimos requeridos
    salary: 0.15,     // 15%: compatibilidad con el salario mínimo esperado
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

// Normaliza cualquier representación de salario a un valor numérico (en COP):
// Permite números directos, valores con separadores ($2.500.000), notaciones abreviadas (3M)
// o rangos heredados ("2M - 5M", "Menos de 2M", "Más de 5M").
function parseSalary(val, isOffer = false) {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;

    const s = normalize(val);
    if (!s) return 0;

    // Rango tipo "2M - 5M", "2 a 5 millones", etc.
    const rangeMatch = s.match(/(\d+(?:[.,]\d+)?)\s*m?\s*(?:-|a|a\s+los?)\s*(\d+(?:[.,]\d+)?)\s*m?/);
    if (rangeMatch) {
        let low = parseFloat(rangeMatch[1].replace(",", "."));
        let high = parseFloat(rangeMatch[2].replace(",", "."));
        if (low < 1000) low *= 1000000;
        if (high < 1000) high *= 1000000;
        return isOffer ? high : low;
    }

    // "Menos de 2M" / "< 2M"
    if (s.includes("menos") || s.includes("<")) {
        const numMatch = s.match(/(\d+(?:[.,]\d+)?)/);
        let num = numMatch ? parseFloat(numMatch[1].replace(",", ".")) : 2;
        if (num < 1000) num *= 1000000;
        return isOffer ? num : Math.round(num * 0.75);
    }

    // "Más de 5M" / "> 5M"
    if (s.includes("mas") || s.includes(">")) {
        const numMatch = s.match(/(\d+(?:[.,]\d+)?)/);
        let num = numMatch ? parseFloat(numMatch[1].replace(",", ".")) : 5;
        if (num < 1000) num *= 1000000;
        return num;
    }

    // Notación con 'M' o millones (ej: "3M", "3.5 millones")
    const millionMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:m|millon|millones)/);
    if (millionMatch) {
        return Math.round(parseFloat(millionMatch[1].replace(",", ".")) * 1000000);
    }

    // Número plano o con separadores (ej: "2500000", "$2.500.000")
    const cleanDigits = s.replace(/[^0-9]/g, "");
    if (cleanDigits) {
        const n = parseInt(cleanDigits, 10);
        return isNaN(n) ? 0 : n;
    }

    return 0;
}

// Alias para compatibilidad con llamadas anteriores
function normalizeSalary(val, isOffer = false) {
    return parseSalary(val, isOffer);
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

// SCRUM-100: salario (evaluado con base en salario mínimo esperado)
function salaryScore(profileSalary, offerSalary) {
    const pVal = (profileSalary && typeof profileSalary === "object")
        ? (profileSalary.min_salary ?? profileSalary.salary_min ?? profileSalary.salary_range)
        : profileSalary;

    const oVal = (offerSalary && typeof offerSalary === "object")
        ? (offerSalary.salary ?? offerSalary.min_salary ?? offerSalary.salary_min ?? offerSalary.salary_range)
        : offerSalary;

    const minExpected = parseSalary(pVal, false);
    const offered = parseSalary(oVal, true);

    // Si el usuario no especifica salario mínimo esperado o la vacante no especifica salario, no se penaliza (100%)
    if (!minExpected || !offered) return 100;

    // Si la vacante ofrece igual o más del salario mínimo requerido por el candidato -> 100%
    if (offered >= minExpected) return 100;

    // Si la vacante ofrece menos del salario mínimo requerido, afinidad proporcional
    return Math.min(100, Math.max(0, Math.round((offered / minExpected) * 100)));
}

// SCRUM-101: score total
function computeCompatibility(profile, offer, offerSkills, profileSkillIds) {
    const profileSalary = profile.min_salary ?? profile.salary_min ?? profile.salary_range;
    const offerSalary = offer.salary ?? offer.min_salary ?? offer.salary_min ?? offer.salary_range;

    const breakdown = {
        skills: Math.round(skillsScore(offerSkills, profileSkillIds)),
        experience: Math.round(experienceScore(profile.experience_years, offer.min_experience_years)),
        salary: Math.round(salaryScore(profileSalary, offerSalary)),
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
    parseSalary,
    normalizeSalary,
    computeCompatibility
};
