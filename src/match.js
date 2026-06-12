function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isHighEnergy(value) {
  return normalize(value) === "alto";
}

function buildMatchReasons(dog, walker) {
  const reasons = [];
  let score = 0;
  let blocked = false;

  if (dog.Raza_API_ID && walker.Especialidad_Raza_API_ID) {
    if (String(dog.Raza_API_ID) === String(walker.Especialidad_Raza_API_ID)) {
      score += 50;
      reasons.push("Especialidad exacta para la raza.");
    } else {
      reasons.push("Raza distinta a su especialidad principal.");
    }
  }

  if (dog.Tamano && walker.Capacidad_Tamano) {
    if (normalize(dog.Tamano) === normalize(walker.Capacidad_Tamano)) {
      score += 30;
      reasons.push(`Acepta perros de tamaño ${dog.Tamano}.`);
    } else {
      reasons.push(`Su capacidad es para tamaño ${walker.Capacidad_Tamano}.`);
    }
  }

  if (isHighEnergy(dog.Nivel_Energia)) {
    if (Boolean(walker.AceptaHiperactivos)) {
      score += 20;
      reasons.push("Acepta perros hiperactivos.");
    } else {
      blocked = true;
      reasons.push("No acepta perros hiperactivos.");
    }
  } else if (dog.Nivel_Energia) {
    score += 10;
    reasons.push(`Compatible con energía ${dog.Nivel_Energia}.`);
  }

  const age = Number(dog.Edad);

  if (Number.isFinite(age) && age > 0) {
    if (age <= 2) {
      score += 5;
      reasons.push("Edad de cachorro considerada en la recomendación.");
    } else if (age >= 8) {
      score += 5;
      reasons.push("Edad senior considerada en la recomendación.");
    }
  }

  return {
    score: blocked ? Math.max(score - 60, 0) : Math.min(score, 100),
    blocked,
    reasons
  };
}

function rankWalkersForDog(dog, walkers) {
  return walkers
    .map((walker) => {
      const match = buildMatchReasons(dog, walker);

      return {
        ...walker,
        Compatibilidad: match.score,
        Bloqueado: match.blocked,
        Razones: match.reasons
      };
    })
    .filter((walker) => !walker.Bloqueado && walker.Compatibilidad > 0)
    .sort((a, b) => b.Compatibilidad - a.Compatibilidad || Number(a.Tarifa || 0) - Number(b.Tarifa || 0));
}

module.exports = {
  rankWalkersForDog
};
