import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/getSessionUser";

export async function requireAuth() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}
