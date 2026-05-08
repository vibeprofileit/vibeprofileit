import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      userId?:      string
      steamId?:     string
      personaName?: string
      avatarFull?:  string
      isAdmin?:     boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?:      string
    steamId?:     string
    personaName?: string
    avatarFull?:  string
    isAdmin?:     boolean
  }
}
