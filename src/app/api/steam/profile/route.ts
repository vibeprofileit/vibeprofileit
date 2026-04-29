import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export type SteamFriend = {
  steamid: string;
  personaname: string;
  avatar: string;
  personastate: number;
  gameid?: string;
  gameextrainfo?: string;
};

export type SteamBadge = {
  badgeid: number;
  level: number;
  xp: number;
  appid?: number;
  iconUrl: string;
};

export type SteamProfileData = {
  level: number;
  profileBackground: string | null;
  friends: SteamFriend[];
  friendCount: number;
  badges: SteamBadge[];
};

async function fetchProfileBackground(steamId: string): Promise<string | null> {
  const profileUrl = 'https://steamcommunity.com/profiles/' + steamId + '?l=english';

  try {
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const html = await res.text();
    const cleanHtml = html.replace(/\\\//g, '/');

    const allRegex = /(https:\/\/[^"'\s>]+?\/images\/(?:items|backgrounds)\/[^"'\s>]+?\.(?:mp4|webm|jpg|jpeg|png|gif))/gi;
    const allMatches = cleanHtml.match(allRegex) || [];

    const videoUrl = allMatches.find((u) => u.toLowerCase().indexOf('.mp4') !== -1 || u.toLowerCase().indexOf('.webm') !== -1);
    if (videoUrl) return videoUrl;

    const imageUrl = allMatches.find((u) => u.toLowerCase().indexOf('.jpg') !== -1 || u.toLowerCase().indexOf('.png') !== -1);
    if (imageUrl) return imageUrl;

    return null;
  } catch (_err) {
    return null;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const steamId = (session?.user as { steamId?: string } | null)?.steamId

  if (!steamId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const key = process.env.STEAM_API_KEY as string;

  const [levelRes, backgroundUrl, friendsRes, badgesRes] = await Promise.allSettled([
    fetch('https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=' + key + '&steamid=' + steamId),
    fetchProfileBackground(steamId),
    fetch('https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=' + key + '&steamid=' + steamId + '&relationship=friend'),
    fetch('https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=' + key + '&steamid=' + steamId),
  ]);

  let level = 0;
  if (levelRes.status === "fulfilled" && levelRes.value.ok) {
    const data = await levelRes.value.json();
    level = data?.response?.player_level ?? 0;
  }

  const profileBackground = backgroundUrl.status === 'fulfilled' ? backgroundUrl.value : null;

  // Arkadas listesi
  let friends: SteamFriend[] = [];
  let friendCount = 0;
  if (friendsRes.status === "fulfilled" && friendsRes.value.ok) {
    const data = await friendsRes.value.json();
    const friendList: Array<{ steamid: string }> = data?.friendslist?.friends ?? [];
    friendCount = friendList.length;

    const topIds = friendList.slice(0, 10).map((f) => f.steamid).join(',');
    if (topIds) {
      try {
        const summRes = await fetch(
          'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + key + '&steamids=' + topIds
        );
        if (summRes.ok) {
          const summData = await summRes.json();
          const players: Array<{
            steamid: string;
            personaname: string;
            avatar: string;
            personastate: number;
            gameid?: string;
            gameextrainfo?: string;
          }> = summData?.response?.players ?? [];
          friends = players.map((p) => ({
            steamid: p.steamid,
            personaname: p.personaname,
            avatar: p.avatar,
            personastate: p.personastate,
            gameid: p.gameid,
            gameextrainfo: p.gameextrainfo,
          }));
        }
      } catch (_err) {
        // sessizce gec
      }
    }
  }

  // Rozetler
  let badges: SteamBadge[] = [];
  if (badgesRes.status === "fulfilled" && badgesRes.value.ok) {
    const data = await badgesRes.value.json();
    const rawBadges: Array<{ badgeid: number; level: number; xp: number; appid?: number }> =
      data?.response?.badges ?? [];
    badges = rawBadges.slice(0, 6).map((b) => ({
      badgeid: b.badgeid,
      level: b.level,
      xp: b.xp,
      appid: b.appid,
      iconUrl:
        'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/badges/' +
        b.badgeid +
        '/' +
        b.level +
        '.png',
    }));
  }

  return NextResponse.json({
    level,
    profileBackground,
    friends,
    friendCount,
    badges,
  } satisfies SteamProfileData);
}
