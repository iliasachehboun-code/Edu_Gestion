import { PrismaClient, GradeType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoPassword = "demo123";

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const demoHash = await bcrypt.hash(demoPassword, 10);

  await prisma.user.upsert({
    where: { email: "admin@school.app" },
    update: {},
    create: {
      email: "admin@school.app",
      passwordHash: adminHash,
      firstName: "Super",
      lastName: "Admin",
      globalRole: "SUPER_ADMIN",
    },
  });

  const school = await prisma.school.upsert({
    where: { slug: "ecole-demo" },
    update: {
      name: "École Démo",
      active: true,
      address: "12, avenue des Écoles",
      phone: "06.00.00.00.00",
      email: "contact@ecole-demo.fr",
    },
    create: {
      name: "École Démo",
      slug: "ecole-demo",
      address: "12, avenue des Écoles",
      phone: "06.00.00.00.00",
      email: "contact@ecole-demo.fr",
    },
  });

  await ensureUser({
    email: "directeur@ecole-demo.fr",
    firstName: "Marie",
    lastName: "Dupont",
    schoolId: school.id,
    role: "SCHOOL_ADMIN",
    passwordHash: demoHash,
  });

  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2025-2026" } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isCurrent: true,
    },
  });

  const termSpecs = [
    { name: "Trimestre 1", order: 1, start: "2025-09-01", end: "2025-12-20" },
    { name: "Trimestre 2", order: 2, start: "2026-01-05", end: "2026-03-28" },
    { name: "Trimestre 3", order: 3, start: "2026-04-07", end: "2026-06-30" },
  ];
  for (const t of termSpecs) {
    const existing = await prisma.term.findFirst({
      where: { academicYearId: year.id, order: t.order },
    });
    if (!existing) {
      await prisma.term.create({
        data: {
          academicYearId: year.id,
          name: t.name,
          order: t.order,
          startDate: new Date(t.start),
          endDate: new Date(t.end),
        },
      });
    }
  }
  const terms = await prisma.term.findMany({
    where: { academicYearId: year.id },
    orderBy: { order: "asc" },
  });
  const term1 = terms[0];

  const slotSpecs = [
    { label: "8h-9h", startTime: "08:00", endTime: "09:00", order: 1 },
    { label: "9h-10h", startTime: "09:00", endTime: "10:00", order: 2 },
    { label: "10h15-11h15", startTime: "10:15", endTime: "11:15", order: 3 },
    { label: "11h15-12h15", startTime: "11:15", endTime: "12:15", order: 4 },
    { label: "14h-15h", startTime: "14:00", endTime: "15:00", order: 5 },
    { label: "15h-16h", startTime: "15:00", endTime: "16:00", order: 6 },
  ];
  for (const s of slotSpecs) {
    await prisma.timeSlot.upsert({
      where: { schoolId_order: { schoolId: school.id, order: s.order } },
      update: {},
      create: { schoolId: school.id, ...s },
    });
  }
  const slots = await prisma.timeSlot.findMany({
    where: { schoolId: school.id },
    orderBy: { order: "asc" },
  });
  const slotByOrder = new Map(slots.map((s) => [s.order, s]));

  await prisma.student.deleteMany({ where: { schoolId: school.id } });
  await prisma.teacher.deleteMany({ where: { schoolId: school.id } });
  await prisma.parent.deleteMany({ where: { schoolId: school.id } });
  await prisma.scheduleEntry.deleteMany({ where: { schoolId: school.id } });
  await prisma.document.deleteMany({ where: { schoolId: school.id } });
  await prisma.libraryItem.deleteMany({ where: { schoolId: school.id } });
  await prisma.campusService.deleteMany({ where: { schoolId: school.id } });
  await prisma.notification.deleteMany({ where: { schoolId: school.id } });
  await prisma.feeType.deleteMany({ where: { schoolId: school.id } });
  await prisma.class.deleteMany({ where: { schoolId: school.id } });

  const sections = ["A", "B", "C", "D"];
  const levels = [
    { level: "6ème", birth: 2014 },
    { level: "5ème", birth: 2013 },
    { level: "4ème", birth: 2012 },
    { level: "3ème", birth: 2011 },
  ];
  const classSpecs = levels.flatMap((l) =>
    sections.map((section) => ({
      name: `${l.level} ${section}`,
      level: l.level,
      capacity: 30,
      birth: l.birth,
    }))
  );
  const classes: Record<string, { id: string }> = {};
  for (const c of classSpecs) {
    classes[c.name] = await prisma.class.upsert({
      where: { schoolId_name: { schoolId: school.id, name: c.name } },
      update: { level: c.level, capacity: c.capacity },
      create: {
        schoolId: school.id,
        name: c.name,
        level: c.level,
        capacity: c.capacity,
      },
    });
  }

  const subjectSpecs = [
    { name: "Mathématiques", code: "MATH", coefficient: 4 },
    { name: "Français", code: "FR", coefficient: 4 },
    { name: "Histoire-Géo", code: "HG", coefficient: 3 },
    { name: "Anglais", code: "ANG", coefficient: 3 },
    { name: "SVT", code: "SVT", coefficient: 2 },
    { name: "Physique-Chimie", code: "PC", coefficient: 3 },
    { name: "EPS", code: "EPS", coefficient: 1 },
  ];
  const subjects: Record<string, { id: string; coefficient: number }> = {};
  for (const s of subjectSpecs) {
    subjects[s.name] = await prisma.subject.upsert({
      where: { schoolId_name: { schoolId: school.id, name: s.name } },
      update: { code: s.code, coefficient: s.coefficient },
      create: { schoolId: school.id, ...s },
    });
  }

  const teacherSpecs = [
    { firstName: "Jean", lastName: "Martin", email: "prof@ecole-demo.fr", specialty: "Mathématiques" },
    { firstName: "Claire", lastName: "Moreau", email: "claire.moreau@ecole-demo.fr", specialty: "Français" },
    { firstName: "Ahmed", lastName: "Benali", email: "ahmed.benali@ecole-demo.fr", specialty: "Anglais" },
    { firstName: "Sophie", lastName: "Laurent", email: "sophie.laurent@ecole-demo.fr", specialty: "Histoire-Géo" },
    { firstName: "Lucas", lastName: "Petit", email: "lucas.petit@ecole-demo.fr", specialty: "SVT" },
    { firstName: "Inès", lastName: "Bernard", email: "ines.bernard@ecole-demo.fr", specialty: "Physique-Chimie" },
    { firstName: "Omar", lastName: "Diallo", email: "omar.diallo@ecole-demo.fr", specialty: "EPS" },
  ];
  const teachers: Record<string, { id: string }> = {};
  for (const t of teacherSpecs) {
    const user = await ensureUser({
      email: t.email,
      firstName: t.firstName,
      lastName: t.lastName,
      schoolId: school.id,
      role: "TEACHER",
      passwordHash: demoHash,
    });
    teachers[t.specialty] = await prisma.teacher.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        specialty: t.specialty,
        phone: "+33 6 10 20 30 40",
      },
    });
  }

  const rooms = ["Salle 12", "Salle 14", "Labo SVT", "Gymnase"];
  const roomIds: Record<string, string> = {};
  for (const name of rooms) {
    const room = await prisma.room.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name },
    });
    roomIds[name] = room.id;
  }

  const perClass = 28;
  const firstNames: [string, "M" | "F"][] = [
    ["Lucas", "M"], ["Emma", "F"], ["Noah", "M"], ["Léa", "F"], ["Adam", "M"],
    ["Chloé", "F"], ["Yanis", "M"], ["Inès", "F"], ["Hugo", "M"], ["Manon", "F"],
    ["Ethan", "M"], ["Jade", "F"], ["Louis", "M"], ["Sarah", "F"], ["Maya", "F"],
    ["Tom", "M"], ["Lina", "F"], ["Rayan", "M"], ["Zoé", "F"], ["Eliott", "M"],
    ["Nina", "F"], ["Paul", "M"], ["Amina", "F"], ["Jules", "M"], ["Camille", "F"],
    ["Sami", "M"], ["Léna", "F"], ["Théo", "M"], ["Nora", "F"], ["Mehdi", "M"],
  ];
  const lastNames = [
    "Bernard", "Garcia", "Rousseau", "Cohen", "Lambert", "Morel", "Fabre",
    "Blanc", "Roux", "Perez", "Nicolas", "Mercier", "Fontaine", "Diallo",
    "Robert", "Girard", "Henry", "Bonnet", "Chevalier", "Lefebvre", "Garnier",
    "Traoré", "Barbier", "Denis", "Khelifi", "Marchand", "Duval", "Martin",
  ];
  const pinned: Record<string, [string, string, "M" | "F"]> = {
    "6ème A-0": ["Lucas", "Bernard", "M"],
    "6ème A-1": ["Emma", "Bernard", "F"],
    "6ème A-2": ["Noah", "Garcia", "M"],
    "6ème A-3": ["Léa", "Rousseau", "F"],
    "5ème A-0": ["Maya", "Diallo", "F"],
  };

  const plan: {
    matricule: string;
    firstName: string;
    lastName: string;
    gender: string;
    className: string;
    classId: string;
    birth: number;
  }[] = [];
  let matricule = 1;
  for (const spec of classSpecs) {
    for (let seat = 0; seat < perClass; seat += 1) {
      const forced = pinned[`${spec.name}-${seat}`];
      const index = matricule - 1;
      const picked = firstNames[index % firstNames.length];
      const first = forced?.[0] ?? picked[0];
      const gender = forced?.[2] ?? picked[1];
      const last =
        forced?.[1] ??
        lastNames[Math.floor(index / firstNames.length) % lastNames.length];
      plan.push({
        matricule: `STU-${String(matricule).padStart(3, "0")}`,
        firstName: first,
        lastName: last,
        gender,
        className: spec.name,
        classId: classes[spec.name].id,
        birth: spec.birth,
      });
      matricule += 1;
    }
  }

  await prisma.student.createMany({
    data: plan.map((p) => ({
      schoolId: school.id,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      matricule: p.matricule,
      dateOfBirth: new Date(
        p.birth,
        Number(p.matricule.slice(4)) % 12,
        (Number(p.matricule.slice(4)) % 27) + 1
      ),
      email: `${p.matricule.toLowerCase()}@eleve.demo`,
      address: "Lyon",
    })),
  });

  const dbStudents = await prisma.student.findMany({
    where: { schoolId: school.id },
  });
  const byMatricule = new Map(dbStudents.map((s) => [s.matricule, s]));
  const createdStudents = plan.map((p) => {
    const row = byMatricule.get(p.matricule);
    if (!row) throw new Error(`Élève manquant ${p.matricule}`);
    return { ...p, id: row.id };
  });

  await prisma.enrollment.createMany({
    data: createdStudents.map((s) => ({
      schoolId: school.id,
      studentId: s.id,
      classId: s.classId,
      academicYearId: year.id,
    })),
  });

  const parentSpecs = [
    {
      email: "parent@ecole-demo.fr",
      firstName: "Sophie",
      lastName: "Bernard",
      phone: "+33 6 12 34 56 78",
      children: ["Lucas Bernard", "Emma Bernard"],
      relation: "mère",
    },
    {
      email: "karim.garcia@ecole-demo.fr",
      firstName: "Karim",
      lastName: "Garcia",
      phone: "+33 6 22 11 00 33",
      children: ["Noah Garcia"],
      relation: "père",
    },
    {
      email: "nathalie.rousseau@ecole-demo.fr",
      firstName: "Nathalie",
      lastName: "Rousseau",
      phone: "+33 6 98 76 54 32",
      children: ["Léa Rousseau"],
      relation: "mère",
    },
    {
      email: "marc.diallo@ecole-demo.fr",
      firstName: "Marc",
      lastName: "Diallo",
      phone: "+33 6 45 67 89 01",
      children: ["Maya Diallo"],
      relation: "père",
    },
  ];

  let sophieUserId = "";
  for (const p of parentSpecs) {
    const user = await ensureUser({
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      schoolId: school.id,
      role: "PARENT",
      passwordHash: demoHash,
    });
    if (p.email === "parent@ecole-demo.fr") sophieUserId = user.id;
    const parent = await prisma.parent.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
      },
    });
    for (const childName of p.children) {
      const child = createdStudents.find(
        (s) => `${s.firstName} ${s.lastName}` === childName
      );
      if (!child) continue;
      await prisma.parentStudent.create({
        data: { parentId: parent.id, studentId: child.id, relation: p.relation },
      });
    }
  }

  const teachClasses = classSpecs.map((c) => c.name);
  for (const className of teachClasses) {
    for (const subjectName of Object.keys(subjects)) {
      const teacher = teachers[subjectName];
      if (!teacher) continue;
      await prisma.teacherAssignment.create({
        data: {
          schoolId: school.id,
          teacherId: teacher.id,
          classId: classes[className].id,
          subjectId: subjects[subjectName].id,
        },
      });
    }
  }

  const gradedSubjects = ["Mathématiques", "Français", "Anglais", "Histoire-Géo", "SVT"];
  const gradeRows: {
    schoolId: string;
    studentId: string;
    subjectId: string;
    termId: string;
    type: GradeType;
    title: string;
    score: number;
    maxScore: number;
    coefficient: number;
  }[] = [];
  createdStudents.forEach((student, index) => {
    gradedSubjects.forEach((subjectName, subjectIndex) => {
      const control = 8 + ((index + subjectIndex * 3) % 12);
      gradeRows.push({
        schoolId: school.id,
        studentId: student.id,
        subjectId: subjects[subjectName].id,
        termId: term1.id,
        type: subjectIndex % 2 === 0 ? "CONTROLE" : "EXAMEN",
        title: "Contrôle 1",
        score: control,
        maxScore: 20,
        coefficient: 2,
      });
      gradeRows.push({
        schoolId: school.id,
        studentId: student.id,
        subjectId: subjects[subjectName].id,
        termId: term1.id,
        type: "DEVOIR",
        title: "Devoir maison",
        score: Math.min(20, control + 1),
        maxScore: 20,
        coefficient: 1,
      });
    });
  });
  for (let i = 0; i < gradeRows.length; i += 200) {
    await prisma.grade.createMany({ data: gradeRows.slice(i, i + 200) });
  }

  for (const student of createdStudents.filter((s) => s.className === "6ème A")) {
    const lines: { subjectId: string; average: number; coefficient: number }[] = [];
    for (const subjectName of gradedSubjects) {
      const grades = await prisma.grade.findMany({
        where: {
          studentId: student.id,
          subjectId: subjects[subjectName].id,
          termId: term1.id,
        },
      });
      let weighted = 0;
      let coef = 0;
      for (const g of grades) {
        weighted += (g.score / g.maxScore) * 20 * g.coefficient;
        coef += g.coefficient;
      }
      if (!coef) continue;
      lines.push({
        subjectId: subjects[subjectName].id,
        average: Math.round((weighted / coef) * 10) / 10,
        coefficient: subjects[subjectName].coefficient,
      });
    }
    const general =
      lines.reduce((sum, l) => sum + l.average * l.coefficient, 0) /
      lines.reduce((sum, l) => sum + l.coefficient, 0);
    const card = await prisma.reportCard.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        academicYearId: year.id,
        termId: term1.id,
        average: Math.round(general * 10) / 10,
        published: true,
        publishedAt: new Date("2025-12-18"),
        appreciation: "Trimestre sérieux. Poursuivre les efforts.",
      },
    });
    await prisma.reportCardLine.createMany({
      data: lines.map((l) => ({ reportCardId: card.id, ...l })),
    });
  }

  const grid: [string, number, number, string, string][] = [
    ["6ème A", 1, 1, "Mathématiques", "Salle 12"],
    ["6ème A", 1, 2, "Français", "Salle 12"],
    ["6ème A", 2, 1, "Anglais", "Salle 14"],
    ["6ème A", 2, 2, "Histoire-Géo", "Salle 14"],
    ["6ème A", 3, 1, "SVT", "Labo SVT"],
    ["6ème A", 3, 2, "Physique-Chimie", "Labo SVT"],
    ["6ème A", 4, 1, "EPS", "Gymnase"],
    ["6ème A", 4, 2, "Mathématiques", "Salle 12"],
    ["6ème A", 5, 1, "Français", "Salle 12"],
    ["6ème A", 5, 2, "Anglais", "Salle 14"],
    ["5ème A", 1, 3, "Mathématiques", "Salle 14"],
    ["5ème A", 1, 4, "Français", "Salle 14"],
    ["5ème A", 2, 3, "Anglais", "Salle 12"],
    ["5ème A", 2, 4, "Histoire-Géo", "Salle 12"],
    ["5ème A", 3, 3, "SVT", "Labo SVT"],
    ["5ème A", 3, 4, "Physique-Chimie", "Labo SVT"],
    ["5ème A", 4, 3, "EPS", "Gymnase"],
    ["5ème A", 4, 5, "Mathématiques", "Salle 14"],
    ["5ème A", 5, 3, "Français", "Salle 12"],
    ["5ème A", 5, 4, "Anglais", "Salle 12"],
    ["6ème B", 1, 5, "Mathématiques", "Salle 12"],
    ["6ème B", 2, 5, "Français", "Salle 12"],
    ["6ème B", 3, 5, "Anglais", "Salle 14"],
    ["6ème B", 4, 6, "Histoire-Géo", "Salle 14"],
    ["6ème B", 5, 5, "EPS", "Gymnase"],
  ];
  for (const [className, day, order, subjectName, room] of grid) {
    const slot = slotByOrder.get(order);
    if (!slot) continue;
    await prisma.scheduleEntry.create({
      data: {
        schoolId: school.id,
        classId: classes[className].id,
        subjectId: subjects[subjectName].id,
        teacherId: teachers[subjectName].id,
        timeSlotId: slot.id,
        dayOfWeek: day,
        roomId: roomIds[room],
      },
    });
  }

  const absenceDates = [
    new Date("2026-11-02T12:00:00"),
    new Date("2026-11-03T12:00:00"),
    new Date("2026-11-04T12:00:00"),
  ];
  await prisma.attendance.createMany({
    data: createdStudents.slice(0, 36).map((student, i) => {
      const status = i % 3 === 0 ? "ABSENT" : i % 3 === 1 ? "LATE" : "EXCUSED";
      return {
        schoolId: school.id,
        studentId: student.id,
        classId: student.classId,
        date: absenceDates[i % absenceDates.length],
        status: status as "ABSENT" | "LATE" | "EXCUSED",
        reason:
          status === "ABSENT"
            ? "Maladie"
            : status === "LATE"
              ? "Transport"
              : "Rendez-vous médical",
        justified: status === "EXCUSED",
      };
    }),
  });

  const tuition = await prisma.feeType.create({
    data: {
      schoolId: school.id,
      name: "Frais de scolarité",
      description: "Frais annuels",
      amount: 2400,
    },
  });
  const canteen = await prisma.feeType.create({
    data: {
      schoolId: school.id,
      name: "Cantine",
      description: "Forfait trimestre",
      amount: 420,
    },
  });
  const transport = await prisma.feeType.create({
    data: {
      schoolId: school.id,
      name: "Transport",
      description: "Ligne scolaire",
      amount: 280,
    },
  });

  const feeRows = createdStudents.flatMap((student, i) => {
    const rows: {
      schoolId: string;
      studentId: string;
      feeTypeId: string;
      academicYearId: string;
      amount: number;
      dueDate: Date;
      status: "PAID" | "PARTIAL" | "OVERDUE" | "PENDING";
    }[] = [
      {
        schoolId: school.id,
        studentId: student.id,
        feeTypeId: tuition.id,
        academicYearId: year.id,
        amount: 2400,
        dueDate: new Date("2025-10-15"),
        status: i % 4 === 0 ? "PAID" : i % 4 === 1 ? "PARTIAL" : i % 4 === 2 ? "OVERDUE" : "PENDING",
      },
    ];
    if (i % 2 === 0) {
      rows.push({
        schoolId: school.id,
        studentId: student.id,
        feeTypeId: canteen.id,
        academicYearId: year.id,
        amount: 420,
        dueDate: new Date("2025-11-30"),
        status: "PENDING",
      });
    }
    if (i % 3 === 0) {
      rows.push({
        schoolId: school.id,
        studentId: student.id,
        feeTypeId: transport.id,
        academicYearId: year.id,
        amount: 280,
        dueDate: new Date("2025-11-15"),
        status: "PAID",
      });
    }
    return rows;
  });
  for (let i = 0; i < feeRows.length; i += 200) {
    await prisma.studentFee.createMany({ data: feeRows.slice(i, i + 200) });
  }
  const storedFees = await prisma.studentFee.findMany({
    where: { schoolId: school.id, status: { in: ["PAID", "PARTIAL"] } },
  });
  await prisma.payment.createMany({
    data: storedFees.map((fee) => ({
      schoolId: school.id,
      studentFeeId: fee.id,
      amount: fee.status === "PAID" ? fee.amount : 800,
      method: fee.status === "PAID" ? "transfer" : "cash",
      paidAt: new Date("2025-10-08"),
      note: fee.status === "PARTIAL" ? "Acompte" : null,
    })),
  });

  await prisma.document.createMany({
    data: [
      { schoolId: school.id, title: "Règlement intérieur 2025-2026", category: "Légal", note: "Version signée en septembre" },
      { schoolId: school.id, title: "Projet d'établissement", category: "Pédagogique" },
      { schoolId: school.id, title: "Calendrier des examens", category: "Pédagogique", note: "Trimestre 1" },
      { schoolId: school.id, title: "Budget prévisionnel", category: "Financier" },
    ],
  });

  await prisma.libraryItem.createMany({
    data: [
      { schoolId: school.id, title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", copies: 12, available: 7 },
      { schoolId: school.id, title: "Mathématiques 6e", author: "Hachette", copies: 30, available: 18 },
      { schoolId: school.id, title: "Histoire du monde", author: "Collectif", copies: 8, available: 3 },
      { schoolId: school.id, title: "English File Beginner", author: "Oxford", copies: 20, available: 11 },
      { schoolId: school.id, title: "SVT Cycle 3", author: "Bordas", copies: 15, available: 9 },
    ],
  });

  await prisma.campusService.createMany({
    data: [
      { schoolId: school.id, kind: "cantine", name: "Menu du midi", detail: "Entrée, plat, dessert — 4 jours", price: 4.5 },
      { schoolId: school.id, kind: "cantine", name: "Panier repas", detail: "Sans porc / végétarien sur demande", price: 4.5 },
      { schoolId: school.id, kind: "transport", name: "Ligne A — matin", detail: "Mairie, 7h15 → école, 7h45", price: 35 },
      { schoolId: school.id, kind: "transport", name: "Ligne B — soir", detail: "École, 16h30 → Gare, 17h05", price: 35 },
    ],
  });

  if (sophieUserId) {
    await prisma.notification.createMany({
      data: [
        {
          schoolId: school.id,
          userId: sophieUserId,
          type: "GRADE",
          title: "Bulletin disponible",
          message: "Le bulletin du trimestre 1 de Lucas Bernard est publié.",
          link: `/s/${school.id}/parent/bulletins`,
        },
        {
          schoolId: school.id,
          userId: sophieUserId,
          type: "ATTENDANCE",
          title: "Absence signalée",
          message: "Lucas Bernard : absent(e) le 02/11/2026.",
          link: `/s/${school.id}/parent/attendance`,
        },
        {
          schoolId: school.id,
          userId: sophieUserId,
          type: "PAYMENT",
          title: "Frais de cantine",
          message: "Un forfait cantine de 420 € est à régler.",
          link: `/s/${school.id}/parent/payments`,
          read: false,
        },
      ],
    });
  }

  await prisma.school.upsert({
    where: { slug: "college-oliviers" },
    update: {},
    create: {
      name: "Collège des Oliviers",
      slug: "college-oliviers",
      address: "8 avenue des Écoles, Marseille",
      phone: "+33 4 91 00 11 22",
      email: "contact@oliviers.fr",
    },
  });
  await prisma.school.upsert({
    where: { slug: "centre-atlas" },
    update: {},
    create: {
      name: "Centre de formation Atlas",
      slug: "centre-atlas",
      address: "22 boulevard du Savoir, Lille",
      phone: "+33 3 20 44 55 66",
      email: "contact@atlas-formation.fr",
    },
  });

  const [students, teachersCount, grades, fees] = await Promise.all([
    prisma.student.count({ where: { schoolId: school.id } }),
    prisma.teacher.count({ where: { schoolId: school.id } }),
    prisma.grade.count({ where: { schoolId: school.id } }),
    prisma.studentFee.count({ where: { schoolId: school.id } }),
  ]);

  console.log("Jeu de données démo chargé");
  console.log(`École Démo : ${students} étudiants, ${teachersCount} enseignants, ${grades} notes, ${fees} frais`);
  console.log("SuperAdmin : admin@school.app / admin123");
  console.log("Directeur  : directeur@ecole-demo.fr / demo123");
  console.log("Enseignant : prof@ecole-demo.fr / demo123");
  console.log("Parent     : parent@ecole-demo.fr / demo123");
}

async function ensureUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  role: "SCHOOL_ADMIN" | "TEACHER" | "PARENT";
  passwordHash: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: { firstName: params.firstName, lastName: params.lastName },
    create: {
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      passwordHash: params.passwordHash,
    },
  });
  await prisma.membership.upsert({
    where: {
      userId_schoolId_role: {
        userId: user.id,
        schoolId: params.schoolId,
        role: params.role,
      },
    },
    update: {},
    create: {
      userId: user.id,
      schoolId: params.schoolId,
      role: params.role,
    },
  });
  return user;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
