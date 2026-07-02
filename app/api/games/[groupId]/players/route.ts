import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { action, userId, userName, buyInAmount, cashOutAmount } = await request.json();
    const { groupId } = await params;

    // Get game
    const game = await prisma.game.findFirst({
      where: { groupId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (action === 'join') {
      if (game.status !== 'active') {
        return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
      }

      // Check if player already exists (both conditions = AND)
      const existingPlayer = await prisma.player.findFirst({
        where: { gameId: game.id, userId },
      });

      if (existingPlayer) {
        // Update existing player
        const buyIns = JSON.parse(existingPlayer.buyIns || '[]');
        buyIns.push({ amount: buyInAmount, timestamp: new Date().toISOString() });

        await prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            buyIns: JSON.stringify(buyIns),
            status: 'active',
          },
        });
      } else {
        // Create new player
        await prisma.player.create({
          data: {
            gameId: game.id,
            userId,
            userName,
            buyIns: JSON.stringify([{ amount: buyInAmount, timestamp: new Date().toISOString() }]),
            cashOuts: JSON.stringify([]),
            status: 'active',
            joinedAt: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'cash_out') {
      const player = await prisma.player.findFirst({
        where: { gameId: game.id, userId },
      });

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      const cashOuts = JSON.parse(player.cashOuts || '[]');
      cashOuts.push({ amount: cashOutAmount, timestamp: new Date().toISOString() });

      await prisma.player.update({
        where: { id: player.id },
        data: {
          cashOuts: JSON.stringify(cashOuts),
          status: 'cashed_out',
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
