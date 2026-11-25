import { Navigate, Outlet } from "react-router";
import { Role } from "core/constants/role.ts";
import { useSession } from "../lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-10 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
      </div>
    );
  }

  if (session?.user?.role !== Role.admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
