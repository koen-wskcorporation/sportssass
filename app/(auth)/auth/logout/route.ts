import { logout } from "../login/actions";

export async function GET() {
  return logout();
}
