import { NextResponse } from 'next/server';

export const revalidate = 60; // Cache responses for 60 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    // 1. Get User ID from Username
    const idRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    if (!idRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch user ID' }, { status: idRes.status });
    }

    const idData = await idRes.json();
    if (!idData.data || idData.data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = idData.data[0].id;
    const displayName = idData.data[0].displayName;

    // 2. Get User Details
    const detailsRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!detailsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: detailsRes.status });
    }

    const detailsData = await detailsRes.json();

    return NextResponse.json({
      success: true,
      data: {
        userId,
        username: detailsData.name,
        displayName: displayName,
        description: detailsData.description,
        created: detailsData.created,
        isBanned: detailsData.isBanned,
        hasVerifiedBadge: detailsData.hasVerifiedBadge,
      }
    });

  } catch (error) {
    console.error('Roblox Recon API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
