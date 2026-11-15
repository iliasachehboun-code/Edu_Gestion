/* Run against a local dev server: node scripts/verify-teacher.cjs */
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {randomBytes,createHash}=require('node:crypto');
const fs=require('node:fs');
const prisma=new PrismaClient();
const root=process.env.TEST_BASE_URL||'http://localhost:3000';
const key=`teacher-check-${randomBytes(5).toString('hex')}`;
const users=[];
let school,teacher;
(async()=>{
 try {
  school=await prisma.school.create({data:{name:'Temporary teacher verification',slug:key}});
  const user=await prisma.user.create({data:{email:`${key}@example.test`,firstName:'Test',lastName:'Teacher',passwordHash:'not-a-login-password'}});users.push(user.id);
  await prisma.membership.create({data:{schoolId:school.id,userId:user.id,role:'TEACHER'}});
  teacher=await prisma.teacher.create({data:{schoolId:school.id,userId:user.id,firstName:'Test',lastName:'Teacher'}});
  const year=await prisma.academicYear.create({data:{schoolId:school.id,name:key,startDate:new Date('2026-09-01'),endDate:new Date('2027-07-01'),isCurrent:true}});
  const group=await prisma.class.create({data:{schoolId:school.id,name:'Test group'}});
  const subject=await prisma.subject.create({data:{schoolId:school.id,name:'Test module'}});
  const assignment=await prisma.teacherAssignment.create({data:{schoolId:school.id,teacherId:teacher.id,classId:group.id,subjectId:subject.id}});
  const student=await prisma.student.create({data:{schoolId:school.id,firstName:'Test',lastName:'Student'}});
  await prisma.enrollment.create({data:{schoolId:school.id,studentId:student.id,classId:group.id,academicYearId:year.id}});
  const entries=[];
  for(let i=0;i<2;i++){
   const slot=await prisma.timeSlot.create({data:{schoolId:school.id,label:`Test ${i}`,startTime:`${10+i}:00`,endTime:`${11+i}:00`,order:i}});
   entries.push(await prisma.scheduleEntry.create({data:{schoolId:school.id,teacherId:teacher.id,classId:group.id,subjectId:subject.id,timeSlotId:slot.id,dayOfWeek:0}}));
  }
  const token=randomBytes(32).toString('hex');
  await prisma.session.create({data:{tokenHash:createHash('sha256').update(token).digest('hex'),userId:user.id,expiresAt:new Date(Date.now()+600000)}});
  const cookie=`school_session=${token}`;
  const path=`${root}/s/${school.id}/teacher`;
  for(const suffix of ['', '/calendar','/courses','/students','/marks',`/courses/${assignment.id}`]) {
   const r=await fetch(path+suffix,{headers:{cookie}});const body=await r.text();
   assert.equal(r.status,200,`Page ${suffix}`);assert.ok(!body.includes('Internal Server Error'));
   console.log(`PASS teacher${suffix||' dashboard'} HTTP 200`);
  }
  const manifest=JSON.parse(fs.readFileSync('.next/dev/server/server-reference-manifest.json','utf8'));
  const actionId=name=>Object.entries(manifest.node).find(([,v])=>v.exportedName===name)?.[0];
  async function action(name,args){
   const r=await fetch(path,{method:'POST',headers:{cookie,'Next-Action':actionId(name),'Content-Type':'text/plain;charset=UTF-8',Origin:root},body:JSON.stringify(args)});
   return {status:r.status,body:await r.text()};
  }
  const day='2026-11-08';
  let result=await action('saveTeacherSession',[school.id,entries[0].id,day,[{studentId:student.id,status:'PRESENT'}]]);
  assert.ok(result.body.includes('"success":true'),result.body);
  result=await action('saveTeacherSession',[school.id,entries[1].id,day,[{studentId:student.id,status:'ABSENT'}]]);
  assert.ok(result.body.includes('"success":true'),result.body);
  let records=await prisma.attendance.findMany({where:{teacherId:teacher.id},orderBy:{date:'asc'}});
  assert.equal(records.length,2);assert.equal(records[0].status,'PRESENT');assert.equal(records[1].status,'ABSENT');
  assert.equal(await prisma.teacherLesson.count({where:{teacherId:teacher.id}}),2);
  console.log('PASS two sessions on the same day preserve separate attendance');
  result=await action('saveTeacherSession',[school.id,entries[0].id,day,[{studentId:student.id,status:'LATE'}]]);
  assert.ok(result.body.includes('Cet appel est'));
  assert.equal(await prisma.attendance.count({where:{teacherId:teacher.id}}),2);
  assert.equal(await prisma.teacherLesson.count({where:{teacherId:teacher.id}}),2);
  result=await action('getTeacherSession',[school.id,entries[0].id,day]);assert.ok(result.body.includes('PRESENT'));assert.ok(result.body.includes('\"locked\":true'));
  console.log('PASS validated attendance stays locked on reload and rejects edits');
  for(const args of [
    [school.id,'not-owned',day,[{studentId:student.id,status:'PRESENT'}]],
    [school.id,entries[0].id,day,[{studentId:'not-enrolled',status:'PRESENT'}]],
    [school.id,entries[0].id,day,[{studentId:student.id,status:'INVALID'}]],
    [school.id,entries[0].id,'2026-11-09',[{studentId:student.id,status:'PRESENT'}]],
    [school.id,entries[0].id,'2027-02-07',[{studentId:student.id,status:'PRESENT'}]],
  ]){result=await action('saveTeacherSession',args);assert.ok(result.body.includes('"error":'),result.body);}
  assert.equal(await prisma.attendance.count({where:{teacherId:teacher.id}}),2);
  console.log('PASS invalid student, slot, status, weekday and future date rejected');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const lateSlot=await prisma.timeSlot.create({data:{schoolId:school.id,label:'Before opening test',startTime:'23:59',endTime:'00:59',order:99}});
  const lateEntry=await prisma.scheduleEntry.create({data:{schoolId:school.id,teacherId:teacher.id,classId:group.id,subjectId:subject.id,timeSlotId:lateSlot.id,dayOfWeek:new Date(`${today}T12:00:00Z`).getUTCDay()}});
  result=await action('saveTeacherSession',[school.id,lateEntry.id,today,[{studentId:student.id,status:'PRESENT'}]]);
  assert.ok(result.body.includes('après 15 minutes'),result.body);
  assert.equal(await prisma.teacherLesson.count({where:{scheduleEntryId:lateEntry.id}}),0);
  console.log('PASS server rejects attendance before the 15-minute opening');
  const {encodeReply}=require('next/dist/compiled/react-server-dom-webpack/client.node');
  async function formAction(name,form,targetAssignment=assignment.id){
   const body=await encodeReply([school.id,targetAssignment,form]);
   const r=await fetch(name==='saveTeacherExam'?path+'/marks':path,{method:'POST',headers:{cookie,'Next-Action':actionId(name),Origin:root},body});
   return {status:r.status,body:await r.text()};
  }
  for(const kind of ['lecture','exam','announcement','resource','assignment']){
   const form=new FormData();form.set('kind',kind);form.set('title',`Test ${kind}`);form.set('body','Temporary content');form.set('url','https://example.com/support');
   result=await formAction('saveCourseContent',form);assert.equal(result.status,200,result.body);
  }
  assert.equal(await prisma.courseContent.count({where:{assignmentId:assignment.id}}),5);
  const form=new FormData();form.set('plannedSessions','30');
  result=await formAction('setCourseTarget',form);assert.equal(result.status,200,result.body);
  assert.equal((await prisma.teacherAssignment.findUnique({where:{id:assignment.id}})).plannedSessions,30);
  console.log('PASS all five content kinds persist and course target updates');
  const term=await prisma.term.create({data:{academicYearId:year.id,name:'Test exam term',order:1,startDate:year.startDate,endDate:year.endDate}});
  const examForm=new FormData();
  for(const [name,value] of Object.entries({termId:term.id,title:'Group examination',maxScore:'20',coefficient:'2',studentId:student.id,[`score_${student.id}`]:'0'}))examForm.set(name,value);
  result=await formAction('saveTeacherExam',examForm);assert.ok(result.body.includes('note(s) enregistrée'),result.body);
  let examGrades=await prisma.grade.findMany({where:{schoolId:school.id}});assert.equal(examGrades.length,1);assert.equal(examGrades[0].score,0);
  examForm.set(`score_${student.id}`,'18');
  result=await formAction('saveTeacherExam',examForm);assert.ok(result.body.includes('note(s) enregistrée'),result.body);
  examGrades=await prisma.grade.findMany({where:{schoolId:school.id}});assert.equal(examGrades.length,1);assert.equal(examGrades[0].score,18);
  examForm.set(`score_${student.id}`,'25');result=await formAction('saveTeacherExam',examForm);assert.ok(result.body.includes('"error":'),result.body);
  examForm.set('studentId','outside-group');result=await formAction('saveTeacherExam',examForm);assert.ok(result.body.includes('hors de ce groupe'),result.body);
  result=await formAction('saveTeacherExam',examForm,'foreign-assignment');assert.ok(result.body.includes('pas affecté'),result.body);
  assert.equal((await prisma.grade.findFirst({where:{schoolId:school.id}})).score,18);
  console.log('PASS group exam: zero mark, update without duplicate, invalid marks and foreign students/assignments rejected');
  const otherGroup=await prisma.class.create({data:{schoolId:school.id,name:'Other exam group'}});
  const otherAssignment=await prisma.teacherAssignment.create({data:{schoolId:school.id,teacherId:teacher.id,classId:otherGroup.id,subjectId:subject.id}});
  const otherStudent=await prisma.student.create({data:{schoolId:school.id,firstName:'Separate',lastName:'Roster'}});
  await prisma.enrollment.create({data:{schoolId:school.id,academicYearId:year.id,classId:otherGroup.id,studentId:otherStudent.id}});
  const groupResponse=await fetch(`${path}/marks?assignmentId=${otherAssignment.id}&termId=${term.id}`,{headers:{cookie}});
  const groupHtml=await groupResponse.text();assert.equal(groupResponse.status,200);assert.ok(groupHtml.includes('Roster Separate'));assert.ok(!groupHtml.includes('Group examination'));
  assert.equal(await prisma.grade.count({where:{studentId:otherStudent.id}}),0);
  console.log('PASS separate group shows its own roster without the first group examination');
  const r=await fetch(path,{headers:{cookie}});const body=await r.text();assert.ok(body.includes('2 séances confirmées'));
  console.log('PASS dashboard reflects recorded teacher sessions');
 }finally{
  if(teacher)await prisma.teacherLesson.deleteMany({where:{teacherId:teacher.id}});
  if(school)await prisma.school.delete({where:{id:school.id}});
  await prisma.user.deleteMany({where:{id:{in:users}}});
  await prisma.$disconnect();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
