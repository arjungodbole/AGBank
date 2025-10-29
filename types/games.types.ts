export interface Game {
    $id: string;
    groupId: string;
    name: string;
    hostUserId: string;
    status: 'active' | 'ended';
    $createdAt: string;
    endedAt?: string;
  }
  
  export interface Player {
    $id: string;
    gameId: string;
    userId: string;
    userName: string;
    buyIns: Array<{ amount: number; timestamp: string }>;
    cashOuts: Array<{ amount: number; timestamp: string }>;
    status: 'active' | 'cashed_out';
    joinedAt: string;
  }
  
  export interface GameState {
    id: string;
    groupId: string;
    name: string;
    hostUserId: string;
    status: 'active' | 'ended';
    players: Player[];
    totalPool: number;
  }