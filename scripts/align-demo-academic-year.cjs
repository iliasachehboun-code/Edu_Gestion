require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
 const teacher = await prisma.teacher.findFirst({ where: { user: { email: 'prof@ecole-demo.fr' } } });
 if (!teacher) throw new Error('Compte de démonstration introuvable.');
 const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const startYear = Number(today.slice(0,4)) - (Number(today.slice(5,7)) < 9 ? 1 : 0);
 const name = `${startYear}-${startYear+1}`;
 await prisma.$transaction(async tx => {
  const previous = await tx.academicYear.findFirst({ where: { schoolId: teacher.schoolId, isCurrent: true } });
  const current = await tx.academicYear.upsert({ where: { schoolId_name: { schoolId: teacher.schoolId, name } }, update: {}, create: { schoolId:teacher.schoolId,name,startDate:new Date(`${startYear}-09-01`),endDate:new Date(`${startYear+1}-08-31`),isCurrent:false } });
  if (previous && previous.id !== current.id) {
   const enrollments = await tx.enrollment.findMany({ where: { academicYearId:previous.id } });
   for (const e of enrollments) await tx.enrollment.upsert({ where: { studentId_academicYearId: { studentId:e.studentId,academicYearId:current.id } }, update: {}, create: { schoolId:teacher.schoolId,studentId:e.studentId,classId:e.classId,academicYearId:current.id } });
  }
  for (const [order,start,end] of [[1,`${startYear}-09-01`,`${startYear}-12-20`],[2,`${startYear+1}-01-05`,`${startYear+1}-03-28`],[3,`${startYear+1}-04-07`,`${startYear+1}-06-30`]]) {
   await tx.term.upsert({where:{academicYearId_order:{academicYearId:current.id,order}},update:{},create:{academicYearId:current.id,order,name:`Trimestre ${order}`,startDate:new Date(start),endDate:new Date(end)}});
  }
  await tx.academicYear.updateMany({where:{schoolId:teacher.schoolId,isCurrent:true,id:{not:current.id}},data:{isCurrent:false}});
  await tx.academicYear.update({where:{id:current.id},data:{isCurrent:true}});
  console.log(JSON.stringify({year:name,enrollments:await tx.enrollment.count({where:{academicYearId:current.id}}),sessions:await tx.scheduleEntry.count({where:{teacherId:teacher.id}})}));
 }, {timeout:20000});
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
