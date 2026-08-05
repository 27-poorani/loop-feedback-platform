import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      workspaceId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    workspaceId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    workspaceId: string;
  }
}