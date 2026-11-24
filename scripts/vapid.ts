/** Prints a fresh VAPID key pair for web push. Put the values in .env.local / your secret store. */
import * as webpush from "web-push";
const k = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}\nVAPID_SUBJECT=mailto:you@example.com`);
