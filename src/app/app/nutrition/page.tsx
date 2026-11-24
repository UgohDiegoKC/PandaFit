import { eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { GOAL_LABEL } from "@/lib/plan/types";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Food guidance" };

type Goal = keyof typeof GOAL_LABEL;

/**
 * Goal-aware food-source guidance (Notion: "Add goal-aware food-source guidance").
 * Deliberately general: food sources and habits only — no calorie targets, macros or supplement dosing.
 */
const FOCUS: Record<Goal, { headline: string; habits: string[] }> = {
  build_muscle: { headline: "Enough protein spread through the day, plus carbs around training.", habits: ["Include a protein source at each meal.", "Have a carb-containing meal or snack in the few hours before training.", "Gradual weight gain is normal while building muscle."] },
  lose_fat: { headline: "Protein and fibre to stay full; mostly whole foods.", habits: ["Fill half your plate with vegetables or salad.", "Keep a protein source at each meal to help preserve muscle.", "Aim for slow, steady change — very aggressive dieting is not recommended."] },
  get_stronger: { headline: "Fuel heavy sessions: protein for recovery and carbs for energy.", habits: ["Don't train heavy on an empty stomach if it leaves you light-headed.", "Include a protein source at each meal.", "Sleep is as important as food for strength."] },
  general_fitness: { headline: "Balanced plates and regular meals.", habits: ["Mix colourful vegetables and fruit through the day.", "Choose mostly minimally processed foods.", "Drink water regularly, especially around training."] },
  endurance: { headline: "Carbohydrates for energy, fluids for longer sessions.", habits: ["Eat a carb-containing meal before longer sessions.", "Rehydrate after training, more so in hot weather.", "Include protein after training to help recovery."] },
};

const SOURCES = [
  { group: "Protein", items: ["Eggs", "Chicken, turkey or fish", "Beans, lentils and chickpeas", "Greek yoghurt or milk", "Tofu or tempeh", "Lean beef or goat"] },
  { group: "Carbohydrates", items: ["Oats", "Rice, yam or potatoes", "Wholegrain bread or pasta", "Plantain", "Fruit such as bananas and oranges"] },
  { group: "Fats", items: ["Nuts and seeds", "Avocado", "Olive or groundnut oil (in moderation)", "Oily fish"] },
  { group: "Vegetables & fibre", items: ["Leafy greens (spinach, ugu, kale)", "Tomatoes, peppers and onions", "Carrots, okra and cabbage", "Beans and pulses"] },
];

export default async function NutritionPage() {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) });
  const goal = (profile?.goal ?? "general_fitness") as Goal;
  const f = FOCUS[goal];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Fuel for your goal" subtitle={`Goal: ${GOAL_LABEL[goal]}`} />
      <div className="card p-5">
        <p className="text-lg font-semibold">{f.headline}</p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted">{f.habits.map((h) => <li key={h}>{h}</li>)}</ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <div key={s.group} className="card p-5">
            <h2 className="eyebrow text-accent-ink">{s.group}</h2>
            <ul className="mt-2 space-y-1 text-sm">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="flex gap-2 rounded-xl bg-surface-2 p-4 text-xs text-muted">
        <ShieldAlert size={16} className="shrink-0 text-accent-ink" aria-hidden />
        These are general food ideas, not a meal plan or medical advice. If you have allergies, a medical condition, are pregnant, or have a history of disordered eating, please speak to a doctor or registered dietitian before changing how you eat.
      </p>
    </div>
  );
}
