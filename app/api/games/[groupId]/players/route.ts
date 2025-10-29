import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
const GAMES_COLLECTION_ID = process.env.GAMES_COLLECTION_ID!;
const PLAYERS_COLLECTION_ID = process.env.PLAYERS_COLLECTION_ID!;

// Create appwrite client and databases instance
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);

const databases = new Databases(client);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { action, userId, userName, buyInAmount, cashOutAmount } = await request.json();
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

    if (action === 'join') {
      if (game.status !== 'active') {
        return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
      }

      // Check if player already exists
      const existingPlayersResponse = await databases.listDocuments(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        [Query.equal('gameId', game.$id), Query.equal('userId', userId)]
      );

      if (existingPlayersResponse.documents.length > 0) {
        // Update existing player
        const player: any = existingPlayersResponse.documents[0];
        const buyIns = JSON.parse(player.buyIns || '[]');
        buyIns.push({ amount: buyInAmount, timestamp: new Date().toISOString() });

        await databases.updateDocument(
          DATABASE_ID,
          PLAYERS_COLLECTION_ID,
          player.$id,
          {
            buyIns: JSON.stringify(buyIns),
            status: 'active',
          }
        );
      } else {
        // Create new player
        await databases.createDocument(
          DATABASE_ID,
          PLAYERS_COLLECTION_ID,
          ID.unique(),
          {
            gameId: game.$id,
            userId,
            userName,
            buyIns: JSON.stringify([{ amount: buyInAmount, timestamp: new Date().toISOString() }]),
            cashOuts: JSON.stringify([]),
            status: 'active',
            joinedAt: new Date().toISOString(),
          }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'cash_out') {
      const playersResponse = await databases.listDocuments(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        [Query.equal('gameId', game.$id), Query.equal('userId', userId)]
      );

      if (playersResponse.documents.length === 0) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      const player: any = playersResponse.documents[0];
      const cashOuts = JSON.parse(player.cashOuts || '[]');
      cashOuts.push({ amount: cashOutAmount, timestamp: new Date().toISOString() });

      await databases.updateDocument(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        player.$id,
        {
          cashOuts: JSON.stringify(cashOuts),
          status: 'cashed_out',
        }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}