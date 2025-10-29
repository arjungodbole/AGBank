import { Client, Databases, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
const GAMES_COLLECTION_ID = process.env.GAMES_COLLECTION_ID!;
const PLAYERS_COLLECTION_ID = process.env.PLAYERS_COLLECTION_ID!;

// Create appwrite client and databases instance
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

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
          const gamesResponse = await databases.listDocuments(
            DATABASE_ID,
            GAMES_COLLECTION_ID,
            [Query.equal('groupId', groupId)]
          );

          if (gamesResponse.documents.length === 0) {
            controller.error(new Error('Game not found'));
            return;
          }

          const game: any = gamesResponse.documents[0];

          // Get players
          const playersResponse = await databases.listDocuments(
            DATABASE_ID,
            PLAYERS_COLLECTION_ID,
            [Query.equal('gameId', game.$id)]
          );

          const players = playersResponse.documents.map((player: any) => ({
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
            id: game.$id,
            groupId: game.groupId,
            name: game.name,
            hostUserId: game.hostUserId,
            status: game.status,
            players,
            totalPool,
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