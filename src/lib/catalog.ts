/**
 * Standard-gym exercise catalog (Notion: "Create standard-gym exercise catalog").
 * The AI planner may ONLY pick exercises from this list — any slug it invents is rejected.
 * Form is shown with original illustrations (src/lib/figure) — every exercise must have one.
 */

export type Muscle =
  | "chest" | "front_delts" | "side_delts" | "rear_delts" | "triceps" | "biceps" | "forearms"
  | "lats" | "upper_back" | "lower_back" | "core" | "glutes" | "quads" | "hamstrings" | "calves" | "cardio";

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "bench" | "cardio_machine";
export type Pattern = "push_h" | "push_v" | "pull_h" | "pull_v" | "squat" | "hinge" | "lunge" | "isolation" | "core" | "conditioning";
export type Level = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  slug: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment[];
  pattern: Pattern;
  level: Level;
  compound: boolean;
  instructions: string[];
  cues: string[];
  substitutions: string[];
  /** Movements that load the spine heavily or need skill — avoided when the user reports limitations. */
  highRisk?: boolean;
  tags: string[];
}

const ex = (e: Omit<Exercise, "tags"> & { tags?: string[] }): Exercise => ({
  tags: [...(e.tags ?? []), ...e.primary, ...e.equipment, e.pattern],
  ...e,
});

export const CATALOG: Exercise[] = [
  // ── Push (horizontal)
  ex({ slug: "barbell-bench-press", name: "Barbell Bench Press", primary: ["chest"], secondary: ["front_delts", "triceps"], equipment: ["barbell", "bench"], pattern: "push_h", level: "intermediate", compound: true,
    instructions: ["Lie on the bench with eyes under the bar and feet flat.", "Grip slightly wider than shoulder width and unrack with straight arms.", "Lower the bar to mid-chest with elbows ~45° from your torso.", "Press back up until arms are straight."],
    cues: ["Shoulder blades back and down", "Keep wrists stacked over elbows"], substitutions: ["dumbbell-bench-press", "machine-chest-press", "push-up"], highRisk: true }),
  ex({ slug: "dumbbell-bench-press", name: "Dumbbell Bench Press", primary: ["chest"], secondary: ["front_delts", "triceps"], equipment: ["dumbbell", "bench"], pattern: "push_h", level: "beginner", compound: true,
    instructions: ["Sit with dumbbells on your thighs, then lie back and bring them to chest level.", "Press up until arms are straight, dumbbells over your shoulders.", "Lower slowly until elbows are just below the bench."],
    cues: ["Control the descent", "Don't let the dumbbells clash at the top"], substitutions: ["machine-chest-press", "push-up"] }),
  ex({ slug: "incline-dumbbell-press", name: "Incline Dumbbell Press", primary: ["chest", "front_delts"], secondary: ["triceps"], equipment: ["dumbbell", "bench"], pattern: "push_h", level: "beginner", compound: true,
    instructions: ["Set the bench to 30–45°.", "Press dumbbells up from upper-chest level.", "Lower under control to a comfortable stretch."],
    cues: ["Keep your back on the pad", "Elbows slightly tucked"], substitutions: ["dumbbell-bench-press", "machine-chest-press"] }),
  ex({ slug: "machine-chest-press", name: "Machine Chest Press", primary: ["chest"], secondary: ["front_delts", "triceps"], equipment: ["machine"], pattern: "push_h", level: "beginner", compound: true,
    instructions: ["Adjust the seat so handles are at mid-chest.", "Press handles forward until arms are nearly straight.", "Return slowly until you feel a stretch in the chest."],
    cues: ["Keep shoulders down", "Don't lock elbows hard"], substitutions: ["dumbbell-bench-press", "push-up"] }),
  ex({ slug: "push-up", name: "Push-up", primary: ["chest"], secondary: ["triceps", "front_delts", "core"], equipment: ["bodyweight"], pattern: "push_h", level: "beginner", compound: true,
    instructions: ["Hands slightly wider than shoulders, body in a straight line.", "Lower until your chest is just above the floor.", "Push back to the start."],
    cues: ["Squeeze glutes", "Elevate hands on a bench to make it easier"], substitutions: ["machine-chest-press"] }),
  ex({ slug: "cable-fly", name: "Cable Fly", primary: ["chest"], secondary: ["front_delts"], equipment: ["cable"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Set pulleys at shoulder height and step forward into a split stance.", "With a soft bend in the elbows, bring handles together in front of your chest.", "Return slowly to a comfortable stretch."],
    cues: ["Hug a barrel", "Keep the elbow angle fixed"], substitutions: ["dumbbell-bench-press"] }),

  // ── Push (vertical)
  ex({ slug: "dumbbell-shoulder-press", name: "Seated Dumbbell Shoulder Press", primary: ["front_delts", "side_delts"], secondary: ["triceps"], equipment: ["dumbbell", "bench"], pattern: "push_v", level: "beginner", compound: true,
    instructions: ["Sit upright with back support, dumbbells at shoulder height.", "Press overhead until arms are straight.", "Lower back to shoulder height."],
    cues: ["Ribs down", "Don't arch your lower back"], substitutions: ["machine-shoulder-press"] }),
  ex({ slug: "machine-shoulder-press", name: "Machine Shoulder Press", primary: ["front_delts", "side_delts"], secondary: ["triceps"], equipment: ["machine"], pattern: "push_v", level: "beginner", compound: true,
    instructions: ["Adjust the seat so handles start at shoulder height.", "Press up until arms are nearly straight.", "Lower under control."],
    cues: ["Keep head neutral"], substitutions: ["dumbbell-shoulder-press"] }),
  ex({ slug: "barbell-overhead-press", name: "Barbell Overhead Press", primary: ["front_delts", "side_delts"], secondary: ["triceps", "core"], equipment: ["barbell"], pattern: "push_v", level: "intermediate", compound: true,
    instructions: ["Stand with the bar on your front shoulders, grip just outside shoulders.", "Brace and press the bar straight up, moving your head back slightly.", "Lock out overhead, then lower to the shoulders."],
    cues: ["Glutes tight", "Bar path straight up"], substitutions: ["dumbbell-shoulder-press", "machine-shoulder-press"], highRisk: true }),
  ex({ slug: "lateral-raise", name: "Dumbbell Lateral Raise", primary: ["side_delts"], secondary: [], equipment: ["dumbbell"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Stand with light dumbbells at your sides.", "Raise arms out to the side to shoulder height with a slight elbow bend.", "Lower slowly."],
    cues: ["Lead with elbows", "No swinging"], substitutions: ["cable-lateral-raise"] }),
  ex({ slug: "cable-lateral-raise", name: "Cable Lateral Raise", primary: ["side_delts"], secondary: [], equipment: ["cable"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Stand side-on to a low pulley, handle in the far hand.", "Raise the arm out to shoulder height.", "Lower slowly."], cues: ["Keep torso still"], substitutions: ["lateral-raise"] }),

  // ── Triceps / biceps
  ex({ slug: "triceps-pushdown", name: "Cable Triceps Pushdown", primary: ["triceps"], secondary: [], equipment: ["cable"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Grip the rope or bar at a high pulley, elbows at your sides.", "Extend elbows until arms are straight.", "Return until forearms are just above parallel."],
    cues: ["Elbows pinned", "Squeeze at the bottom"], substitutions: ["ez-bar-lying-triceps-extension"] }),
  ex({ slug: "ez-bar-lying-triceps-extension", name: "EZ Barbell Lying Triceps Extension", primary: ["triceps"], secondary: [], equipment: ["barbell", "bench"], pattern: "isolation", level: "intermediate", compound: false,
    instructions: ["Lie on a bench holding an EZ bar over your chest.", "Bend at the elbows to lower the bar toward your forehead.", "Extend back to the start."],
    cues: ["Upper arms stay still", "Go light — elbows are sensitive"], substitutions: ["triceps-pushdown"] }),
  ex({ slug: "dumbbell-curl", name: "Dumbbell Biceps Curl", primary: ["biceps"], secondary: ["forearms"], equipment: ["dumbbell"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Stand with dumbbells at your sides, palms forward.", "Curl up by bending the elbows.", "Lower slowly to full extension."], cues: ["No swinging", "Elbows by your sides"], substitutions: ["cable-curl"] }),
  ex({ slug: "cable-curl", name: "Cable Curl", primary: ["biceps"], secondary: ["forearms"], equipment: ["cable"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Grip a bar on a low pulley.", "Curl toward your shoulders.", "Lower under control."], cues: ["Keep tension at the bottom"], substitutions: ["dumbbell-curl"] }),
  ex({ slug: "hammer-curl", name: "Hammer Curl", primary: ["biceps", "forearms"], secondary: [], equipment: ["dumbbell"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Hold dumbbells with palms facing each other.", "Curl up keeping the neutral grip.", "Lower slowly."], cues: ["Thumbs up"], substitutions: ["dumbbell-curl"] }),

  // ── Pull
  ex({ slug: "lat-pulldown", name: "Lat Pulldown", primary: ["lats"], secondary: ["biceps", "upper_back"], equipment: ["machine", "cable"], pattern: "pull_v", level: "beginner", compound: true,
    instructions: ["Sit with thighs under the pads, grip the bar slightly wider than shoulders.", "Pull the bar to your upper chest.", "Return with control until arms are straight."],
    cues: ["Chest up", "Drive elbows down"], substitutions: ["assisted-pull-up"] }),
  ex({ slug: "assisted-pull-up", name: "Assisted Pull-up", primary: ["lats"], secondary: ["biceps", "upper_back"], equipment: ["machine"], pattern: "pull_v", level: "beginner", compound: true,
    instructions: ["Kneel on the assist pad and grip the handles.", "Pull until your chin clears the bar.", "Lower to full arm extension."], cues: ["Avoid kipping"], substitutions: ["lat-pulldown"] }),
  ex({ slug: "pull-up", name: "Pull-up", primary: ["lats"], secondary: ["biceps", "upper_back", "core"], equipment: ["bodyweight"], pattern: "pull_v", level: "intermediate", compound: true,
    instructions: ["Hang from the bar with an overhand grip.", "Pull until your chin is over the bar.", "Lower all the way down."], cues: ["Shoulders down first"], substitutions: ["assisted-pull-up", "lat-pulldown"] }),
  ex({ slug: "seated-cable-row", name: "Seated Cable Row", primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"], equipment: ["cable"], pattern: "pull_h", level: "beginner", compound: true,
    instructions: ["Sit with feet on the platform and a slight knee bend.", "Row the handle to your stomach.", "Extend arms forward under control."], cues: ["Torso stays upright", "Squeeze shoulder blades"], substitutions: ["chest-supported-row"] }),
  ex({ slug: "chest-supported-row", name: "Chest-Supported Dumbbell Row", primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"], equipment: ["dumbbell", "bench"], pattern: "pull_h", level: "beginner", compound: true,
    instructions: ["Lie face-down on an incline bench with dumbbells hanging.", "Row dumbbells toward your hips.", "Lower to full stretch."], cues: ["Chest stays on the pad"], substitutions: ["seated-cable-row"] }),
  ex({ slug: "barbell-row", name: "Barbell Bent-Over Row", primary: ["upper_back", "lats"], secondary: ["biceps", "lower_back"], equipment: ["barbell"], pattern: "pull_h", level: "intermediate", compound: true,
    instructions: ["Hinge to ~45° with a flat back, bar hanging at arm's length.", "Row the bar to your lower ribs.", "Lower under control."], cues: ["Neutral spine throughout"], substitutions: ["chest-supported-row", "seated-cable-row"], highRisk: true }),
  ex({ slug: "face-pull", name: "Cable Face Pull", primary: ["rear_delts"], secondary: ["upper_back"], equipment: ["cable"], pattern: "pull_h", level: "beginner", compound: false,
    instructions: ["Set a rope at face height.", "Pull toward your forehead, hands finishing beside your ears.", "Return slowly."], cues: ["Elbows high"], substitutions: ["chest-supported-row"] }),

  // ── Legs: squat / lunge
  ex({ slug: "goblet-squat", name: "Goblet Squat", primary: ["quads", "glutes"], secondary: ["core"], equipment: ["dumbbell", "kettlebell"], pattern: "squat", level: "beginner", compound: true,
    instructions: ["Hold a dumbbell vertically at your chest.", "Squat down between your knees, chest tall.", "Drive through mid-foot to stand."], cues: ["Knees track over toes", "Sit between your hips"], substitutions: ["leg-press"] }),
  ex({ slug: "barbell-back-squat", name: "Barbell Back Squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "lower_back", "core"], equipment: ["barbell"], pattern: "squat", level: "intermediate", compound: true,
    instructions: ["Set the bar on your upper back and unrack.", "Brace, then squat until hips are at least level with knees.", "Drive up through the whole foot."], cues: ["Big breath and brace", "Knees out"], substitutions: ["goblet-squat", "leg-press"], highRisk: true }),
  ex({ slug: "leg-press", name: "Leg Press", primary: ["quads", "glutes"], secondary: ["hamstrings"], equipment: ["machine"], pattern: "squat", level: "beginner", compound: true,
    instructions: ["Sit with feet shoulder-width on the platform.", "Lower until knees reach ~90°.", "Press back without locking knees."], cues: ["Lower back stays on the pad"], substitutions: ["goblet-squat"] }),
  ex({ slug: "walking-lunge", name: "Dumbbell Walking Lunge", primary: ["quads", "glutes"], secondary: ["hamstrings", "core"], equipment: ["dumbbell"], pattern: "lunge", level: "beginner", compound: true,
    instructions: ["Hold dumbbells at your sides.", "Step forward and lower until the back knee nearly touches the floor.", "Push through the front foot and step into the next rep."], cues: ["Torso tall"], substitutions: ["split-squat"] }),
  ex({ slug: "split-squat", name: "Split Squat", primary: ["quads", "glutes"], secondary: ["hamstrings"], equipment: ["bodyweight", "dumbbell"], pattern: "lunge", level: "beginner", compound: true,
    instructions: ["Take a long stride stance.", "Lower straight down until the back knee nearly touches the floor.", "Drive back up; finish all reps then switch legs."], cues: ["Front heel planted"], substitutions: ["walking-lunge", "leg-press"] }),
  ex({ slug: "leg-extension", name: "Leg Extension", primary: ["quads"], secondary: [], equipment: ["machine"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Align knees with the machine pivot.", "Extend legs until straight.", "Lower slowly."], cues: ["Pause at the top"], substitutions: ["split-squat"] }),

  // ── Legs: hinge
  ex({ slug: "romanian-deadlift", name: "Dumbbell Romanian Deadlift", primary: ["hamstrings", "glutes"], secondary: ["lower_back"], equipment: ["dumbbell"], pattern: "hinge", level: "beginner", compound: true,
    instructions: ["Stand holding dumbbells in front of your thighs.", "Push hips back, lowering the weights along your legs with a flat back.", "Stop at a strong hamstring stretch and stand back up."], cues: ["Soft knees", "Hips back, not down"], substitutions: ["hip-thrust", "leg-curl"] }),
  ex({ slug: "barbell-deadlift", name: "Barbell Deadlift", primary: ["hamstrings", "glutes", "lower_back"], secondary: ["upper_back", "forearms", "quads"], equipment: ["barbell"], pattern: "hinge", level: "advanced", compound: true,
    instructions: ["Stand mid-foot under the bar, grip just outside your legs.", "Brace, pull the slack out, and push the floor away.", "Lock out with hips and knees together, then lower with control."], cues: ["Bar stays close", "Neutral spine"], substitutions: ["romanian-deadlift", "hip-thrust"], highRisk: true }),
  ex({ slug: "hip-thrust", name: "Hip Thrust", primary: ["glutes"], secondary: ["hamstrings"], equipment: ["barbell", "bench", "machine"], pattern: "hinge", level: "beginner", compound: true,
    instructions: ["Upper back on a bench, weight across your hips.", "Drive hips up until your body is level from knees to shoulders.", "Lower under control."], cues: ["Chin tucked", "Squeeze glutes at the top"], substitutions: ["romanian-deadlift"] }),
  ex({ slug: "leg-curl", name: "Seated Leg Curl", primary: ["hamstrings"], secondary: [], equipment: ["machine"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Align knees with the pivot.", "Curl the pad down and back.", "Return slowly."], cues: ["Hips stay down"], substitutions: ["romanian-deadlift"] }),
  ex({ slug: "calf-raise", name: "Standing Calf Raise", primary: ["calves"], secondary: [], equipment: ["machine", "bodyweight"], pattern: "isolation", level: "beginner", compound: false,
    instructions: ["Balls of feet on the edge of a step or platform.", "Rise as high as possible.", "Lower to a full stretch."], cues: ["Pause at the top and bottom"], substitutions: [] }),

  // ── Core
  ex({ slug: "plank", name: "Plank", primary: ["core"], secondary: ["glutes"], equipment: ["bodyweight"], pattern: "core", level: "beginner", compound: false,
    instructions: ["Forearms on the floor, body in a straight line.", "Hold, breathing steadily."], cues: ["Squeeze glutes", "Don't let hips sag"], substitutions: ["dead-bug"], tags: ["timed"] }),
  ex({ slug: "dead-bug", name: "Dead Bug", primary: ["core"], secondary: [], equipment: ["bodyweight"], pattern: "core", level: "beginner", compound: false,
    instructions: ["Lie on your back, arms up, knees at 90°.", "Lower opposite arm and leg while keeping your low back flat.", "Return and switch sides."], cues: ["Exhale as you extend"], substitutions: ["plank"] }),
  ex({ slug: "cable-crunch", name: "Cable Crunch", primary: ["core"], secondary: [], equipment: ["cable"], pattern: "core", level: "beginner", compound: false,
    instructions: ["Kneel facing a high pulley, rope beside your head.", "Crunch down, bringing ribs toward hips.", "Return slowly."], cues: ["Hips stay still"], substitutions: ["dead-bug"] }),
  ex({ slug: "pallof-press", name: "Pallof Press", primary: ["core"], secondary: [], equipment: ["cable"], pattern: "core", level: "beginner", compound: false,
    instructions: ["Stand side-on to a chest-height cable.", "Press the handle straight out and resist rotation.", "Bring it back to your chest."], cues: ["Square hips"], substitutions: ["plank"] }),

  // ── Conditioning
  ex({ slug: "rower-intervals", name: "Rowing Machine Intervals", primary: ["cardio"], secondary: ["upper_back", "quads"], equipment: ["cardio_machine"], pattern: "conditioning", level: "beginner", compound: true,
    instructions: ["Row hard for the work interval (reps = seconds).", "Recover with easy rowing for the rest period."], cues: ["Legs, then body, then arms"], substitutions: ["bike-intervals"], tags: ["timed"] }),
  ex({ slug: "bike-intervals", name: "Stationary Bike Intervals", primary: ["cardio"], secondary: ["quads"], equipment: ["cardio_machine"], pattern: "conditioning", level: "beginner", compound: true,
    instructions: ["Pedal hard for the work interval (reps = seconds).", "Pedal easy during rest."], cues: ["Stay seated"], substitutions: ["rower-intervals"], tags: ["timed"] }),
];

export const CATALOG_BY_SLUG = new Map(CATALOG.map((e) => [e.slug, e]));

export function getExercise(slug: string): Exercise | undefined {
  return CATALOG_BY_SLUG.get(slug);
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Chest", front_delts: "Front delts", side_delts: "Side delts", rear_delts: "Rear delts",
  triceps: "Triceps", biceps: "Biceps", forearms: "Forearms", lats: "Lats", upper_back: "Upper back",
  lower_back: "Lower back", core: "Core", glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings",
  calves: "Calves", cardio: "Conditioning",
};

export function isTimed(slug: string) {
  return getExercise(slug)?.tags.includes("timed") ?? false;
}
