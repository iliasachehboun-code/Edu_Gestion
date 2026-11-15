import { normalizeEvalDay } from "./student-evaluations";

export type SubjectLanguage = "en" | "ar" | "es" | "fr";

export function detectSubjectLanguage(subjectName: string): SubjectLanguage {
  const s = subjectName.toLowerCase();
  if (s.includes("angl") || s.includes("english")) return "en";
  if (s.includes("arab") || s.includes("عرب") || s.includes("islam")) return "ar";
  if (s.includes("espagn") || s.includes("spanis") || s.includes("lengua")) return "es";
  return "fr";
}

export interface EvaluationI18n {
  lang: SubjectLanguage;
  dir: "ltr" | "rtl";
  subjectDisplayName: string;
  filterDisplayName: string;
  nextBadge: string;
  upcomingTitle: string;
  upcomingCountLabel: (count: number) => string;
  evalTypes: Record<string, string>;
  coeffLabel: string;
  durationLabel: (min: number) => string;
  timeLabel: (time: string, min: number) => string;
  roomLabel: (room: string) => string;
  toReviseHeader: string;
  instructionsHeader: string;
  getCountdown: (diffDays: number) => { label: string; color: string };
  formatDayParts: (date: Date) => {
    dayName: string;
    dayNum: string | number;
    monthName: string;
    fullDate: string;
  };
}

export function getEvaluationI18n(subjectName: string): EvaluationI18n {
  const lang = detectSubjectLanguage(subjectName);

  if (lang === "en") {
    return {
      lang: "en",
      dir: "ltr",
      subjectDisplayName: "English",
      filterDisplayName: "Anglais · English",
      nextBadge: "Upcoming Assessment",
      upcomingTitle: "Upcoming Tests & Exams",
      upcomingCountLabel: (count) =>
        count > 1 ? `${count} upcoming assessments` : "1 upcoming assessment",
      evalTypes: {
        CONTROLE: "Continuous Assessment",
        DEVOIR_SUR_TABLE: "Term Exam",
        DEVOIR_COMMUN: "Common Assessment",
        EXAMEN_BLANC: "Mock Exam",
        TP: "Lab Practical Test",
        TP_NOTE: "Lab Practical Test",
        INTERROGATION: "Oral Test / Pop Quiz",
      },
      coeffLabel: "Weight:",
      durationLabel: (min) => `Duration: ${min} mins`,
      timeLabel: (time, min) => `${time} (${min} mins)`,
      roomLabel: (room) => `Room: ${room.replace(/salle\s*/i, "").replace(/room\s*/i, "")}`,
      toReviseHeader: "📖 Topics to revise:",
      instructionsHeader: "🎒 Instructions & materials:",
      getCountdown: (diffDays) => {
        if (diffDays <= 0) {
          return { label: "Today!", color: "bg-red-500 text-white font-black animate-pulse" };
        }
        if (diffDays === 1) {
          return { label: "Tomorrow!", color: "bg-amber-500 text-white font-bold" };
        }
        if (diffDays === 2) {
          return { label: "In 2 days", color: "bg-blue-600 text-white font-bold" };
        }
        return { label: `In ${diffDays} days`, color: "bg-[#e8f1fc] text-[#002b5b] font-bold" };
      },
      formatDayParts: (date) => {
        const d = normalizeEvalDay(date);
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
        const fullDate = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        return { dayName, dayNum, monthName, fullDate };
      },
    };
  }

  if (lang === "ar") {
    return {
      lang: "ar",
      dir: "rtl",
      subjectDisplayName: "اللغة العربية",
      filterDisplayName: "Arabe · اللغة العربية",
      nextBadge: "التقويم القادم",
      upcomingTitle: "الفروض والامتحانات القادمة",
      upcomingCountLabel: (count) =>
        count > 1 ? `${count} اختبارات قادمة` : "اختبار قادم واحد",
      evalTypes: {
        CONTROLE: "مراقبة مستمرة",
        DEVOIR_SUR_TABLE: "فرض محروس",
        DEVOIR_COMMUN: "فرض موحد",
        EXAMEN_BLANC: "امتحان تجريبي",
        TP: "أشغال تطبيقية",
        TP_NOTE: "أشغال تطبيقية",
        INTERROGATION: "اختبار كتابي قصير",
      },
      coeffLabel: "المعامل :",
      durationLabel: (min) => `المدة : ${min} دقيقة`,
      timeLabel: (time, min) => `${time} (${min} دقيقة)`,
      roomLabel: (room) => `القاعة : ${room.replace(/salle\s*/i, "").replace(/القاعة\s*/i, "")}`,
      toReviseHeader: "📖 الدروس المقررة للمراجعة :",
      instructionsHeader: "🎒 تعليمات وتوجيهات هامة :",
      getCountdown: (diffDays) => {
        if (diffDays <= 0) {
          return { label: "اليوم !", color: "bg-red-500 text-white font-black animate-pulse" };
        }
        if (diffDays === 1) {
          return { label: "غداً !", color: "bg-amber-500 text-white font-bold" };
        }
        if (diffDays === 2) {
          return { label: "بعد يومين", color: "bg-blue-600 text-white font-bold" };
        }
        return { label: `بقي ${diffDays} أيام`, color: "bg-[#e8f1fc] text-[#002b5b] font-bold" };
      },
      formatDayParts: (date) => {
        const d = normalizeEvalDay(date);
        const dayName = d.toLocaleDateString("ar-MA", { weekday: "short" });
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString("ar-MA", { month: "short" });
        const fullDate = d.toLocaleDateString("ar-MA", { weekday: "long", day: "numeric", month: "long" });
        return { dayName, dayNum, monthName, fullDate };
      },
    };
  }

  if (lang === "es") {
    return {
      lang: "es",
      dir: "ltr",
      subjectDisplayName: "Español",
      filterDisplayName: "Espagnol · Español",
      nextBadge: "Próxima Evaluación",
      upcomingTitle: "Exámenes y Controles",
      upcomingCountLabel: (count) =>
        count > 1 ? `${count} evaluaciones próximas` : "1 evaluación próxima",
      evalTypes: {
        CONTROLE: "Control Continuo",
        DEVOIR_SUR_TABLE: "Examen Escrito",
        DEVOIR_COMMUN: "Examen Común",
        EXAMEN_BLANC: "Examen de Prueba",
        TP: "Práctica Evaluada",
        TP_NOTE: "Práctica Evaluada",
        INTERROGATION: "Cuestionario Rápido",
      },
      coeffLabel: "Coef.:",
      durationLabel: (min) => `Duración: ${min} mins`,
      timeLabel: (time, min) => `${time} (${min} mins)`,
      roomLabel: (room) => `Sala: ${room.replace(/salle\s*/i, "").replace(/sala\s*/i, "")}`,
      toReviseHeader: "📖 Temas para repasar:",
      instructionsHeader: "🎒 Material obligatorio y normas:",
      getCountdown: (diffDays) => {
        if (diffDays <= 0) {
          return { label: "¡Hoy!", color: "bg-red-500 text-white font-black animate-pulse" };
        }
        if (diffDays === 1) {
          return { label: "¡Mañana!", color: "bg-amber-500 text-white font-bold" };
        }
        if (diffDays === 2) {
          return { label: "En 2 días", color: "bg-blue-600 text-white font-bold" };
        }
        return { label: `En ${diffDays} días`, color: "bg-[#e8f1fc] text-[#002b5b] font-bold" };
      },
      formatDayParts: (date) => {
        const d = normalizeEvalDay(date);
        const dayName = d.toLocaleDateString("es-ES", { weekday: "short" }).toUpperCase();
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();
        const fullDate = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
        return { dayName, dayNum, monthName, fullDate };
      },
    };
  }

  // French (default)
  return {
    lang: "fr",
    dir: "ltr",
    subjectDisplayName: subjectName,
    filterDisplayName: subjectName,
    nextBadge: "Prochain contrôle",
    upcomingTitle: "Contrôles à venir",
    upcomingCountLabel: (count) =>
      count > 1 ? `${count} épreuves à venir` : "1 épreuve à venir",
    evalTypes: {
      CONTROLE: "Contrôle Continu",
      DEVOIR_SUR_TABLE: "Devoir sur Table",
      DEVOIR_COMMUN: "Devoir Commun",
      EXAMEN_BLANC: "Examen Blanc",
      TP: "TP Noté",
      TP_NOTE: "TP Noté",
      INTERROGATION: "Interrogation Écrite",
    },
    coeffLabel: "Coeff. :",
    durationLabel: (min) => `Durée : ${min} minutes`,
    timeLabel: (time, min) => `${time} (${min} min)`,
    roomLabel: (room) => `Salle : ${room}`,
    toReviseHeader: "📖 À réviser :",
    instructionsHeader: "🎒 À ne pas oublier :",
    getCountdown: (diffDays) => {
      if (diffDays <= 0) {
        return { label: "Aujourd'hui !", color: "bg-red-500 text-white font-black animate-pulse" };
      }
      if (diffDays === 1) {
        return { label: "Demain !", color: "bg-amber-500 text-white font-bold" };
      }
      if (diffDays === 2) {
        return { label: "Dans 2 jours", color: "bg-blue-600 text-white font-bold" };
      }
      return { label: `Dans ${diffDays} jours`, color: "bg-[#e8f1fc] text-[#002b5b] font-bold" };
    },
    formatDayParts: (date) => {
      const d = normalizeEvalDay(date);
      const dayName = d.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase().replace(".", "");
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase().replace(".", "");
      const fullDate = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      return { dayName, dayNum, monthName, fullDate };
    },
  };
}
