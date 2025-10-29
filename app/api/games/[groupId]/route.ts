import { NextRequest, NextResponse } from 'next/server';
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
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Get game
    const gamesResponse = await databases.listDocuments(
      DATABASE_ID,
      GAMES_COLLECTION_ID,
      [Query.equal('groupId', groupId)]
    );

    if (gamesResponse.documents.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
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

    return NextResponse.json({
      id: game.$id,
      groupId: game.groupId,
      name: game.name,
      hostUserId: game.hostUserId,
      status: game.status,
      players,
      totalPool,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { action, hostUserId } = await request.json();
    const { groupId } = await params;

    if (action === 'end_session') {
      // Get game
      const gamesResponse = await databases.listDocuments(
        DATABASE_ID,
        GAMES_COLLECTION_ID,
        [Query.equal('groupId', groupId)]
      );

      if (gamesResponse.documents.length === 0) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      const game: any = gamesResponse.documents[0];

      if (game.hostUserId !== hostUserId) {
        return NextResponse.json({ error: 'Only the host can end the game' }, { status: 403 });
      }

      await databases.updateDocument(
        DATABASE_ID,
        GAMES_COLLECTION_ID,
        game.$id,
        {
          status: 'ended',
          endedAt: new Date().toISOString(),
        }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}