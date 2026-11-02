
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Section =
  | "overview"
  | "courses"
  | "enrolled"
  | "live"
  | "progress"
  | "attendance"
  | "quran"
  | "profile";

type AttendanceRow = {
  id: string;
  class_id: string;
  status: "present" | "absent" | "late";
  marked_at: string;
};

type DailyDua = {
  id: string;
  title: string;
  category: string;
  arabic_text: string;
  transliteration: string | null;
  translation_en: string | null;
  translation_hi: string | null;
  reference: string | null;
  display_order: number;
  is_published: boolean;
};


type CourseProgress = {
  courseId: string;
  total: number;
  completed: number;
  percentage: number;
};

type LiveClass = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  language: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
};

// Presentation only: course details are always loaded from Supabase.
const courseStyles: Record<string, { icon: string; duration: string; color: string }> = {
  "quran-reading": { icon: "📖", duration: "Beginner Friendly", color: "from-emerald-700/60 to-emerald-950" },
  "tajweed-essentials": { icon: "✨", duration: "All Levels", color: "from-teal-700/60 to-teal-950" },
  "hifz-programme": { icon: "🌙", duration: "Guided Learning", color: "from-green-700/60 to-green-950" },
  "arabic-language": { icon: "✍️", duration: "Beginner Friendly", color: "from-cyan-800/60 to-slate-950" },
  "islamic-studies": { icon: "🕌", duration: "All Levels", color: "from-amber-800/40 to-stone-950" },
  "seerah": { icon: "⭐", duration: "All Levels", color: "from-lime-800/40 to-emerald-950" },
};

const navigation: {
  id: Section;
  label: string;
  icon: string;
}[] = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "courses", label: "Explore Courses", icon: "▤" },
  { id: "enrolled", label: "My Courses", icon: "📚" },
  { id: "live", label: "Live Classes", icon: "📹" },
  { id: "progress", label: "My Progress", icon: "◷" },
  { id: "attendance", label: "My Attendance", icon: "📋" },
  { id: "quran", label: "Quran & Duas", icon: "☾" },
  { id: "profile", label: "My Profile", icon: "♙" },
];

export default function StudentDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [name, setName] = useState("Student");
  const [email, setEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileLanguage, setProfileLanguage] = useState("English");
  const [profileAvatarPath, setProfileAvatarPath] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [enrollmentsError, setEnrollmentsError] = useState("");
  const [progressByCourse, setProgressByCourse] = useState<Record<string, CourseProgress>>({});
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState("");
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attendanceClasses, setAttendanceClasses] = useState<LiveClass[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  
  const [duas, setDuas] = useState<DailyDua[]>([]);
  const [duasLoading, setDuasLoading] = useState(false);
  const [duasError, setDuasError] = useState("");
  const [duaSearch, setDuaSearch] = useState("");
  
  const [duaCategory, setDuaCategory] = useState("All");



  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const fullName = user.user_metadata?.full_name;

        setName(
          typeof fullName === "string" && fullName.trim()
            ? fullName.trim()
            : user.email?.split("@")[0] || "Student"
        );

        setProfileName(typeof fullName === "string" ? fullName : "");
        setProfilePhone(typeof user.user_metadata?.phone_number === "string" ? user.user_metadata.phone_number : "");
        setProfileCountry(typeof user.user_metadata?.country === "string" ? user.user_metadata.country : "");
        setProfileLanguage(["English", "Hindi", "Urdu"].includes(user.user_metadata?.preferred_language) ? user.user_metadata.preferred_language : "English");
        const avatarPath = typeof user.user_metadata?.avatar_path === "string" ? user.user_metadata.avatar_path : "";
        setProfileAvatarPath(avatarPath);
        if (avatarPath) {
          const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600);
          if (active && signed?.signedUrl) setProfileAvatarUrl(signed.signedUrl);
        }
        setEmail(user.email || "");
        setLoading(false);
      } catch {
        if (active) router.replace("/login");
      }
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  
useEffect(() => {
  let active = true;

  async function loadDuas() {
    setDuasLoading(true);
    setDuasError("");

    const { data, error: fetchError } = await supabase
      .from("daily_duas")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true });

    if (!active) return;

    if (fetchError) {
      setDuasError(fetchError.message);
    } else {
      setDuas((data ?? []) as DailyDua[]);
    }

    setDuasLoading(false);
  }

  loadDuas();

  return () => {
    active = false;
  };
}, []);


  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setCoursesLoading(true);
      const { data, error: fetchError } = await supabase
        .from("courses")
        .select("id, title, slug, description, category")
        .order("title", { ascending: true });

      if (!active) return;
      if (fetchError) {
        setCoursesError(fetchError.message);
        setCourses([]);
      } else {
        setCoursesError("");
        setCourses((data ?? []) as Course[]);
      }
      setCoursesLoading(false);
    }

    loadCourses();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadEnrollments() {
      setEnrollmentsLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        setEnrollmentsError("Please sign in to view your enrollments.");
        setEnrollmentsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id);

      if (!active) return;
      if (fetchError) {
        setEnrollmentsError(fetchError.message);
        setEnrolledCourseIds([]);
      } else {
        setEnrollmentsError("");
        setEnrolledCourseIds((data ?? []).map((item) => item.course_id as string));
      }
      setEnrollmentsLoading(false);
    }

    loadEnrollments();
    return () => { active = false; };
  }, []);

  // Fetch the authenticated student's actual lesson progress. Reload when
  // My Progress is opened, including after returning from a course page.
  useEffect(() => {
    let active = true;

    async function loadProgress() {
      if (enrollmentsLoading) return;
      setProgressLoading(true);
      setProgressError("");

      if (enrollmentsError || enrolledCourseIds.length === 0) {
        if (active) {
          setProgressByCourse({});
          setProgressLoading(false);
        }
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Please sign in to view progress.");

        const { data: lessons, error: lessonsError } = await supabase
          .from("lessons")
          .select("id, course_id")
          .in("course_id", enrolledCourseIds);
        if (lessonsError) throw lessonsError;

        const lessonIds = (lessons ?? []).map((lesson) => lesson.id as string);
        let completedIds = new Set<string>();
        if (lessonIds.length > 0) {
          const { data: completed, error: completedError } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("student_id", user.id)
            .in("lesson_id", lessonIds);
          if (completedError) throw completedError;
          completedIds = new Set((completed ?? []).map((row) => row.lesson_id as string));
        }

        const result: Record<string, CourseProgress> = {};
        for (const courseId of enrolledCourseIds) {
          const courseLessons = (lessons ?? []).filter((lesson) => lesson.course_id === courseId);
          const total = courseLessons.length;
          const completed = courseLessons.filter((lesson) => completedIds.has(lesson.id)).length;
          result[courseId] = {
            courseId,
            total,
            completed,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
          };
        }
        if (active) setProgressByCourse(result);
      } catch (err) {
        if (active) {
          setProgressError(err instanceof Error ? err.message : "Unable to load lesson progress.");
          setProgressByCourse({});
        }
      } finally {
        if (active) setProgressLoading(false);
      }
    }

    loadProgress();
    return () => { active = false; };
  }, [section, enrollmentsLoading, enrollmentsError, enrolledCourseIds]);

  // Supabase RLS limits this query to the signed-in student's enrolled courses.
  // Refresh whenever the Live Classes tab is opened.
  useEffect(() => {
    if (section !== "live" || enrollmentsLoading) return;
    let active = true;

    async function loadLiveClasses() {
      setLiveLoading(true);
      setLiveError("");
      if (enrollmentsError) {
        setLiveClasses([]);
        setLiveError(enrollmentsError);
        setLiveLoading(false);
        return;
      }
      if (enrolledCourseIds.length === 0) {
        setLiveClasses([]);
        setLiveLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("live_classes")
        .select("id, course_id, title, description, teacher_name, language, scheduled_at, duration_minutes, meeting_url, status")
        .in("course_id", enrolledCourseIds)
        .order("scheduled_at", { ascending: true });

      if (!active) return;
      if (fetchError) {
        setLiveError(fetchError.message);
        setLiveClasses([]);
      } else {
        setLiveClasses((data ?? []) as LiveClass[]);
      }
      setLiveLoading(false);
    }

    void loadLiveClasses();
    return () => { active = false; };
  }, [section, enrollmentsLoading, enrollmentsError, enrolledCourseIds]);

  // Attendance is fetched for the current authenticated student only.
  // The database RLS policy must also enforce student_id = auth.uid().
  useEffect(() => {
    if (section !== "attendance" || enrollmentsLoading) return;
    let active = true;
    async function loadAttendance() {
      setAttendanceLoading(true);
      setAttendanceError("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Please sign in to view attendance.");
        if (enrollmentsError) throw new Error(enrollmentsError);
        const { data: rows, error: attendanceFetchError } = await supabase
          .from("class_attendance")
          .select("id, class_id, status, marked_at")
          .eq("student_id", user.id)
          .order("marked_at", { ascending: false });
        if (attendanceFetchError) throw attendanceFetchError;
        const records = (rows ?? []) as AttendanceRow[];
        const classIds = [...new Set(records.map((row) => row.class_id))];
        let classRecords: LiveClass[] = [];
        if (classIds.length) {
          const { data: classes, error: classesError } = await supabase
            .from("live_classes")
            .select("id, course_id, title, description, teacher_name, language, scheduled_at, duration_minutes, meeting_url, status")
            .in("id", classIds);
          if (classesError) throw classesError;
          classRecords = (classes ?? []) as LiveClass[];
        }
        if (active) {
          setAttendance(records);
          setAttendanceClasses(classRecords);
        }
      } catch (err) {
        if (active) {
          setAttendance([]);
          setAttendanceClasses([]);
          setAttendanceError(err instanceof Error ? err.message : "Unable to load attendance.");
        }
      } finally {
        if (active) setAttendanceLoading(false);
      }
    }
    void loadAttendance();
    return () => { active = false; };
  }, [section, enrollmentsLoading, enrollmentsError]);

  const enrolledCourses = courses.filter((course) => enrolledCourseIds.includes(course.id));
  const overallLessons = Object.values(progressByCourse).reduce((sum, item) => sum + item.total, 0);
  const overallCompleted = Object.values(progressByCourse).reduce((sum, item) => sum + item.completed, 0);
  const overallPercentage = overallLessons === 0 ? 0 : Math.round((overallCompleted / overallLessons) * 100);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;
    setProfileMessage("");
    setProfileError("");
    const cleanName = profileName.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      setProfileError("Full name must be between 2 and 100 characters.");
      return;
    }
    if (profilePhone.trim().length > 25 || profileCountry.trim().length > 100) {
      setProfileError("Please check the phone number and country length.");
      return;
    }
    setProfileSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Session expired. Please sign in again.");
      let avatarPath = profileAvatarPath;
      if (profilePhoto) {
        if (!(["image/jpeg", "image/png", "image/webp"].includes(profilePhoto.type)) || profilePhoto.size > 2 * 1024 * 1024) {
          throw new Error("Choose a JPG, PNG or WebP photo under 2 MB.");
        }
        const ext = profilePhoto.type === "image/png" ? "png" : profilePhoto.type === "image/webp" ? "webp" : "jpg";
        // Unique filename avoids cached versions and prevents changing another user's files.
        avatarPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(avatarPath, profilePhoto, { contentType: profilePhoto.type, upsert: false });
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          phone_number: profilePhone.trim(),
          country: profileCountry.trim(),
          preferred_language: profileLanguage,
          avatar_path: avatarPath,
        },
      });
      if (updateError) throw updateError;
      setName(cleanName);
      setProfileAvatarPath(avatarPath);
      if (avatarPath) {
        const { data: signed } = await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600);
        if (signed?.signedUrl) setProfileAvatarUrl(signed.signedUrl);
      }
      setProfilePhoto(null);
      setProfileMessage("Profile saved successfully!");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  function navigateTo(nextSection: Section) {
    setSection(nextSection);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#061711] text-amber-200">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-300/20 border-t-amber-300" />
        <p>Preparing your learning space...</p>
      </main>
    );
  }

  const firstName = name.split(" ")[0];

  return (
    <main className="min-h-screen bg-[#071811] text-white">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#09251B] px-5 py-4 lg:hidden">
        <Link href="/" className="font-bold text-amber-300">
          ☪ Hussaini Academy
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenu(!mobileMenu)}
          aria-label="Toggle navigation"
          aria-expanded={mobileMenu}
          className="rounded-lg border border-white/15 px-3 py-2 text-white"
        >
          {mobileMenu ? "✕" : "☰"}
        </button>
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-white/10 bg-gradient-to-b from-[#0D3024] to-[#061610] px-5 py-7 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileMenu
              ? "translate-x-0 pt-20 lg:pt-7"
              : "-translate-x-full"
          }`}
        >
          <Link
            href="/"
            className="hidden text-xl font-extrabold tracking-tight text-amber-300 lg:block"
          >
            ☪ Hussaini Academy
          </Link>

          <p className="mt-3 hidden text-[10px] uppercase tracking-[0.28em] text-white/40 lg:block">
            Knowledge • Character • Faith
          </p>

          <div className="mt-10 rounded-2xl border border-amber-300/15 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8C778] to-[#C69A43] text-lg font-black text-[#10291E]">
                {firstName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {name}
                </p>
                <p className="text-xs text-emerald-300">
                  Student Account
                </p>
              </div>
            </div>
          </div>

          <p className="mb-4 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
            Learning Menu
          </p>

          <nav className="space-y-2" aria-label="Student navigation">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-medium transition ${
                  section === item.id
                    ? "border border-amber-300/20 bg-amber-300/15 text-amber-200"
                    : "border border-transparent text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-6 text-center text-xl">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-10 border-t border-white/10 pt-6">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/65 hover:bg-white/10 hover:text-white"
            >
              <span className="text-lg">⌂</span>
              Back to Website
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-red-200 transition hover:bg-red-400/10 disabled:opacity-50"
            >
              <span className="text-lg">↪</span>
              {loggingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </aside>

        {mobileMenu && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          />
        )}

        {/* Main Content */}
        <div className="min-w-0 flex-1 bg-[radial-gradient(ellipse_at_top_right,_#14513A_0%,_#0A251B_42%,_#061711_100%)]">
          {/* Top Bar */}
          <header className="hidden items-center justify-between border-b border-white/10 px-8 py-6 lg:flex xl:px-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                Student Learning Portal
              </p>
              <p className="mt-1 text-sm text-white/50">
                Your personal learning dashboard
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200">
                ● Account Active
              </div>
              <button
                type="button"
                onClick={() => navigateTo("profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 font-bold text-[#10291E]"
                aria-label="Open profile"
              >
                {firstName.charAt(0).toUpperCase()}
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            {/* OVERVIEW */}
            {section === "overview" && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-r from-[#15533B] via-[#103E2D] to-[#09261D] p-7 shadow-2xl sm:p-10">
                  <div className="pointer-events-none absolute -right-10 -top-12 h-72 w-72 rounded-full border border-amber-300/10" />
                  <div className="pointer-events-none absolute right-8 top-4 h-52 w-52 rounded-full border border-amber-300/10" />
                  <div className="pointer-events-none absolute bottom-[-70px] right-[-20px] text-[220px] leading-none text-amber-300/10">
                    ☾
                  </div>

                  <div className="relative z-10 max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">
                      Assalamu Alaikum
                    </p>

                    <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl xl:text-5xl">
                      Welcome back,{" "}
                      <span className="text-amber-300">
                        {firstName}!
                      </span>
                    </h1>

                    <p className="mt-5 max-w-lg leading-7 text-white/65">
                      Every step towards knowledge is a
                      meaningful step forward. Continue
                      your journey with Hussaini Academy.
                    </p>

                    <button
                      type="button"
                      onClick={() => navigateTo("courses")}
                      className="mt-7 rounded-xl bg-gradient-to-r from-[#E8C778] to-[#C69A43] px-6 py-3.5 text-sm font-bold text-[#10291E] shadow-lg transition hover:brightness-110"
                    >
                      Explore Courses →
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard
                    icon="✓"
                    label="Account Status"
                    value="Active"
                    detail="Your student account"
                  />
                  <StatCard
                    icon="▤"
                    label="My Enrollments"
                    value={enrollmentsLoading ? "Loading..." : enrollmentsError ? "Unavailable" : String(enrolledCourseIds.length)}
                    detail="Courses you have enrolled in"
                  />
                  <StatCard
                    icon="◷"
                    label="Learning Progress"
                    value={progressLoading || enrollmentsLoading ? "Loading..." : progressError || enrollmentsError ? "Unavailable" : `${overallPercentage}%`}
                    detail={progressError ? "Could not load lesson progress" : `${overallCompleted} of ${overallLessons} lessons completed`}
                  />
                </div>

                {/* My enrolled courses preview */}
                <div>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold">My Enrolled Courses</h2>
                    <button type="button" onClick={() => navigateTo("enrolled")} className="text-sm font-semibold text-amber-300 hover:text-amber-200">View My Courses →</button>
                  </div>
                  <EnrolledCoursesList courses={enrolledCourses.slice(0, 3)} loading={enrollmentsLoading || coursesLoading} error={enrollmentsError || coursesError} onExplore={() => navigateTo("courses")} />
                </div>

                {/* Courses */}
                <div>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                        Discover Learning
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">
                        Explore Our Courses
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo("courses")}
                      className="text-sm font-semibold text-amber-300 hover:text-amber-200"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {courses.slice(0, 3).map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                  <CoursesStatus loading={coursesLoading} error={coursesError} count={courses.length} />
                </div>

                {/* Daily inspiration */}
                <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#143B2D] to-[#081E17] p-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                    Quranic Inspiration
                  </p>

                  <p
                    lang="ar"
                    dir="rtl"
                    className="mt-6 text-3xl leading-loose text-amber-200 sm:text-4xl"
                  >
                    وَقُل رَّبِّ زِدْنِي عِلْمًا
                  </p>

                  <p className="mt-4 text-white/75">
                    “My Lord, increase me in knowledge.”
                  </p>

                  <p className="mt-2 text-xs text-amber-300/75">
                    Surah Taha — 20:114
                  </p>
                </div>
              </div>
            )}

            {/* COURSES */}
            {section === "courses" && (
              <div>
                <SectionHeading
                  eyebrow="Discover Knowledge"
                  title="Explore Courses"
                  description="Discover learning paths designed for your Islamic education journey."
                />

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard
                      key={course.title}
                      course={course}
                    />
                  ))}
                </div>

                <CoursesStatus loading={coursesLoading} error={coursesError} count={courses.length} />
                <p className="mt-7 text-sm text-white/50">
                  Select any course to view its details and enroll. Lessons and progress tracking will be available when published.
                </p>
              </div>
            )}

                         {/* MY COURSES */}
             {section === "enrolled" && (
               <div>
                 <SectionHeading eyebrow="Your Learning" title="My Enrolled Courses" description="Courses you have joined at Hussaini Academy." />
                 <EnrolledCoursesList courses={enrolledCourses} loading={enrollmentsLoading || coursesLoading} error={enrollmentsError || coursesError} onExplore={() => navigateTo("courses")} />
               </div>
             )}

             {/* LIVE CLASSES */}
             {section === "live" && (
               <div>
                 <SectionHeading
                   eyebrow="Your Virtual Classroom"
                   title="Live Classes"
                   description="Attend scheduled sessions with your teachers. Times are shown in India Standard Time (IST)."
                 />
                 {liveLoading || enrollmentsLoading ? (
                   <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-amber-200">Loading your live classes...</div>
                 ) : liveError || enrollmentsError ? (
                   <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-7 text-red-200">
                     Could not load live classes: {liveError || enrollmentsError}
                   </div>
                 ) : enrolledCourseIds.length === 0 ? (
                   <div className="rounded-3xl border border-white/10 bg-white/5 p-9 text-center">
                     <div className="text-5xl">📹</div>
                     <h2 className="mt-4 text-xl font-bold">Enroll to join a classroom</h2>
                     <p className="mt-3 text-white/60">Live classes for your enrolled courses will appear here.</p>
                     <button type="button" onClick={() => navigateTo("courses")}
                       className="mt-6 rounded-xl bg-amber-300 px-6 py-3 font-bold text-[#10291E]">Explore Courses →</button>
                   </div>
                 ) : liveClasses.length === 0 ? (
                   <div className="rounded-3xl border border-white/10 bg-white/5 p-9 text-center">
                     <div className="text-5xl">🗓️</div>
                     <h2 className="mt-4 text-xl font-bold">No live classes scheduled yet</h2>
                     <p className="mt-3 text-white/60">Check back when your teacher publishes a class schedule.</p>
                   </div>
                 ) : (
                   <div className="grid gap-5 lg:grid-cols-2">
                     {liveClasses.map((liveClass) => {
                       const course = courses.find((item) => item.id === liveClass.course_id);
                       const joinUrl = getSafeMeetingUrl(liveClass.meeting_url);
                       const canJoin = liveClass.status === "live" && joinUrl !== null;
                       return (
                         <article key={liveClass.id} className="overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#153F30] to-[#081E17] p-6 shadow-lg sm:p-7">
                           <div className="flex flex-wrap items-center justify-between gap-3">
                             <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200">📹 Virtual Classroom</span>
                             <span className={`rounded-full px-3 py-1 text-xs font-semibold ${liveClass.status === "live" ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/65"}`}>
                               {liveClass.status === "live" ? "● Live Now" : liveClass.status.charAt(0).toUpperCase() + liveClass.status.slice(1)}
                             </span>
                           </div>
                           <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-emerald-300">{course?.title ?? "Enrolled Course"}</p>
                           <h2 className="mt-2 text-2xl font-bold text-white">{liveClass.title}</h2>
                           {liveClass.description && <p className="mt-3 text-sm leading-6 text-white/60">{liveClass.description}</p>}
                           <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
                             <div><p className="text-white/45">Date & Time (IST)</p><p className="mt-1 font-semibold text-amber-200">{formatClassTime(liveClass.scheduled_at)}</p></div>
                             <div><p className="text-white/45">Duration</p><p className="mt-1 font-semibold">{liveClass.duration_minutes} minutes</p></div>
                             <div><p className="text-white/45">Teacher</p><p className="mt-1 font-semibold">{liveClass.teacher_name || "To be announced"}</p></div>
                             <div><p className="text-white/45">Teaching Language</p><p className="mt-1 font-semibold">{liveClass.language}</p></div>
                           </div>
                           {canJoin ? (
                             <a href={joinUrl} target="_blank" rel="noopener noreferrer"
                               className="mt-7 inline-flex rounded-xl bg-amber-300 px-6 py-3 font-bold text-[#10291E] transition hover:brightness-110">Join Live Class ↗</a>
                           ) : (
                             <div className="mt-7">
                               <button type="button" disabled className="cursor-not-allowed rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-semibold text-white/45">Join Class — Unavailable</button>
                               <p className="mt-3 text-xs text-white/45">The joining link will be available when the teacher starts the class.</p>
                             </div>
                           )}
                         </article>
                       );
                     })}
                   </div>
                 )}
               </div>
             )}

{/* MY ATTENDANCE */}
            {section === "attendance" && (
              <div>
                <SectionHeading eyebrow="Your Classroom Record" title="My Attendance" description="Attendance recorded by your teachers for live classes." />
                {attendanceLoading || enrollmentsLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-amber-200">Loading attendance...</div>
                ) : attendanceError ? (
                  <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-7 text-red-200">Could not load attendance: {attendanceError}</div>
                ) : (
                  <div className="space-y-7">
                    {(() => {
                      const present = attendance.filter((row) => row.status === "present").length;
                      const absent = attendance.filter((row) => row.status === "absent").length;
                      const late = attendance.filter((row) => row.status === "late").length;
                      const percentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
                      return (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard icon="📋" label="Marked Classes" value={String(attendance.length)} detail="Classes with attendance recorded" />
                            <StatCard icon="✓" label="Present" value={String(present)} detail="Marked present" />
                            <StatCard icon="◷" label="Late" value={String(late)} detail="Marked late" />
                            <StatCard icon="✕" label="Absent" value={String(absent)} detail="Marked absent" />
                          </div>
                          <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#174B37] to-[#0A251B] p-7">
                            <p className="text-sm text-white/60">Present attendance rate (marked classes only)</p>
                            <h2 className="mt-3 text-4xl font-bold text-amber-300">{attendance.length ? `${percentage}%` : "—"}</h2>
                            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Present attendance rate" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400" style={{ width: `${percentage}%` }} />
                            </div>
                            <p className="mt-3 text-xs text-white/50">Late is counted separately. Unmarked classes are not included in this percentage.</p>
                          </div>
                        </>
                      );
                    })()}
                    <div>
                      <h2 className="mb-5 text-2xl font-bold">Class Attendance History</h2>
                      {attendance.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-white/60">No attendance has been marked for your classes yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {attendance.map((row) => {
                            const classItem = attendanceClasses.find((item) => item.id === row.class_id);
                            const course = courses.find((item) => item.id === classItem?.course_id);
                            return (
                              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                                <div>
                                  <p className="text-xs text-emerald-300">{course?.title || "Live Class"}</p>
                                  <h3 className="mt-1 font-semibold">{classItem?.title || "Class attendance"}</h3>
                                  <p className="mt-2 text-xs text-white/50">{classItem ? `Class: ${formatClassTime(classItem.scheduled_at)}` : `Marked: ${formatClassTime(row.marked_at)}`}</p>
                                </div>
                                <span className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${row.status === "present" ? "bg-emerald-400/15 text-emerald-200" : row.status === "late" ? "bg-amber-300/15 text-amber-200" : "bg-red-400/15 text-red-200"}`}>{row.status}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* PROGRESS */}
            {section === "progress" && (
              <div>
                <SectionHeading
                  eyebrow="Your Learning Journey"
                  title="My Progress"
                  description="Track completed lessons and continue your enrolled courses."
                />

                {enrollmentsLoading || coursesLoading || progressLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-amber-200">
                    Loading your learning progress...
                  </div>
                ) : enrollmentsError || coursesError || progressError ? (
                  <div role="alert" className="rounded-3xl border border-red-400/30 bg-red-500/10 p-8 text-red-200">
                    Unable to load progress: {enrollmentsError || coursesError || progressError}
                  </div>
                ) : enrolledCourses.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                    <div className="text-6xl">📊</div>
                    <h2 className="mt-5 text-2xl font-bold">Your Progress Starts Here</h2>
                    <p className="mx-auto mt-3 max-w-lg leading-7 text-white/60">
                      Enroll in a course to begin tracking your learning journey.
                    </p>
                    <button type="button" onClick={() => navigateTo("courses")}
                      className="mt-7 rounded-xl bg-amber-300 px-6 py-3 font-bold text-[#10291E]">
                      Explore Courses →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-7">
                    <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#174B37] to-[#0A251B] p-7 sm:p-9">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Overall Learning Progress</p>
                      <div className="mt-5 flex items-end justify-between gap-4">
                        <h2 className="text-3xl font-extrabold sm:text-4xl">{overallPercentage}% Complete</h2>
                        <span className="text-sm text-white/65">{overallCompleted} / {overallLessons} lessons</span>
                      </div>
                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15"
                        role="progressbar" aria-label="Overall learning progress"
                        aria-valuenow={overallPercentage} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-500"
                          style={{ width: `${overallPercentage}%` }} />
                      </div>
                      <p className="mt-4 text-sm text-white/60">
                        {overallLessons === 0
                          ? "Your enrolled courses do not have published lessons yet."
                          : overallPercentage === 100
                            ? "Congratulations! You have completed all available lessons."
                            : "Keep learning and completing lessons to grow your progress."}
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      {enrolledCourses.map((course) => {
                        const progress = progressByCourse[course.id] ?? { total: 0, completed: 0, percentage: 0 };
                        const style = courseStyles[course.slug] ?? { icon: "📚", duration: "Learning Course", color: "from-emerald-800/60 to-slate-950" };
                        return (
                          <div key={course.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition hover:border-amber-300/30">
                            <div className="flex items-start gap-4">
                              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-3xl ${style.color}`}>
                                {style.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Enrolled Course</p>
                                <h3 className="mt-1 text-xl font-bold">{course.title}</h3>
                              </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                              <span className="text-white/60">{progress.completed} of {progress.total} lessons completed</span>
                              <span className="font-bold text-amber-300">{progress.percentage}%</span>
                            </div>
                            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15"
                              role="progressbar" aria-label={`${course.title} progress`}
                              aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-500"
                                style={{ width: `${progress.percentage}%` }} />
                            </div>
                            {progress.total === 0 && <p className="mt-3 text-xs text-white/50">Lessons coming soon.</p>}
                            <Link href={`/courses/${encodeURIComponent(course.slug)}`}
                              className="mt-6 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-[#10291E] transition hover:brightness-110">
                              {progress.percentage === 100 && progress.total > 0 ? "Review Course →" : "Continue Learning →"}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QURAN & DUAS */}
            {section === "quran" && (
              <div>
                <SectionHeading
                  eyebrow="Faith & Reflection"
                  title="Quran & Daily Duas"
                  description="A space for Quranic reflection and authentic daily supplications."
                />

                <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#174B37] to-[#081E17] p-8 text-center sm:p-12">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                    Dua for Knowledge
                  </p>

                  <p
                    lang="ar"
                    dir="rtl"
                    className="mt-7 text-3xl leading-loose text-amber-200 sm:text-5xl"
                  >
                    رَّبِّ زِدْنِي عِلْمًا
                  </p>

                  <p className="mt-5 text-lg text-white/80">
                    My Lord, increase me in knowledge.
                  </p>

                  <p className="mt-3 text-sm text-amber-300">
                    Quran 20:114
                  </p>
                </div>


<div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
  <h3 className="text-2xl font-bold text-white">
    Daily Duas Library
  </h3>

  <p className="mt-2 text-sm text-white/60">
    Authentic daily supplications with Arabic text,
    translations and references.
  </p>

  <input
    type="text"
    value={duaSearch}
    onChange={(e) => setDuaSearch(e.target.value)}
    placeholder="Search duas..."
    className="mt-6 w-full rounded-xl border border-white/15 bg-[#081E17] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-amber-300"
  />

  
<div className="mt-5 flex flex-wrap gap-2">
  {["All", ...new Set(duas.map((dua) => dua.category))].map(
    (category) => (
      <button
        key={category}
        type="button"
        onClick={() => setDuaCategory(category)}
        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
          duaCategory === category
            ? "border-amber-300 bg-amber-300 text-[#082018]"
            : "border-white/15 bg-white/5 text-white/70 hover:border-amber-300/50 hover:text-amber-200"
        }`}
      >
        {category}
      </button>
    )
  )}
</div>


  {duasLoading ? (
    <p className="mt-6 text-amber-300">
      Loading duas...
    </p>
  ) : duasError ? (
    <p className="mt-6 text-red-300">
      {duasError}
    </p>
  ) : (
    <div className="mt-6 grid gap-5">
      
{duas
  .filter(
    (dua) =>
      (duaCategory === "All" ||
        dua.category === duaCategory) &&
      `${dua.title} ${dua.category} ${dua.transliteration ?? ""}`
        .toLowerCase()
        .includes(duaSearch.toLowerCase())
  )
  .map((dua) => (

          <div
            key={dua.id}
            className="rounded-2xl border border-amber-300/15 bg-gradient-to-br from-[#123D2D] to-[#071A14] p-6"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              {dua.category}
            </p>

            <h4 className="mt-2 text-xl font-bold text-white">
              {dua.title}
            </h4>

            <p
              lang="ar"
              dir="rtl"
              className="mt-6 text-right text-3xl leading-[2.2] text-amber-100"
            >
              {dua.arabic_text}
            </p>

            {dua.transliteration && (
              <p className="mt-5 text-sm italic leading-7 text-emerald-200">
                {dua.transliteration}
              </p>
            )}

            {dua.translation_en && (
              <p className="mt-4 leading-7 text-white/80">
                {dua.translation_en}
              </p>
            )}

            {dua.translation_hi && (
              <p className="mt-3 leading-7 text-white/65">
                {dua.translation_hi}
              </p>
            )}

            {dua.reference && (
              <p className="mt-5 border-t border-white/10 pt-4 text-xs text-amber-300">
                Reference: {dua.reference}
              </p>
            )}
          </div>
        ))}

      {duas.length === 0 && (
        <p className="text-sm text-white/60">
          No published duas available.
        </p>
      )}
    </div>
  )}
</div>

              </div>
            )}

            {/* PROFILE */}
            {section === "profile" && (
              <div>
                <SectionHeading
                  eyebrow="Student Account"
                  title="My Profile"
                  description="Manage your Hussaini Academy student profile and learning preferences."
                />
                <div className="max-w-3xl rounded-3xl border border-amber-300/15 bg-gradient-to-br from-[#123B2D] to-[#081E17] p-6 sm:p-10">
                  <div className="mb-8 flex flex-wrap items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8C778] to-[#C69A43] text-3xl font-black text-[#10291E]">
                      {profileAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileAvatarUrl} alt="Your profile" className="h-full w-full object-cover" />
                      ) : firstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="break-words text-2xl font-bold">{name}</h2>
                      <p className="mt-1 text-sm text-emerald-300">Student Account</p>
                      <p className="mt-1 break-all text-xs text-white/50">{email}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6 border-t border-white/10 pt-7">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block text-sm text-white/75">
                        Full Name <span className="text-amber-300">*</span>
                        <input type="text" required minLength={2} maxLength={100} value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/15 bg-[#071B14] px-4 py-3 text-white outline-none focus:border-amber-300" />
                      </label>
                      <label className="block text-sm text-white/75">
                        Phone Number
                        <input type="tel" maxLength={25} value={profilePhone} placeholder="+91 9876543210"
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/15 bg-[#071B14] px-4 py-3 text-white outline-none focus:border-amber-300" />
                      </label>
                      <label className="block text-sm text-white/75">
                        Country
                        <input type="text" maxLength={100} value={profileCountry} placeholder="India"
                          onChange={(e) => setProfileCountry(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/15 bg-[#071B14] px-4 py-3 text-white outline-none focus:border-amber-300" />
                      </label>
                      <label className="block text-sm text-white/75">
                        Preferred Language
                        <select value={profileLanguage} onChange={(e) => setProfileLanguage(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/15 bg-[#071B14] px-4 py-3 text-white outline-none focus:border-amber-300">
                          <option value="English">English</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Urdu">Urdu</option>
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm text-white/75">
                      Profile Photo <span className="text-xs text-white/40">(JPG, PNG or WebP, max 2 MB)</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setProfilePhoto(file);
                          setProfileMessage("");
                        }}
                        className="mt-2 block w-full rounded-xl border border-white/15 bg-[#071B14] p-3 text-sm text-white/75 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-300 file:px-3 file:py-2 file:font-bold file:text-[#10291E]" />
                      {profilePhoto && <span className="mt-2 block text-xs text-emerald-200">Selected: {profilePhoto.name}</span>}
                    </label>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                      <p className="font-semibold text-white/80">Account Email</p>
                      <p className="mt-1 break-all">{email}</p>
                      <p className="mt-2 text-xs">Email and account role cannot be changed here.</p>
                    </div>
                    {profileError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{profileError}</p>}
                    {profileMessage && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{profileMessage}</p>}
                    <button type="submit" disabled={profileSaving}
                      className="rounded-xl bg-gradient-to-r from-[#E8C778] to-[#C69A43] px-7 py-3.5 text-sm font-bold text-[#10291E] transition hover:brightness-110 disabled:opacity-50">
                      {profileSaving ? "Saving Profile..." : "Save Profile Changes"}
                    </button>
                  </form>
                  <div className="mt-8 border-t border-white/10 pt-6">
                    <button type="button" onClick={handleLogout} disabled={loggingOut}
                      className="rounded-xl border border-red-400/30 px-6 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-50">
                      {loggingOut ? "Signing Out..." : "Sign Out of Account"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-white/35">
              © 2026 Hussaini Academy • Knowledge • Character • Faith
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

function EnrolledCoursesList({ courses, loading, error, onExplore }: {
  courses: Course[];
  loading: boolean;
  error: string;
  onExplore: () => void;
}) {
  if (loading) return <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-amber-200">Loading your courses...</p>;
  if (error) return <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-200">Unable to load enrollments: {error}</p>;
  if (courses.length === 0) return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="text-4xl">📚</div>
      <h3 className="mt-4 text-xl font-bold">No enrolled courses yet</h3>
      <p className="mt-3 text-sm text-white/60">Explore a course and select Enroll Now to add it here.</p>
      <button type="button" onClick={onExplore} className="mt-6 rounded-xl bg-amber-300 px-5 py-3 font-bold text-[#10291E]">Explore Courses →</button>
    </div>
  );
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => {
        const style = courseStyles[course.slug] ?? { icon: "📚", duration: "Learning Course", color: "from-emerald-800/60 to-slate-950" };
        return (
          <Link key={course.id} href={`/courses/${encodeURIComponent(course.slug)}`} className="group overflow-hidden rounded-2xl border border-amber-300/20 bg-white/[0.06] transition hover:-translate-y-1 hover:border-amber-300/40">
            <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${style.color}`}><span className="text-5xl">{style.icon}</span></div>
            <div className="p-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">✓ Enrolled</span>
              <h3 className="mt-3 text-xl font-bold">{course.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{course.description || "Course details available on the course page."}</p>
              <div className="mt-5 border-t border-white/10 pt-4 text-sm font-semibold text-amber-300">View Course →</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition hover:border-amber-300/20">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300/10 text-xl text-amber-300">
        {icon}
      </div>

      <p className="text-sm text-white/55">{label}</p>
      <h3 className="mt-2 text-xl font-bold text-amber-200">
        {value}
      </h3>
      <p className="mt-2 text-xs text-white/40">
        {detail}
      </p>
    </div>
  );
}

function CourseCard({
  course,
}: {
  course: Course;
}) {
  const style = courseStyles[course.slug] ?? {
    icon: "📚",
    duration: "Learning Course",
    color: "from-emerald-800/60 to-slate-950",
  };

  return (
    <Link
      href={`/courses/${encodeURIComponent(course.slug)}`}
      aria-label={`View details for ${course.title}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] transition hover:-translate-y-1 hover:border-amber-300/30 hover:shadow-xl">
      <div
        className={`flex h-36 items-center justify-center bg-gradient-to-br ${style.color}`}
      >
        <span className="text-6xl transition-transform group-hover:scale-110">
          {style.icon}
        </span>
      </div>

      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-300">
          {course.category || "Islamic Learning"}
        </p>

        <h3 className="mt-3 text-xl font-bold">
          {course.title}
        </h3>

        <p className="mt-3 min-h-20 text-sm leading-7 text-white/55">
          {course.description || "Course details coming soon."}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-emerald-300">
            {style.duration}
          </span>

          <span className="text-xs font-semibold text-amber-300">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}

function CoursesStatus({ loading, error, count }: { loading: boolean; error: string; count: number }) {
  if (loading) return <p className="mt-5 text-sm text-amber-200">Loading courses from Supabase...</p>;
  if (error) return <p role="alert" className="mt-5 text-sm text-red-300">Could not load courses: {error}. Check the courses table SELECT policy.</p>;
  if (count === 0) return <p className="mt-5 text-sm text-white/60">No courses are available yet.</p>;
  return null;
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-white/60">
        {description}
      </p>
    </div>
  );
}

function formatClassTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// Only allow normal HTTPS meeting URLs. RLS and backend authorization remain essential.
function getSafeMeetingUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
