"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Badge, Button, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { getTeacherSession, saveTeacherSession, saveCourseContent, setCourseTarget } from "@/app/actions/teacher";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`teacher-section ${className}`}>{children}</section>;
}

type Content = { id: string; kind: string; title: string; body: string; url: string | null; date: string };
type Course = { id: string; classId: string; className: string; level: string | null; subjectId: string; subject: string; planned: number; contents: Content[] };
type Student = { id: string; firstName: string; lastName: string; classId: string; className: string; email: string | null; matricule: string | null };
type Entry = { id: string; classId: string; className: string; subjectId: string; subject: string; day: number; start: string; end: string; room: string };
type Lesson = { entryId: string; date: string };
type Year = { name: string; start: string; end: string } | null;
type Props = { schoolId: string; section: string; assignmentId?: string; today: string; teacherName: string; courses: Course[]; students: Student[]; entries: Entry[]; lessons: Lesson[]; year: Year };
const parse = (day: string) => new Date(`${day}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const add = (day: string, amount: number) => { const d = parse(day); d.setUTCDate(d.getUTCDate() + amount); return iso(d); };
const format = (day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) => parse(day).toLocaleDateString("fr-FR", { ...options, timeZone: "UTC" });
const weekStart = (day: string) => add(day, -((parse(day).getUTCDay() + 6) % 7));
const minutes = (time: string) => Number(time.slice(0,2)) * 60 + Number(time.slice(3,5));
const tabs = [{ id: "overview", label: "Vue d’ensemble" }, { id: "lecture", label: "Séances" }, { id: "exam", label: "Examens" }, { id: "announcement", label: "Annonces" }, { id: "resource", label: "Ressources" }, { id: "assignment", label: "Devoirs" }];

function occurrences(entries: Entry[], start: string, end: string) {
  const result: { entry: Entry; date: string }[] = [];
  if (start > end) return result;
  for (let day = start, guard = 0; day <= end && guard < 370; day = add(day, 1), guard++) {
    for (const entry of entries) if (entry.day === parse(day).getUTCDay()) result.push({ entry, date: day });
  }
  return result.sort((a,b) => `${a.date}${a.entry.start}`.localeCompare(`${b.date}${b.entry.start}`));
}

export function TeacherPortal(props: Props) {
  const { schoolId, section, courses, students, entries, lessons, today, year } = props;
  const base = `/s/${schoolId}/teacher`;
  const [selected, setSelected] = useState<{ entry: Entry; date: string } | null>(null);
  const course = courses.find(c => c.id === props.assignmentId);
  const completed = (c: Course) => lessons.filter(l => l.date <= today && entries.some(e => e.id === l.entryId && e.classId === c.classId && e.subjectId === c.subjectId)).length;
  const totalPast = year ? occurrences(entries, year.start, add(today, -1) < year.end ? add(today, -1) : year.end) : [];
  const pastKeys = new Set(totalPast.map(o => `${o.entry.id}:${o.date}`));
  const donePast = lessons.filter(l => pastKeys.has(`${l.entryId}:${l.date}`)).length;
  const rate = totalPast.length ? Math.round(donePast / totalPast.length * 100) : null;
  const next = year ? occurrences(entries, today > year.start ? today : year.start, year.end < add(today, 13) ? year.end : add(today,13)).slice(0,5) : [];
  const uniqueStudents = [...new Map(students.map(s => [s.id, s])).values()];
  return <div className="teacher-portal mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c9d7ee] pb-4 text-xs text-[#3d5278]"><span className="font-semibold uppercase tracking-[.18em]">Espace professeur · Henri Moissan</span><span>{year?.name || "Aucune année scolaire courante"} · {format(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
    {section === "dashboard" && <>
      <header className="teacher-welcome">
        <div><p className="teacher-welcome-label">Une nouvelle journée, de nouvelles perspectives</p><h1>Bonjour, {props.teacherName.split(" ")[0]}<span>.</span></h1><p>Le plaisir de transmettre commence ici.</p><Link className="teacher-primary" href={`${base}/calendar`}>Consulter mon calendrier <span aria-hidden="true">→</span></Link></div>
        <Image src="/school-courtyard.svg" alt="" width={300} height={180} className="teacher-welcome-art" />
      </header>
      <div className="teacher-stats">
        <Stat label="Étudiants enseignés" value={String(uniqueStudents.length)} note="Étudiants uniques, tous groupes confondus" />
        <Stat label="Votre taux de présence" value={rate === null ? "—" : `${rate} %`} note={`${donePast} séances confirmées / ${totalPast.length} séances passées`} />
        <Stat label="Mes groupes" value={String(new Set(courses.map(c => c.classId)).size)} note={`${courses.length} modules enseignés`} />
        <Stat label="Séances réalisées" value={String(lessons.filter(l => l.date <= today).length)} note="Confirmées par la prise de présence" />
      </div>
      <p className="text-xs text-[#3d5278]">Votre présence est calculée sur les séances planifiées avant aujourd’hui, depuis le début de l’année scolaire. Une séance est confirmée lorsque vous enregistrez l’appel.</p>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]"><Card><div className="mb-5 flex justify-between"><h2 className="text-lg font-semibold">Prochaines séances</h2><Link className="text-sm text-[#264c93]" href={`${base}/calendar`}>Tout voir →</Link></div>{next.length ? next.map(({entry,date}) => <button key={`${entry.id}${date}`} onClick={() => setSelected({entry,date})} className="teacher-session-row"><span className="min-w-14 text-center text-sm font-semibold text-[#264c93]">{format(date, {day:"2-digit",month:"short"})}</span><span className="flex-1"><strong className="block">{entry.subject}</strong><span className="text-xs text-[#3d5278]">{entry.className} · {entry.room}</span></span><span className="text-sm">{entry.start}–{entry.end}</span></button>) : <EmptyState message="Aucune séance prévue dans les deux prochaines semaines." />}</Card>
      <Card><h2 className="mb-5 text-lg font-semibold">Avancement des cours</h2><div className="space-y-6">{courses.slice(0,5).map(c => <Link className="block" key={c.id} href={`${base}/courses/${c.id}`}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold">{c.subject} <span className="font-normal text-[#3d5278]">· {c.className}</span></span><span>{completed(c)}/{c.planned}</span></div><Progress done={completed(c)} total={c.planned}/></Link>)}{!courses.length && <EmptyState message="Aucun cours ne vous a encore été affecté." />}</div></Card></div>
    </>}
    {section === "calendar" && <><PageHeader title="Mon calendrier" description="Sélectionnez une séance pour consulter la classe et faire l’appel." /><Calendar entries={entries} lessons={lessons} today={today} year={year} onSelect={(entry,date) => setSelected({entry,date})}/></>}
    {section === "courses" && !course && <>
      <PageHeader title="Mes cours" description="Groupes et modules de l’année scolaire." />
      <div className="teacher-course-list">
        <div className="teacher-course-list-head"><span>Classe et matière</span><span>Effectif</span><span>Progression</span><span></span></div>
        {courses.map(c => <Link className="teacher-course-row" key={c.id} href={`${base}/courses/${c.id}`}>
          <div><h2>{c.className}</h2><p>{c.subject}{c.level ? ` · ${c.level}` : ""}</p></div>
          <span>{students.filter(s => s.classId === c.classId).length} étudiants</span>
          <div><Progress done={completed(c)} total={c.planned} /><p>{completed(c)} / {c.planned} séances</p></div>
          <span className="teacher-open-course">Consulter →</span>
        </Link>)}
      </div>
      {!courses.length && <EmptyState message="Aucun cours affecté. Contactez votre administration." />}
    </>}    {section === "courses" && course && <CourseDetail key={course.id} course={course} students={students.filter(s => s.classId === course.classId)} entries={entries.filter(e => e.classId === course.classId && e.subjectId === course.subjectId)} lessons={lessons} done={completed(course)} schoolId={schoolId} base={base} onSelect={(entry,date) => setSelected({entry,date})}/>}
    {section === "students" && <><PageHeader title="Mes étudiants" description={`${uniqueStudents.length} étudiants dans l’ensemble de vos groupes de l’année courante.`}/><StudentList students={uniqueStudents}/></>}
    {selected && <SessionDialog key={`${selected.entry.id}${selected.date}`} schoolId={schoolId} entry={selected.entry} date={selected.date} today={today} students={students.filter(s => s.classId === selected.entry.classId)} onClose={() => setSelected(null)}/>}
  </div>;
}

function Stat({label,value,note}: {label:string;value:string;note:string}) { return <Card className="teacher-stat"><p className="text-sm text-[#3d5278]">{label}</p><p className="my-3 text-4xl font-semibold tracking-tight text-[#002b5b]">{value}</p><p className="text-xs text-[#3d5278]">{note}</p></Card>; }
function Progress({done,total}: {done:number;total:number}) { return <div role="progressbar" aria-label="Avancement du cours" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(done,total)} className="h-2 overflow-hidden rounded-full bg-[#e4ecf8]"><div className="h-full rounded-full bg-[#27a58c]" style={{width:`${Math.min(100,done/total*100)}%`}}/></div>; }

function Calendar({ entries, lessons, today, year, onSelect }: { entries: Entry[]; lessons: Lesson[]; today: string; year: Year; onSelect: (e: Entry, d: string) => void }) {
  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(today);
  const move = (direction: number) => {
    if (view === "month") { const d = parse(cursor); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + direction); setCursor(iso(d)); }
    else setCursor(add(cursor, direction * (view === "day" ? 1 : 7)));
  };
  const first = view === "month" ? weekStart(`${cursor.slice(0, 7)}-01`) : view === "day" ? cursor : weekStart(cursor);
  const days = Array.from({ length: view === "month" ? 42 : view === "day" ? 1 : 7 }, (_, i) => add(first, i));
  const inYear = (d: string) => !!year && d >= year.start && d <= year.end;
  const outsideYear = !year || days[days.length - 1] < year.start || days[0] > year.end;
  const times = [...new Set(entries.map(e => e.start))].sort();
  const eventButton = (e: Entry, d: string) => {
    const locked = lessons.some(l => l.entryId === e.id && l.date === d);
    return <button key={e.id} onClick={() => onSelect(e, d)} className="mb-2 block w-full rounded-lg border-l-[3px] border-[#27a58c] bg-[#e5f8f3] p-2 text-left text-xs text-[#002b5b] transition hover:bg-[#c8efe4]">
      <span className="block font-semibold">{e.start}–{e.end}</span><span className="mt-1 block font-semibold">{e.subject}</span><span className="block">{e.className}</span>
      {view !== "month" && <span className="mt-1 block opacity-70">{e.room}</span>}
      <span className="mt-2 block font-semibold">{locked ? "✓ Appel validé · Consulter" : "Ouvrir l’appel →"}</span>
    </button>;
  };
  return <Card>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2"><Button aria-label="Période précédente" variant="secondary" onClick={() => move(-1)}>‹</Button><Button variant="secondary" onClick={() => setCursor(today)}>Aujourd’hui</Button><Button aria-label="Période suivante" variant="secondary" onClick={() => move(1)}>›</Button><h2 className="ml-2 font-semibold capitalize">{format(cursor, { month: "long", year: "numeric", ...(view === "day" ? { day: "numeric" } : {}) })}</h2></div>
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#eef2f7] p-1">{[["month", "Mois"], ["week", "Semaine"], ["day", "Jour"], ["agenda", "Agenda"]].map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-sm ${view === id ? "bg-white font-semibold shadow-sm" : "text-[#3d5278]"}`}>{label}</button>)}</div>
    </div>
    {outsideYear && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fff4b8] p-4 text-sm"><p>{year ? `Cette période est hors de l’année active ${year.name}.` : "Aucune année scolaire active. Contactez l’administration."}</p>{year && <Button variant="secondary" onClick={() => setCursor(year.start)}>Voir l’année active</Button>}</div>}
    <div className="overflow-x-auto">
      {view === "month" || view === "agenda" ? <div className="grid min-w-[980px] grid-cols-7">
        {days.slice(0, 7).map(d => <div key={d} className="border border-[#dce6f3] bg-[#eef2f7] p-3 text-center text-sm font-semibold capitalize">{format(d, { weekday: "long", ...(view === "agenda" ? { day: "numeric", month: "short" } : {}) })}</div>)}
        {days.map(d => <div key={d} className={`min-h-40 border border-[#e4ecf8] p-2 ${d === today ? "bg-[#f0faf7]" : ""}`}>
          {view === "month" && <p className="mb-3 text-sm font-semibold">{format(d, { day: "numeric", month: "short" })}</p>}
          {inYear(d) && entries.filter(e => e.day === parse(d).getUTCDay()).map(e => eventButton(e, d))}
          {view === "agenda" && (!inYear(d) || !entries.some(e => e.day === parse(d).getUTCDay())) && <p className="text-xs text-[#3d5278]">Aucune séance</p>}
        </div>)}
      </div> : <table className={`w-full table-fixed border-collapse ${view === "week" ? "min-w-[1040px]" : "min-w-[320px]"}`}>
        <thead><tr><th className="w-20 border border-[#dce6f3] bg-[#eef2f7] p-3 text-xs">Horaire</th>{days.map(d => <th key={d} className={`border border-[#dce6f3] p-3 text-sm capitalize ${d === today ? "bg-[#d7f6ee]" : "bg-[#eef2f7]"}`}>{format(d, { weekday: "long", day: "numeric", month: "short" })}</th>)}</tr></thead>
        <tbody>{times.map(time => <tr key={time}><th className="border border-[#e4ecf8] p-2 align-top text-xs text-[#3d5278]">{time}</th>{days.map(d => <td key={d} className={`h-28 border border-[#e4ecf8] p-2 align-top ${d === today ? "bg-[#f0faf7]" : ""}`}>{inYear(d) && entries.filter(e => e.start === time && e.day === parse(d).getUTCDay()).map(e => eventButton(e, d))}</td>)}</tr>)}</tbody>
      </table>}
    </div>
    {!entries.length && <EmptyState message="Aucune séance affectée à ce professeur." />}
    <p className="mt-4 text-xs text-[#3d5278]">Jours en colonnes · Cliquez sur une séance pour ouvrir l’appel. Validation disponible après 15 minutes de cours, puis verrouillage définitif.</p>
  </Card>;
}

function SessionDialog({ schoolId, entry, date, students, onClose }: { schoolId: string; entry: Entry; date: string; today: string; students: Student[]; onClose: () => void }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [opensAt, setOpensAt] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    getTeacherSession(schoolId, entry.id, date).then(data => {
      if (!active) return;
      setStatuses(Object.fromEntries(data.records.map(r => [r.studentId, r.status])));
      setLocked(data.locked); setOpensAt(data.opensAt); setRemaining(data.remainingMs);
      const deadline = Date.now() + data.remainingMs;
      timer = setInterval(() => setRemaining(Math.max(0, deadline - Date.now())), 1000);
    }).catch(() => { if (active) setError("Impossible de charger l’appel. Fermez puis réessayez."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; clearInterval(timer); previous?.focus(); };
  }, [schoolId, entry.id, date]);
  const waiting = remaining === null || remaining > 0;
  const disabled = loading || pending || locked || waiting || !!error;
  const markAll = (status: string) => setStatuses(Object.fromEntries(students.map(s => [s.id, status])));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001b39]/60 p-3 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget && !pending) onClose(); }} onKeyDown={e => {
    if (e.key === "Escape" && !pending) onClose();
    if (e.key === "Tab") {
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), [tabindex="0"]');
      if (nodes?.length) { const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
  }}><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="session-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
    <div className="mb-5 flex justify-between gap-3"><div><Badge tone="success">{entry.className}</Badge><h2 id="session-title" className="mt-3 text-2xl font-semibold">{entry.subject}</h2><p className="mt-1 text-sm text-[#3d5278]">{format(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {entry.start}–{entry.end} · {entry.room}</p></div><Button variant="ghost" aria-label="Fermer" disabled={pending} onClick={onClose}>✕</Button></div>
    <p className="mb-4 text-sm">{students.length} étudiants · Modifiez chaque statut avant de valider définitivement l’appel.</p>
    {locked && <p role="status" className="mb-4 rounded-lg bg-[#e5f8f3] p-3 text-sm font-semibold">✓ Appel validé et verrouillé. Aucune modification possible.</p>}
    {!loading && waiting && !locked && <p role="status" className="mb-4 rounded-lg bg-[#fff4b8] p-3 text-sm">L’appel sera disponible le {format(date)} à {opensAt}, après les 15 premières minutes du cours (heure du Maroc).</p>}
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f7fb] p-3">
      <Select aria-label="Marquer toute la classe" className="max-w-64" disabled={disabled} value="" onChange={e => markAll(e.target.value)}>
        <option value="" disabled>Marquer toute la classe…</option><option value="PRESENT">Tous présents</option><option value="ABSENT">Tous absents</option>
      </Select>
      <span className="text-xs text-[#3d5278]">{students.filter(s => (statuses[s.id] || "PRESENT") === "PRESENT").length} présents · {students.filter(s => statuses[s.id] === "ABSENT").length} absents</span>
    </div>
    <div className="divide-y divide-[#e4ecf8]">{students.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{s.lastName} {s.firstName}</p><p className="text-xs text-[#3d5278]">{s.matricule || "Sans matricule"}</p></div><Select aria-label={`Présence de ${s.firstName} ${s.lastName}`} className="max-w-44" disabled={disabled} value={statuses[s.id] || "PRESENT"} onChange={e => setStatuses({ ...statuses, [s.id]: e.target.value })}><option value="PRESENT">Présent</option><option value="ABSENT">Absent</option><option value="LATE">En retard</option><option value="EXCUSED">Excusé</option></Select></div>)}</div>
    {!students.length && <EmptyState message="Aucun étudiant inscrit dans ce groupe pour l’année courante." />}
    {!locked && <p className="mt-4 rounded-lg border border-[#e2c200] p-3 text-sm">Vérifiez les statuts : la validation est définitive et verrouille cet appel.</p>}
    <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[#e4ecf8] bg-white pt-4"><Button variant="secondary" disabled={pending} onClick={onClose}>Fermer</Button><Button disabled={disabled || !students.length} onClick={() => startTransition(async () => {
      const result = await saveTeacherSession(schoolId, entry.id, date, students.map(s => ({ studentId: s.id, status: statuses[s.id] || "PRESENT" })));
      if (result.error) setError(result.error); else { setLocked(true); router.refresh(); }
    })}>{pending || loading ? "Chargement…" : locked ? "Appel verrouillé" : "Valider définitivement l’appel"}</Button></div>
  </div></div>;
}

function StudentList({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const classes = [...new Map(students.map(s => [s.classId, s.className])).entries()];
  const filtered = students.filter(s =>
    (!classId || s.classId === classId) &&
    `${s.firstName} ${s.lastName} ${s.matricule || ""} ${s.email || ""}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * pageSize;
  const visible = filtered.slice(offset, offset + pageSize);

  return <Card>
    <div className="mb-5 flex flex-wrap gap-3">
      <Input aria-label="Rechercher un étudiant" className="max-w-sm" placeholder="Rechercher un nom, matricule, email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      <Select aria-label="Filtrer par groupe" className="max-w-xs" value={classId} onChange={e => { setClassId(e.target.value); setPage(1); }}>
        <option value="">Tous les groupes</option>
        {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </Select>
      <span className="self-center text-sm text-[#3d5278]">{filtered.length} résultat(s)</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#f4f7fb] text-[#3d5278]"><tr>{["Étudiant", "Matricule", "Groupe", "Email"].map(t => <th className="px-4 py-3 font-medium" key={t}>{t}</th>)}</tr></thead>
        <tbody>{visible.map(s => <tr className="border-b border-[#e4ecf8]" key={s.id}>
          <td className="px-4 py-4 font-semibold">{s.lastName} {s.firstName}</td>
          <td className="px-4 py-4">{s.matricule || "—"}</td>
          <td className="px-4 py-4"><Badge tone="info">{s.className}</Badge></td>
          <td className="px-4 py-4">{s.email ? <a href={`mailto:${s.email}`} className="text-[#264c93]">{s.email}</a> : "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!filtered.length && <EmptyState message="Aucun étudiant ne correspond à votre recherche." />}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e4ecf8] pt-4">
      <label className="flex items-center gap-2 text-sm text-[#3d5278]">
        Afficher
        <Select aria-label="Étudiants par page" className="w-24" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
          {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
        </Select>
        par page
      </label>
      <p aria-live="polite" className="text-sm text-[#3d5278]">{filtered.length ? offset + 1 : 0}–{Math.min(offset + pageSize, filtered.length)} sur {filtered.length} étudiants</p>
      <nav aria-label="Pagination des étudiants" className="flex items-center gap-2">
        <Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Précédent</Button>
        <span className="px-2 text-sm">Page {currentPage} sur {pageCount}</span>
        <Button variant="secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Suivant</Button>
      </nav>
    </div>
  </Card>;
}
function CourseDetail({course,students,entries,lessons,done,schoolId,base,onSelect}: {course:Course;students:Student[];entries:Entry[];lessons:Lesson[];done:number;schoolId:string;base:string;onSelect:(e:Entry,d:string)=>void}) {
  const [tab,setTab]=useState("overview"); const [adding,setAdding]=useState(false); const [pending,startTransition]=useTransition(); const [error,setError]=useState(""); const router=useRouter();
  const hours=entries.length? Math.round(course.planned*entries.reduce((sum,e)=>sum+(minutes(e.end)-minutes(e.start))/60,0)/entries.length*10)/10:null;
  const contents=course.contents.filter(c=>c.kind===tab);
  return <><Link className="text-sm text-[#264c93]" href={`${base}/courses`}>← Tous mes cours</Link><div className="teacher-course-header"><p className="mb-2 text-xs uppercase tracking-[.2em] text-[#8fe3cf]">{course.level||"Enseignement"}</p><h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold">{course.className}</h1><p className="mt-2 text-lg text-[#c5d8f2]">{course.subject}</p><div className="my-5 flex flex-wrap gap-2">{[`${students.length} étudiants`,hours===null?"Volume horaire à planifier":`${hours} h prévues`,`${done} séances réalisées`,`${course.contents.filter(c=>c.kind==="exam").length} examens`,`${course.contents.filter(c=>c.kind==="assignment").length} devoirs`].map(text=><span key={text} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">{text}</span>)}</div><div className="mb-2 flex justify-between text-sm"><span>Avancement du module</span><span>{done}/{course.planned} séances · {Math.min(100,Math.round(done/course.planned*100))} %</span></div><Progress done={done} total={course.planned}/></div>
    <div role="tablist" aria-label="Contenu du cours" className="flex gap-1 overflow-x-auto border-b border-[#c9d7ee]">{tabs.map(t=><button role="tab" aria-selected={tab===t.id} aria-controls="course-panel" id={`tab-${t.id}`} key={t.id} onClick={()=>{setTab(t.id);setAdding(false);setError("");}} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${tab===t.id?"border-[#002b5b] font-semibold text-[#002b5b]":"border-transparent text-[#3d5278]"}`}>{t.label}</button>)}</div>
    <div role="tabpanel" id="course-panel" aria-labelledby={`tab-${tab}`}>
      {tab === "exam" && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#dde3d9] pb-4"><p className="text-sm text-[#687a6d]">Saisissez les résultats de ce groupe, étudiant par étudiant.</p><Link className="teacher-primary" href={`${base}/marks?assignmentId=${course.id}`}>Saisir les notes du groupe →</Link></div>}
      {tab==="overview" ? <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><Card><h2 className="mb-4 text-lg font-semibold">À propos du module</h2><p className="text-sm leading-7 text-[#3d5278]">{course.subject} pour le groupe {course.className}. Retrouvez les supports de cours, les évaluations et les annonces dans les onglets du module. La progression se met à jour après chaque appel enregistré.</p><h3 className="mb-3 mt-6 font-semibold">Séances hebdomadaires</h3>{entries.map(e=><p className="mb-2 rounded-lg bg-[#f4f7fb] p-3 text-sm" key={e.id}>{["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"][e.day]} · {e.start}–{e.end} · {e.room}</p>)}{!entries.length&&<p className="text-sm text-[#3d5278]">Aucune séance planifiée.</p>}</Card><Card><h2 className="mb-4 text-lg font-semibold">Objectif du module</h2><form action={form=>startTransition(async()=>{try{await setCourseTarget(schoolId,course.id,form);router.refresh();setError("");}catch{setError("Impossible de modifier l’objectif.");}})}><label className="mb-2 block text-sm" htmlFor="planned">Nombre total de séances</label><Input id="planned" name="plannedSessions" type="number" min={1} max={1000} required defaultValue={course.planned}/><p className="my-3 text-xs text-[#3d5278]">24 séances par défaut. Ajustez ce total au module ou au semestre. Le volume horaire est estimé à partir des créneaux hebdomadaires.</p><Button disabled={pending}>Enregistrer l’objectif</Button></form></Card><div className="xl:col-span-2"><h2 className="mb-4 text-lg font-semibold">Étudiants du groupe</h2><StudentList students={students}/></div></div> : <Card><div className="mb-5 flex justify-between gap-3"><h2 className="text-lg font-semibold">{tabs.find(t=>t.id===tab)?.label}</h2><Button variant="secondary" onClick={()=>setAdding(!adding)}>{adding?"Annuler":"+ Ajouter"}</Button></div>
      {adding&&<form className="mb-6 space-y-3 rounded-xl bg-[#f4f7fb] p-4" action={form=>startTransition(async()=>{try{await saveCourseContent(schoolId,course.id,form);setAdding(false);setError("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}})}><input type="hidden" name="kind" value={tab}/><label className="block text-sm">Titre<Input name="title" required maxLength={180}/></label><label className="block text-sm">Contenu<textarea name="body" required maxLength={10000} rows={4} className="mt-1 w-full rounded-xl border border-[#b7c9e6] bg-white p-3"/></label><label className="block text-sm">Lien du support (facultatif)<Input name="url" type="url" placeholder="https://…"/></label><Button disabled={pending}>{pending?"Enregistrement…":"Publier dans le cours"}</Button></form>}
      {tab==="lecture"&&<div className="mb-5">{lessons.filter(l=>entries.some(e=>e.id===l.entryId)).map(l=>{const e=entries.find(e=>e.id===l.entryId)!;return <button key={`${l.entryId}${l.date}`} onClick={()=>onSelect(e,l.date)} className="mb-2 flex w-full justify-between rounded-xl bg-[#e5f8f3] p-4 text-left text-sm"><span>Séance du {format(l.date)} · {e.start}–{e.end}</span><Badge tone="success">Réalisée · Voir l’appel</Badge></button>;})}</div>}
      <div className="space-y-4">{contents.map(c=><article key={c.id} className="rounded-xl border border-[#dce6f3] p-5"><p className="mb-2 text-xs text-[#3d5278]">Publié le {format(c.date)}</p><h3 className="font-semibold">{c.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3d5278]">{c.body}</p>{c.url&&<a className="mt-3 inline-block text-sm font-semibold text-[#264c93]" href={c.url} target="_blank" rel="noopener noreferrer">Ouvrir le support ↗</a>}</article>)}</div>{!contents.length&&<EmptyState message="Aucun contenu publié dans cette rubrique. Ajoutez votre premier élément."/>}</Card>}
      {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  </>;
}
