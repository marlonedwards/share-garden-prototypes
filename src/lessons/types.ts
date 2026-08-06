import { ComponentType } from "react";
import { CheckItem } from "../lib/checkpoints";

// The stepped-lesson contract. A lesson is an ordered list of screens; the
// shell shows exactly one screen at a time (progress dots, one paragraph,
// one stage OR one quick-check item, one Continue). See docs/course-style.md.

export interface StageProps {
  // A stage calls this once its interaction has actually been used. Screens
  // marked `gated` keep Continue disabled until it fires.
  onComplete: () => void;
}

interface LessonScreenBase {
  // Small gray label above the paragraph, e.g. "Cash · The jar".
  eyebrow: string;
  // One bold, complete, textbook-clean sentence. Definition first, always.
  definition: string;
  // Story elaboration in complete sentences (Maya and Jordan for intros).
  story: string;
}

// Every screen carries a stage OR a check item, never neither: the layout law
// forbids reading-only screens, so the type refuses to compile one.
export type LessonScreen =
  | (LessonScreenBase & {
      // The interactive stage for this screen.
      stage: ComponentType<StageProps>;
      check?: never;
      // Continue stays disabled until the stage calls onComplete. Defaults to
      // TRUE; set `gated: false` only when merely seeing the stage is enough.
      gated?: boolean;
    })
  | (LessonScreenBase & {
      // A quick-check item; the check card renders instead of a stage.
      // Check screens are always gated on answering.
      check: CheckItem;
      stage?: never;
      gated?: never;
    });

export interface LessonConfig {
  // Canonical ladder id: cash, savings, stocks, funds, coins.
  id: string;
  title: string;
  sub: string;
  // CEE benchmark tag shown in the header; details in code comments per lesson.
  standard: string;
  // The field-guide marble this lesson's strip indicator watches.
  marble: { concept: string; color: string };
  screens: LessonScreen[];
}
