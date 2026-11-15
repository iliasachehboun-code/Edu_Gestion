ALTER TABLE "TeacherAssignment" ADD COLUMN "plannedSessions" INTEGER NOT NULL DEFAULT 24;
CREATE TABLE "CourseContent" (
 "id" TEXT NOT NULL PRIMARY KEY, "assignmentId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "title" TEXT NOT NULL, "body" TEXT NOT NULL, "url" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CourseContent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "TeacherLesson" (
 "id" TEXT NOT NULL PRIMARY KEY, "scheduleEntryId" TEXT NOT NULL, "teacherId" TEXT NOT NULL,
 "date" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "TeacherLesson_scheduleEntryId_date_key" ON "TeacherLesson"("scheduleEntryId", "date");
