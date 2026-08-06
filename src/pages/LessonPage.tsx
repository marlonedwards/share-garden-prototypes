import { Navigate, useLocation, useParams } from "react-router-dom";
import LessonShell from "../components/LessonShell";
import { canonicalLessonId, getLesson } from "../lessons";

// Route wrapper for the stepped intro lessons. /orb/learn/:id is the
// canonical path; the old /orb/mini/:id URLs (and old ids like "share")
// redirect here so every link ever shared keeps working.

export default function LessonPage() {
  const { id } = useParams();
  const location = useLocation();
  const canon = canonicalLessonId(id);

  // Unknown id: land on the first rung of the ladder.
  if (!canon) return <Navigate to="/orb/learn/cash" replace />;

  // Legacy path or legacy id: move to the canonical URL.
  const isLegacyPath = location.pathname.startsWith("/orb/mini/");
  if (isLegacyPath || canon !== id) return <Navigate to={`/orb/learn/${canon}`} replace />;

  const lesson = getLesson(canon)!;
  // Keyed by the navigation itself, not just the lesson id, so navigating to a
  // lesson URL you are already inside remounts the shell back at step 1.
  return <LessonShell key={`${lesson.id}:${location.key}`} lesson={lesson} />;
}
