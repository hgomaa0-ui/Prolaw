// Temporary authOptions stub to satisfy imports during build.
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  // TODO: configure real providers & callbacks later
  providers: [],
  session: { strategy: "jwt" },
};
