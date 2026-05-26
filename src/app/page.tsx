// Root page — redirects to the app shell.
// Once auth is wired up, middleware will redirect unauthenticated users to /login.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/");
}
