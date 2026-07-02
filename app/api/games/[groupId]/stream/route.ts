import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = async () => {
        try {
          // Get game
          const game: any = await prisma.game.findFirst({
            where: { groupId },
          });

          if (!game) {
            controller.error(new Error('Game not found'));
            return;
          }

          // Get players
          const playerRows = await prisma.player.findMany({
            where: { gameId: game.id },
          });

          const players = playerRows.map((player: any) => ({
            ...player,
            buyIns: JSON.parse(player.buyIns || '[]'),
            cashOuts: JSON.parse(player.cashOuts || '[]'),
          }));

          // Calculate total pool
          const totalPool = players.reduce((sum: number, player: any) => {
            if (player.status === 'active') {
              const totalBuyIns = player.buyIns.reduce((playerSum: number, buyIn: any) => 
                playerSum + buyIn.amount, 0);
              return sum + totalBuyIns;
            }
            return sum;
          }, 0);

          const gameState = {
            id: game.id,
            groupId: game.groupId,
            name: game.name,
            hostUserId: game.hostUserId,
            status: game.status,
            players,
            totalPool,
            chipDenominations: JSON.parse(game.chipDenominations || "[]")
          };

          const data = `data: ${JSON.stringify(gameState)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch (error) {
          // Don't close the stream on error
        }
      };

      // Send initial update
      sendUpdate();

      // Send updates every 2 seconds
      const interval = setInterval(sendUpdate, 2000);

      // Cleanup function
      return () => {
        clearInterval(interval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}