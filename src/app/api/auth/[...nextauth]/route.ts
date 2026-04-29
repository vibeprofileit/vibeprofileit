import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    // Steam girişi /api/steam/login → /api/steam/callback rotasıyla yönetilir.
    // Callback, JWT'yi doğrudan session cookie olarak yazar; bu provider hiç
    // tetiklenmez ama NextAuth'un boş-provider hatasını önler.
    CredentialsProvider({
      id: "steam-internal",
      name: "Steam",
      credentials: {
        steamId: { label: "SteamID", type: "text" },
      },
      // Bu authorize asla çağrılmaz; oturum cookie callback tarafından yazılır.
      async authorize() {
        return null
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      // Cookie, /api/steam/callback tarafından encode edilip yazılır.
      // useSession() bu token'ı decode ederek session'a aktarır.
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.steamId    = token.steamId    as string | undefined
        session.user.personaName = token.personaName as string | undefined
        session.user.avatarFull  = token.avatarFull  as string | undefined
        session.user.name        = (token.personaName as string) ?? session.user.name
        session.user.image       = (token.avatarFull  as string) ?? session.user.image
      }
      return session
    },
  },
  // Özel login sayfası yok; doğrudan Steam'e yönlendiriliyor.
  pages: {},
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
