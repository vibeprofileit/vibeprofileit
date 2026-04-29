import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      steamId?: string
      personaName?: string
      avatarFull?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    steamId?: string
    personaName?: string
    avatarFull?: string
  }
}
