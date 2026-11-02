"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Course = { id: string; title: string; slug: string; description: string | null; category: string | null };
type Lesson = { id: string; title: string; description: string | null; video_url: string | null; lesson_order: number };

function CourseDetailsContent() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [progressError, setProgressError] = useState("");
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const fetchLearning = useCallback(async (courseId: string, studentId: string) => {
    setLessonsLoading(true);
    setLessonsError("");
    setProgressError("");
    const { data: lessonData, error: lessonError } = await supabase
      .from("lessons")
      .select("id, title, description, video_url, lesson_order")
      .eq("course_id", courseId)
      .order("lesson_order", { ascending: true });

    if (lessonError) {
      setLessons([]);
      setCompletedIds([]);
      setLessonsError(lessonError.message);
      setLessonsLoading(false);
      return;
    }

    const loadedLessons = (lessonData ?? []) as Lesson[];
    setLessons(loadedLessons);
    setSelectedLessonId((current) => current && loadedLessons.some((item) => item.id === current) ? current : loadedLessons[0]?.id ?? null);
    if (loadedLessons.length) {
      const { data: progressData, error: progressFetchError } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", studentId)
        .in("lesson_id", loadedLessons.map((lesson) => lesson.id));
      if (progressFetchError) {
        setCompletedIds([]);
        setProgressError(`Could not load progress: ${progressFetchError.message}`);
      } else {
        setCompletedIds((progressData ?? []).map((row: { lesson_id: string }) => row.lesson_id));
      }
    } else {
      setCompletedIds([]);
    }
    setLessonsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setCourse(null);
      setNotFound(false);
      setErrorMessage("");
      setEnrollmentError("");
      setEnrolled(false);
      setLessons([]);
      setCompletedIds([]);
      setUserId(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }
      const studentId = authData.user.id;
      setUserId(studentId);
      const { data, error } = await supabase.from("courses")
        .select("id, title, slug, description, category")
        .eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
      } else if (!data) {
        setNotFound(true);
      } else {
        setCourse(data as Course);
        const { data: enrollment, error: enrollmentCheckError } = await supabase
          .from("enrollments").select("id")
          .eq("student_id", studentId).eq("course_id", data.id).maybeSingle();
        if (cancelled) return;
        if (enrollmentCheckError) {
          setEnrollmentError(enrollmentCheckError.message);
        } else {
          setEnrolled(Boolean(enrollment));
          if (enrollment) await fetchLearning(data.id, studentId);
        }
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [slug, router, fetchLearning]);

  async function handleEnroll() {
    if (!course || !userId || enrolled || enrolling) return;
    setEnrolling(true);
    setEnrollmentError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || authData.user?.id !== userId) {
        router.replace("/login");
        return;
      }
      const { error } = await supabase.from("enrollments")
        .insert({ student_id: userId, course_id: course.id });
      if (error && error.code !== "23505") {
        setEnrollmentError(error.message);
        return;
      }
      setEnrolled(true);
      await fetchLearning(course.id, userId);
    } catch {
      setEnrollmentError("Enrollment failed. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

  async function toggleCompletion(lessonId: string) {
    if (!enrolled || !userId || savingLessonId || progressError) return;
    setSavingLessonId(lessonId);
    const alreadyCompleted = completedIds.includes(lessonId);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || authData.user?.id !== userId) {
        router.replace("/login");
        return;
      }
      if (alreadyCompleted) {
        const { error } = await supabase.from("lesson_progress").delete()
          .eq("student_id", userId).eq("lesson_id", lessonId);
        if (error) throw error;
        setCompletedIds((ids) => ids.filter((id) => id !== lessonId));
      } else {
        const { error } = await supabase.from("lesson_progress")
          .upsert({ student_id: userId, lesson_id: lessonId }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true });
        if (error) throw error;
        setCompletedIds((ids) => ids.includes(lessonId) ? ids : [...ids, lessonId]);
      }
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : "Could not save progress. Please retry.");
    } finally {
      setSavingLessonId(null);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#071C16] text-amber-200">Loading course details...</main>;
  if (errorMessage || notFound || !course) return (
    <main className="flex min-h-screen items-center justify-center bg-[#071C16] p-6 text-white">
      <div className="text-center"><h1 className="text-2xl font-bold text-amber-300">{notFound ? "Course Not Found" : "Unable to Load Course"}</h1>
        <p className="mt-4 text-white/70">{notFound ? "The requested course could not be found." : errorMessage}</p>
        <Link href="/dashboard" className="mt-6 inline-block text-amber-300">← Back to Dashboard</Link>
      </div>
    </main>
  );

  const completedCount = lessons.filter((lesson) => completedIds.includes(lesson.id)).length;
  const percentage = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#061711] via-[#104B37] to-[#071D18] text-white">
      <header className="border-b border-white/10 bg-[#071C16]/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-xl font-bold text-amber-300">☪ Hussaini Academy</Link>
          <Link href="/dashboard" className="rounded-xl border border-amber-300/30 px-4 py-2 text-sm text-amber-200 hover:bg-white/10">← Dashboard</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-r from-[#15533B] via-[#103E2D] to-[#09261D] p-8 shadow-2xl sm:p-12">
          <div className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full border border-amber-300/10" />
          <div className="pointer-events-none absolute -bottom-16 right-4 text-[200px] leading-none text-amber-300/10">☾</div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">{course.category || "Islamic Education"}</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">{course.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">{course.description || "Explore this learning programme at Hussaini Academy."}</p>
            <div className="mt-8 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-200">✨ Knowledge • Character • Faith</div>
          </div>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <article className="rounded-3xl border border-white/15 bg-white/[0.07] p-8">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Course Overview</p>
              <h2 className="mt-3 text-2xl font-bold">About This Course</h2>
              <p className="mt-5 leading-8 text-white/70">{course.description || "Detailed course information will be available soon."}</p>
            </article>
            <article className="rounded-3xl border border-white/15 bg-white/[0.07] p-8">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Learning Curriculum</p>
              <h2 className="mt-3 text-2xl font-bold">Course Lessons</h2>
              {!enrolled ? <p className="mt-5 text-white/65">Enroll in this course to view its lessons.</p> : lessonsLoading ?
                <p className="mt-5 text-white/65">Loading lessons and progress...</p> : lessonsError ?
                <div className="mt-5 text-red-300" role="alert">{lessonsError}<button type="button" onClick={() => userId && void fetchLearning(course.id, userId)} className="ml-3 text-amber-300 underline">Retry</button></div> : (
                <>
                  <div className="mt-6 rounded-2xl border border-amber-300/20 bg-[#071C16]/50 p-5">
                    <div className="flex items-center justify-between gap-3"><p className="font-semibold text-amber-200">Your Learning Progress</p><p className="text-xl font-bold text-amber-300">{percentage}%</p></div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Course completion">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-white/60">{completedCount} of {lessons.length} lessons completed</p>
                  </div>
                  {selectedLesson && (
                    <section id="lesson-classroom" className="mt-6 overflow-hidden rounded-2xl border border-amber-300/25 bg-[#061711]" aria-label="Recorded lesson classroom">
                      <div className="border-b border-white/10 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">🎬 Recorded Classroom · Lesson {selectedLesson.lesson_order}</p>
                        <h3 className="mt-2 text-xl font-bold">{selectedLesson.title}</h3>
                        {selectedLesson.description && <p className="mt-2 text-sm leading-6 text-white/60">{selectedLesson.description}</p>}
                      </div>
                      <LessonVideoPlayer key={selectedLesson.id} videoUrl={selectedLesson.video_url} title={selectedLesson.title} />
                      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                        <p className="text-xs text-white/55">Watch the lesson, then mark it completed when you are ready.</p>
                        <button type="button" disabled={savingLessonId !== null || Boolean(progressError)} onClick={() => void toggleCompletion(selectedLesson.id)} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-[#10291E] disabled:opacity-50">
                          {savingLessonId === selectedLesson.id ? "Saving..." : completedIds.includes(selectedLesson.id) ? "↶ Mark Incomplete" : "✓ Mark as Completed"}
                        </button>
                      </div>
                    </section>
                  )}
                  {progressError && <div className="mt-4 text-sm text-red-300" role="alert">{progressError}<button type="button" className="ml-3 text-amber-300 underline" onClick={() => { setProgressError(""); if (userId) void fetchLearning(course.id, userId); }}>Retry loading progress</button></div>}
                  {lessons.length === 0 ? <p className="mt-5 text-white/65">No lessons have been published for this course yet.</p> : (
                    <div className="mt-6 space-y-4">
                      {lessons.map((lesson) => {
                        const done = completedIds.includes(lesson.id);
                        const hasVideo = getSafeVideoUrl(lesson.video_url) !== null;
                        return (
                          <div key={lesson.id} className={`rounded-2xl border bg-[#071C16]/50 p-5 ${selectedLessonId === lesson.id ? "border-amber-300/60" : "border-amber-300/15"}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Lesson {lesson.lesson_order}</p>
                              {done && <span className="text-sm font-semibold text-emerald-300">✓ Completed</span>}
                            </div>
                            <h3 className="mt-2 text-lg font-bold">{lesson.title}</h3>
                            {lesson.description && <p className="mt-2 text-sm leading-7 text-white/65">{lesson.description}</p>}
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <button type="button" onClick={() => { setSelectedLessonId(lesson.id); document.getElementById("lesson-classroom")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-[#10291E]">{selectedLessonId === lesson.id ? "▶ Selected Lesson" : hasVideo ? "▶ Watch Lesson" : "View Lesson"}</button>
                              {!hasVideo && <span className="text-xs text-amber-200/70">🎬 Video Coming Soon</span>}
                              <button type="button" disabled={savingLessonId !== null || Boolean(progressError)} onClick={() => void toggleCompletion(lesson.id)} className="rounded-xl border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50">
                                {savingLessonId === lesson.id ? "Saving..." : done ? "↶ Mark Incomplete" : "✓ Mark as Completed"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </article>
            <article className="rounded-3xl border border-white/15 bg-white/[0.07] p-8">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Guided Learning</p>
              <h2 className="mt-3 text-2xl font-bold">Course Instructor</h2>
              <p className="mt-5 leading-8 text-white/65">Instructor details will be available when published.</p>
            </article>
          </div>
          <aside className="h-fit rounded-3xl border border-amber-300/25 bg-[#071C16]/80 p-8 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Course Enrollment</p>
            <h2 className="mt-4 text-2xl font-bold">Start Your Learning Journey</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">Enroll in this course to add it to your learning journey. Lessons and learning materials will be available when published.</p>
            <div className="mt-7 space-y-4 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-white/50">Course</span><span className="text-right text-sm font-semibold text-amber-200">{course.title}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-white/50">Category</span><span className="text-right text-sm text-white/80">{course.category || "Islamic Education"}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-white/50">Enrollment</span><span className="text-sm text-amber-300">{enrolled ? "Enrolled" : "Not Enrolled"}</span></div>
            </div>
            <button type="button" onClick={() => void handleEnroll()} disabled={enrolled || enrolling || Boolean(enrollmentError)} className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#E8C778] to-[#C69A43] px-5 py-4 font-bold text-[#10291E] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {enrolled ? "✓ Already Enrolled" : enrolling ? "Enrolling..." : "Enroll Now"}
            </button>
            {enrollmentError && <div role="alert" className="mt-3 text-sm text-red-300">{enrollmentError}<button type="button" onClick={() => setEnrollmentError("")} className="mt-2 block text-amber-300 underline">Try again</button></div>}
            <Link href="/dashboard" className="mt-5 block text-center text-sm font-medium text-amber-300 hover:underline">Explore More Courses →</Link>
          </aside>
        </div>
      </section>
      <footer className="border-t border-white/10 bg-[#061711]/70 px-6 py-6 text-center text-xs text-white/40">© 2026 Hussaini Academy • Knowledge • Character • Faith</footer>
    </main>
  );
}

export default function CourseDetailsPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#071C16] text-amber-300">Loading course details...</main>}><CourseDetailsContent /></Suspense>;
}

// Only HTTPS links are accepted. YouTube/Vimeo are embedded from their trusted player hosts.
function getSafeVideoUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url : null;
  } catch { return null; }
}

function LessonVideoPlayer({ videoUrl, title }: { videoUrl: string | null; title: string }) {
  const url = getSafeVideoUrl(videoUrl);
  if (!url) return <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black/40 p-6 text-center"><span className="text-5xl">🎥</span><p className="font-semibold text-amber-200">Video Coming Soon</p><p className="text-sm text-white/50">Your teacher has not uploaded a recording yet.</p></div>;

  const host = url.hostname.toLowerCase();
  let embed: string | null = null;
  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)?.[1];
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
    if (id) embed = `https://player.vimeo.com/video/${id}`;
  }
  if (embed) return <div className="aspect-video bg-black"><iframe key={embed} src={embed} title={`Video lesson: ${title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full border-0" /></div>;

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return <video key={url.toString()} src={url.toString()} controls preload="metadata" playsInline className="aspect-video w-full bg-black" aria-label={`Video lesson: ${title}`}>Your browser does not support this video format.</video>;

  return <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-black/40 p-6 text-center"><p className="text-sm text-white/70">This video provider cannot be played directly here.</p><a href={url.toString()} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-[#10291E]">Open Video Securely ↗</a></div>;
}
