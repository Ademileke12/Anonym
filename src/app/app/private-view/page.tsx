import { redirect } from "next/navigation";

/** Legacy route - Private View was renamed to Backdoor. */
export default function PrivateViewRedirect() {
  redirect("/app/backdoor");
}
