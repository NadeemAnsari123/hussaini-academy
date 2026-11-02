"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TeacherClass = {
  id: string;
  course_id: string;
  title: string;
  teacher_name: string | null;
  language: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  courses: { title: string } | null;
};

type AttendanceStatus = "present" | "absent" | "late";

type ClassStudent = {
  student_id: string;
  student_name: string;
  attendance_status: AttendanceStatus | null;
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Teacher");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [attendanceClassId, setAttendanceClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceBusyId, setAttendanceBusyId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        const user = auth.user;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: role, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "teacher")
          .maybeSingle();

        if (roleError) throw roleError;

        if (!role) {
          router.replace("/dashboard");
          return;
        }

        const fullName = user.user_metadata?.full_name;
        const displayName =
          typeof fullName === "string" && fullName.trim()
            ? fullName
            : user.email?.split("@")[0] || "Teacher";

        const { data: assignments, error: assignmentError } =
          await supabase
            .from("teacher_assignments")
            .select("course_id")
            .eq("teacher_id", user.id);

        if (assignmentError) throw assignmentError;

        const courseIds = (assignments ?? []).map(
          (item) => item.course_id as string
        );

        if (!active) return;

        setName(displayName);

        if (courseIds.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const { data: classData, error: classError } =
          await supabase
            .from("live_classes")
            .select(
              "id, course_id, title, teacher_name, language, scheduled_at, duration_minutes, status, courses(title)"
            )
            .in("course_id", courseIds)
            .order("scheduled_at", { ascending: true });

        if (classError) throw classError;

        if (!active) return;

        const normalized = (classData ?? []).map((item) => ({
          ...item,
          courses: Array.isArray(item.courses)
            ? item.courses[0] ?? null
            : item.courses,
        })) as TeacherClass[];

        setClasses(normalized);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load teacher dashboard."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  async function updateClassStatus(
    classItem: TeacherClass,
    nextStatus: "live" | "completed"
  ) {
    if (busyId) return;

    const expectedStatus =
      nextStatus === "live" ? "scheduled" : "live";

    if (classItem.status !== expectedStatus) return;

    setBusyId(classItem.id);
    setError("");

    const { data, error: updateError } = await supabase
      .from("live_classes")
      .update({ status: nextStatus })
      .eq("id", classItem.id)
      .eq("status", expectedStatus)
      .select("id, status")
      .single();

    if (updateError || !data) {
      setError(
        updateError?.message ||
          "Class status could not be updated."
      );
    } else {
      setClasses((previous) =>
        previous.map((item) =>
          item.id === classItem.id
            ? { ...item, status: data.status }
            : item
        )
      );
    }

    setBusyId(null);
  }

  async function openAttendance(classId: string) {
    if (attendanceLoading || attendanceBusyId) return;
    if (attendanceClassId === classId) {
      setAttendanceClassId(null);
      return;
    }
    setAttendanceClassId(classId);
    setStudents([]);
    setSelectedStatuses({});
    setAttendanceError("");
    setAttendanceMessage("");
    setAttendanceLoading(true);
    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_class_students",
        { p_class_id: classId }
      );
      if (fetchError) throw fetchError;
      const fetched = (data ?? []) as ClassStudent[];
      setStudents(fetched);
      const initial: Record<string, AttendanceStatus> = {};
      fetched.forEach((student) => {
        if (student.attendance_status) {
          initial[student.student_id] = student.attendance_status;
        }
      });
      setSelectedStatuses(initial);
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : "Could not load students.");
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function saveAttendance(classId: string, studentId: string) {
    const status = selectedStatuses[studentId];
    if (!status || attendanceBusyId) return;
    setAttendanceBusyId(studentId);
    setAttendanceError("");
    setAttendanceMessage("");
    try {
      const { error: saveError } = await supabase.rpc(
        "mark_class_attendance",
        { p_class_id: classId, p_student_id: studentId, p_status: status }
      );
      if (saveError) throw saveError;
      setStudents((previous) => previous.map((student) =>
        student.student_id === studentId
          ? { ...student, attendance_status: status }
          : student
      ));
      setAttendanceMessage("Attendance saved successfully.");
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : "Could not save attendance.");
    } finally {
      setAttendanceBusyId(null);
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#061711] text-amber-200">
        Loading Teacher Dashboard...
      </main>
    );
  }

  const liveCount = classes.filter(
    (item) => item.status === "live"
  ).length;

  const scheduledCount = classes.filter(
    (item) => item.status === "scheduled"
  ).length;

  return (
    <main className="min-h-screen bg-[#071811] text-white">
      <header className="border-b border-white/10 bg-[#0D3024]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <Link
            href="/"
            className="text-xl font-extrabold text-amber-300"
          >
            ☪ Hussaini Academy
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-amber-300/30 px-4 py-2 text-sm text-amber-200 hover:bg-white/10"
          >
            Student Dashboard →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
          Virtual School • Teacher Portal
        </p>

        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
          Assalamu Alaikum, {name}!
        </h1>

        <p className="mt-3 text-white/60">
          Manage your assigned live classes at Hussaini Academy.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200"
          >
            {error}
          </div>
        )}

        <div className="mt-9 grid gap-5 sm:grid-cols-3">
          {[
            ["Assigned Classes", classes.length],
            ["Scheduled", scheduledCount],
            ["Live Now", liveCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-amber-300/15 bg-white/5 p-6"
            >
              <p className="text-sm text-white/60">{label}</p>
              <p className="mt-3 text-3xl font-bold text-amber-300">
                {value}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-bold">My Live Classes</h2>

        {classes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-white/60">
            No classes assigned yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {classes.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#174B37] to-[#081E17] p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                    Virtual Classroom
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
                    {item.status}
                  </span>
                </div>

                <p className="mt-6 text-sm text-emerald-300">
                  {item.courses?.title || "Assigned Course"}
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {item.title}
                </h3>

                <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-white/50">Date & Time (IST)</p>
                    <p className="mt-1 font-semibold">
                      {formatDate(item.scheduled_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-white/50">Duration</p>
                    <p className="mt-1 font-semibold">
                      {item.duration_minutes} minutes
                    </p>
                  </div>

                  <div>
                    <p className="text-white/50">Teacher</p>
                    <p className="mt-1 font-semibold">
                      {item.teacher_name || name}
                    </p>
                  </div>

                  <div>
                    <p className="text-white/50">Language</p>
                    <p className="mt-1 font-semibold">
                      {item.language}
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {item.status === "scheduled" && (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() =>
                        updateClassStatus(item, "live")
                      }
                      className="rounded-xl bg-amber-300 px-6 py-3 font-bold text-[#10291E] hover:brightness-110 disabled:opacity-50"
                    >
                      {busyId === item.id
                        ? "Starting..."
                        : "▶ Start Class"}
                    </button>
                  )}

                  {item.status === "live" && (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() =>
                        updateClassStatus(item, "completed")
                      }
                      className="rounded-xl bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-400 disabled:opacity-50"
                    >
                      {busyId === item.id
                        ? "Ending..."
                        : "■ End Class"}
                    </button>
                  )}

                  {item.status === "completed" && (
                    <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-emerald-200">
                      ✓ Class Completed
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => openAttendance(item.id)}
                    disabled={attendanceLoading || attendanceBusyId !== null}
                    aria-expanded={attendanceClassId === item.id}
                    className="rounded-xl border border-amber-300/40 px-5 py-3 font-semibold text-amber-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    {attendanceClassId === item.id ? "Close Attendance" : "Mark Attendance"}
                  </button>
                </div>

                {attendanceClassId === item.id && (
                  <section className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-5" aria-label="Class attendance">
                    <h4 className="text-lg font-bold text-amber-200">Student Attendance</h4>
                    <p className="mt-1 text-xs text-white/60">Choose a status and save each student individually.</p>
                    {attendanceLoading && <p className="mt-4 text-white/70">Loading enrolled students...</p>}
                    {attendanceError && <p role="alert" className="mt-4 text-sm text-red-300">{attendanceError}</p>}
                    {attendanceMessage && <p role="status" className="mt-4 text-sm text-emerald-300">{attendanceMessage}</p>}
                    {!attendanceLoading && students.length === 0 && !attendanceError && (
                      <p className="mt-4 text-sm text-white/60">No enrolled students found for this class.</p>
                    )}
                    {students.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap gap-3 text-xs text-white/70">
                          <span>Present: {students.filter((s) => s.attendance_status === "present").length}</span>
                          <span>Absent: {students.filter((s) => s.attendance_status === "absent").length}</span>
                          <span>Late: {students.filter((s) => s.attendance_status === "late").length}</span>
                          <span>Not marked: {students.filter((s) => !s.attendance_status).length}</span>
                        </div>
                        {students.map((student) => (
                          <div key={student.student_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div>
                              <p className="font-semibold">{student.student_name}</p>
                              <p className="text-xs text-white/50">Saved: {student.attendance_status ?? "Not marked"}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                aria-label={`Attendance for ${student.student_name}`}
                                value={selectedStatuses[student.student_id] ?? ""}
                                onChange={(event) => {
                                  const value = event.target.value as AttendanceStatus;
                                  setSelectedStatuses((prev) => ({ ...prev, [student.student_id]: value }));
                                  setAttendanceMessage("");
                                }}
                                className="rounded-lg border border-white/20 bg-[#12382B] px-3 py-2 text-sm text-white"
                              >
                                <option value="" disabled>Select status</option>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="late">Late</option>
                              </select>
                              <button
                                type="button"
                                disabled={!selectedStatuses[student.student_id] || attendanceBusyId !== null || selectedStatuses[student.student_id] === student.attendance_status}
                                onClick={() => saveAttendance(item.id, student.student_id)}
                                className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-[#10291E] disabled:opacity-40"
                              >
                                {attendanceBusyId === student.student_id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
