import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const limit = parseInt(searchParams.get("limit") || "10");

    const { groupId } = await params;

    // First, get group details to get member IDs
    const groupResponse = await fetch(`${backendURL}/api/groups/details/${groupId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!groupResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch group details" },
        { status: groupResponse.status }
      );
    }

    const groupData = await groupResponse.json();

    if (!groupData.member_ids || groupData.member_ids.length === 0) {
      return NextResponse.json({
        success: true,
        period,
        entries: [],
        message: "No members in group",
      });
    }

    // Get leaderboard data for group members using the compare endpoint
    const memberIds = groupData.member_ids.join(",");
    const leaderboardResponse = await fetch(
      `${BACKEND_URL}/api/group-leaderboard/compare?user_ids=${encodeURIComponent(
        memberIds
      )}&period=${period}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!leaderboardResponse.ok) {
      const errorData = await leaderboardResponse.json();
      return NextResponse.json(
        { success: false, message: errorData.detail || "Failed to fetch group leaderboard" },
        { status: leaderboardResponse.status }
      );
    }

    const leaderboardData = await leaderboardResponse.json();

    // Transform the response and add group-specific rankings
    const entriesWithGroupRank = leaderboardData.compared_users
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, limit)
      .map((entry: any, index: number) => ({
        rank: index + 1, // Group rank
        user_id: entry.user_id,
        display_name: entry.display_name,
        score: entry.score || 0,
        global_rank: entry.rank, // Global rank from Redis
        stats: {
          daily_pomo: entry.stats?.daily_pomo || 0,
          weekly_pomo: entry.stats?.weekly_pomo || 0,
          monthly_pomo: entry.stats?.monthly_pomo || 0,
          yearly_pomo: entry.stats?.yearly_pomo || 0,
        },
      }));

    return NextResponse.json({
      success: true,
      period,
      entries: entriesWithGroupRank,
      group_name: groupData.group_name,
      total_members: groupData.member_ids.length,
    });
  } catch (error) {
    console.error("Error fetching group leaderboard:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
