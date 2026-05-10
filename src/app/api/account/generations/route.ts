import { NextResponse }      from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generations = await prisma.assets.findMany({
    where: {
      user_id:    session.user.userId,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
    select: {
      id:         true,
      r2_url:     true,
      prompt:     true,
      model_used: true,
      mime_type:  true,
      file_size:  true,
      created_at: true,
      expires_at: true,
    },
  });

  return NextResponse.json({ generations });
}
