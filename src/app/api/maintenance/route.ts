import { NextResponse } from 'next/server';

// GET - Check maintenance mode status
export async function GET() {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  return NextResponse.json({
    maintenance: isMaintenanceMode,
    message: isMaintenanceMode
      ? 'Maintenance mode is currently ENABLED'
      : 'Maintenance mode is currently DISABLED',
    instructions: {
      enable: 'Set MAINTENANCE_MODE=true in .env.local and restart the server',
      disable: 'Set MAINTENANCE_MODE=false in .env.local and restart the server',
      bypass: 'Enter the MAINTENANCE_PASSWORD on the maintenance page to bypass',
    }
  });
}

// POST - Instructions for toggling (can't actually change env at runtime)
export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'Maintenance mode cannot be toggled at runtime',
    instructions: {
      enable: [
        '1. Edit your .env.local file',
        '2. Add or set: MAINTENANCE_MODE=true',
        '3. Optionally set: MAINTENANCE_PASSWORD=your-secret-password',
        '4. Restart your Next.js server',
      ],
      disable: [
        '1. Edit your .env.local file',
        '2. Set: MAINTENANCE_MODE=false (or remove the line)',
        '3. Restart your Next.js server',
      ],
      quickCommands: {
        enable: 'echo "MAINTENANCE_MODE=true" >> .env.local && npm run dev',
        disable: 'Edit .env.local and set MAINTENANCE_MODE=false, then restart',
      }
    }
  }, { status: 200 });
}
