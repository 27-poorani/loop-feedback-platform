import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome to your dashboard</h1>
      <p className="text-gray-500 mt-2">
        Logged in as: {session.user?.email}
      </p>
    </div>
  );
}