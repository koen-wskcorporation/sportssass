import { logout } from "../login/actions";

export async function POST() {
  return logout();
}

export async function GET() {
  return logout();
}
