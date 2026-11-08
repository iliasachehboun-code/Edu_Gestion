-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "globalRole" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    CONSTRAINT "Term_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "capacity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "matricule" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialty" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'parent',
    CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "TeacherAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CONTROLE',
    "title" TEXT,
    "score" REAL NOT NULL,
    "maxScore" REAL NOT NULL DEFAULT 20,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "average" REAL,
    "appreciation" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportCard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportCardLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportCardId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "average" REAL NOT NULL,
    "coefficient" REAL NOT NULL,
    "appreciation" TEXT,
    CONSTRAINT "ReportCardLine_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportCardLine_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "TimeSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    CONSTRAINT "Room_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "roomId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    CONSTRAINT "ScheduleEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "reason" TEXT,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FeeType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentFee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentFee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentFee_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentFee_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentFeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_schoolId_role_key" ON "Membership"("userId", "schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Term_academicYearId_order_key" ON "Term"("academicYearId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_matricule_key" ON "Student"("schoolId", "matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_academicYearId_key" ON "Enrollment"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_classId_subjectId_key" ON "TeacherAssignment"("teacherId", "classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentId_termId_key" ON "ReportCard"("studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardLine_reportCardId_subjectId_key" ON "ReportCardLine"("reportCardId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_schoolId_order_key" ON "TimeSlot"("schoolId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Room_schoolId_name_key" ON "Room"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_classId_dayOfWeek_timeSlotId_key" ON "ScheduleEntry"("classId", "dayOfWeek", "timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_teacherId_dayOfWeek_timeSlotId_key" ON "ScheduleEntry"("teacherId", "dayOfWeek", "timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_classId_key" ON "Attendance"("studentId", "date", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeType_schoolId_name_key" ON "FeeType"("schoolId", "name");
