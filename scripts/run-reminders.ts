/** Runs the reminder job once from the command line (local dev, or as a CronJob without HTTP). */
import { runReminderJob } from "../src/lib/notify/service";
runReminderJob().then((s) => { console.log(JSON.stringify(s)); process.exit(0); }, (e) => { console.error(e); process.exit(1); });
