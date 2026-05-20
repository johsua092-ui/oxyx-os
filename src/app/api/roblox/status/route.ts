import { NextResponse } from 'next/server';

export const revalidate = 30; // Cache responses for 30 seconds

export async function GET() {
  try {
    const res = await fetch('http://hostedstatus.com/1.0/status/59db90dbcdeb2f04dadcf16d', {
      headers: {
        'User-Agent': 'BloxIntel/1.0',
        'Accept': 'application/json'
      },
      next: { revalidate: 30 }
    });

    if (res.ok) {
      const data = await res.json();
      const statusOverall = data.result?.status_overall || {};
      const statusList = data.result?.status || [];

      // Map status_code to indicator
      const code = statusOverall.status_code;
      let indicator = 'none';
      if (code === 100) indicator = 'none';
      else if (code === 200 || code === 300) indicator = 'minor';
      else if (code === 400) indicator = 'major';
      else if (code === 500) indicator = 'critical';

      // Flatten components/containers for easier UI rendering
      const components: any[] = [];
      const seen = new Set<string>();

      statusList.forEach((group: any) => {
        if (group.containers) {
          group.containers.forEach((container: any) => {
            const name = container.name;
            if (!seen.has(name)) {
              seen.add(name);
              components.push({
                name: container.name,
                status: container.status,
                indicator: container.status_code === 100 ? 'none' : container.status_code <= 300 ? 'minor' : 'critical'
              });
            }
          });
        }
      });

      return NextResponse.json({
        success: true,
        status: statusOverall.status || 'Operational',
        indicator,
        components: components.slice(0, 10), // Limit to top 10 important components
      });
    } else {
      return NextResponse.json({
        success: true,
        status: 'Unknown',
        indicator: 'minor',
        message: 'Could not fetch live status. Status server responded with non-200.'
      });
    }
  } catch (error) {
    console.error('Roblox Status API Error:', error);
    return NextResponse.json({
      success: true,
      status: 'Unknown',
      indicator: 'minor',
      message: 'Network error reaching status server.'
    });
  }
}
