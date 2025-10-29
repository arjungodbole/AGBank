"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Player {
  $id: string;
  gameId: string;
  userId: string;
  userName: string;
  buyIns: Array<{ amount: number; timestamp: string }>;
  cashOuts: Array<{ amount: number; timestamp: string }>;
  status: "active" | "cashed_out";
  joinedAt: string;
}

interface GameState {
  id: string;
  groupId: string;
  name: string;
  hostUserId: string;
  status: "active" | "ended";
  players: Player[];
  totalPool: number;
}

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default function MultiplayerGroupPage({ params }: PageProps) {
  const { groupId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [buyIn, setBuyIn] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [userName, setUserName] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize user with real authentication
  useEffect(() => {
    const initUser = async () => {
      try {
        // Import getLoggedInUser dynamically to avoid SSR issues
        const { getLoggedInUser } = await import("@/lib/actions/user.actions");
        const loggedInUser = await getLoggedInUser();

        if (loggedInUser) {
          const displayName =
            loggedInUser.firstName || loggedInUser.email || "User";
          setCurrentUser({
            id: loggedInUser.$id,
            name: displayName,
          });
          setUserName(displayName); // Set userName so they don't need to enter it again
        } else {
          // Fallback to localStorage for demo/testing
          const userId =
            localStorage.getItem("userId") ||
            Math.random().toString(36).substr(2, 9);
          const storedName = localStorage.getItem("userName");

          if (!localStorage.getItem("userId")) {
            localStorage.setItem("userId", userId);
          }

          setCurrentUser({ id: userId, name: storedName || "" });

          if (!storedName) {
            setShowJoinForm(true);
          }
        }
      } catch (error) {
        // Fallback to localStorage on error
        const userId =
          localStorage.getItem("userId") ||
          Math.random().toString(36).substr(2, 9);
        const storedName = localStorage.getItem("userName");

        if (!localStorage.getItem("userId")) {
          localStorage.setItem("userId", userId);
        }

        setCurrentUser({ id: userId, name: storedName || "" });

        if (!storedName) {
          setShowJoinForm(true);
        }
      }
    };

    initUser();
  }, []);

  // Fetch initial game state
  const fetchGameState = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/games/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
      } else if (response.status === 404) {
        setError("Game not found. The referral code may be invalid.");
      } else {
        setError("Failed to load game");
      }
    } catch (error) {
      setError("Failed to connect to game");
    }
  };

  // Set up real-time updates using Server-Sent Events
  useEffect(() => {
    if (!groupId) return;

    fetchGameState();

    const eventSource = new EventSource(`/api/games/${groupId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const updatedState = JSON.parse(event.data);
        setGameState(updatedState);
        setError(null);
      } catch (err) {
        // Failed to parse game state
      }
    };

    eventSource.onerror = (err) => {
      setError("Lost connection to game. Refreshing...");
      setTimeout(fetchGameState, 2000);
    };

    return () => {
      eventSource.close();
    };
  }, [groupId]);

  const handleJoinGame = async () => {
    // Use currentUser.name as fallback if userName is not set (for logged-in users)
    const nameToUse = userName.trim() || currentUser?.name || "";

    if (!nameToUse) {
      alert("Please enter your name");
      return;
    }

    if (!buyIn || buyIn.trim() === "" || isNaN(Number(buyIn))) {
      alert("Please enter a valid buy-in amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${groupId}/players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "join",
          userId: currentUser?.id,
          userName: nameToUse,
          buyInAmount: parseFloat(buyIn),
        }),
      });

      if (response.ok) {
        localStorage.setItem("userName", nameToUse);
        setCurrentUser({ ...currentUser!, name: nameToUse });
        setShowJoinForm(false);
        setBuyIn("");
      } else {
        const error = await response.json();
        setError(error.message || "Failed to join game");
      }
    } catch (error) {
      setError("Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async () => {
    const cashOutValue = prompt("How much are you cashing out for?");
    if (cashOutValue === null) return;

    const amount = parseFloat(cashOutValue);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid cash out amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${groupId}/players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cash_out",
          userId: currentUser?.id,
          cashOutAmount: amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message || "Failed to cash out");
      }
    } catch (error) {
      setError("Failed to cash out");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (
      !window.confirm(
        "Are you sure you want to end this session? This cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "end_session",
          hostUserId: currentUser?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message || "Failed to end session");
      }
    } catch (error) {
      setError("Failed to end session");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlayer = () => {
    return gameState?.players.find((p) => p.userId === currentUser?.id);
  };

  const isHost = () => {
    return gameState?.hostUserId === currentUser?.id;
  };

  const getPlayerTotal = (player: Player) => {
    const totalBuyIn = player.buyIns.reduce((sum, b) => sum + b.amount, 0);
    const totalCashOut = player.cashOuts.reduce((sum, c) => sum + c.amount, 0);
    return totalCashOut - totalBuyIn;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h1 className="text-lg font-semibold text-red-900 mb-2">Error</h1>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={fetchGameState}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Retry
              </button>
              <Link
                href="/join-group"
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Join
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (gameState.status === "ended") {
    return (
      <div className="min-h-screen bg-gray-50 py-4">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-red-50 rounded-lg border-red-200 p-4 mb-4 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-1">
              {gameState.name}
            </h1>
            <h2 className="text-lg font-semibold text-red-800 mb-1">
              Session Ended
            </h2>
            <p className="text-sm text-red-700">
              This poker session has been ended and is no longer accepting
              players.
            </p>
          </div>

          {gameState.players.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Final Results
              </h2>
              <div className="space-y-2">
                {gameState.players.map((player) => (
                  <div
                    key={player.$id}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {player.userName[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{player.userName}</span>
                      {player.userId === gameState.hostUserId && (
                        <span className="text-xs text-blue-600">Host</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          getPlayerTotal(player) > 0
                            ? "text-green-600"
                            : getPlayerTotal(player) < 0
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {getPlayerTotal(player) > 0 ? "+" : ""}$
                        {getPlayerTotal(player).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center mt-6">
            <Link
              href="/join-group"
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Session
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show join form for new users
  if (showJoinForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Join {gameState.name}
          </h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 outline-none"
                maxLength={20}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buy-in Amount
              </label>
              <input
                type="number"
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 outline-none"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleJoinGame}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join Game"}
              </button>
              <Link
                href="/join-group"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Left side - Game info and actions */}
          <div className="flex-1">
            {/* Game header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {gameState.name}
                  </h1>
                  <p className="text-sm text-gray-600">Group ID: {groupId}</p>
                  {isHost() && (
                    <p className="text-sm text-blue-600">You are the host</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Pool</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${gameState.totalPool.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Share link */}
              <div className="bg-gray-50 rounded p-2 mb-3">
                <p className="text-xs text-gray-600 mb-1">Share this game:</p>
                <div className="bg-white border rounded p-2">
                  <code className="text-xs break-all">
                    {typeof window !== "undefined" &&
                      `${window.location.origin}/groups/${groupId}`}
                  </code>
                </div>
              </div>

              {/* Host controls */}
              {isHost() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-yellow-900">
                        Host Controls
                      </h3>
                      <p className="text-xs text-yellow-700">
                        End session to prevent new players
                      </p>
                    </div>
                    <button
                      onClick={handleEndSession}
                      disabled={loading}
                      className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? "Ending..." : "End Session"}
                    </button>
                  </div>
                </div>
              )}

              {/* Player actions */}
              {currentPlayer ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Your Actions
                  </h3>

                  {currentPlayer.status === "active" ? (
                    <button
                      onClick={handleCashOut}
                      disabled={loading}
                      className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? "Cashing Out..." : "Cash Out"}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={buyIn}
                        onChange={(e) => setBuyIn(e.target.value)}
                        placeholder="Buy-in amount"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 outline-none"
                        disabled={loading}
                      />
                      <button
                        onClick={handleJoinGame}
                        disabled={loading}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? "Rejoining..." : "Buy In Again"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Join the Game
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={buyIn}
                      onChange={(e) => setBuyIn(e.target.value)}
                      placeholder="Buy-in amount"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 outline-none"
                      disabled={loading}
                    />
                    <button
                      onClick={handleJoinGame}
                      disabled={loading}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "Joining..." : "Buy In"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {isHost()
                      ? "As the host, you can join your own game"
                      : "Enter an amount to join the game"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Players list */}
          <div className="w-full lg:w-80">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Players ({gameState.players.length})
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gameState.players.map((player) => (
                  <div
                    key={player.$id}
                    className={`rounded-lg border p-3 ${
                      player.status === "active"
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            player.status === "active"
                              ? "bg-green-600"
                              : "bg-gray-600"
                          }`}
                        >
                          <span className="text-white font-semibold text-xs">
                            {player.userName[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {player.userName}
                            {player.userId === currentUser?.id && " (You)"}
                            {player.userId === gameState.hostUserId}
                          </span>
                          <span
                            className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                              player.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {player.status === "active" ? "Active" : "Out"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Buy-ins: $
                          {player.buyIns
                            .reduce((sum, b) => sum + b.amount, 0)
                            .toFixed(2)}
                        </div>
                        {player.cashOuts.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Cash-outs: $
                            {player.cashOuts
                              .reduce((sum, c) => sum + c.amount, 0)
                              .toFixed(2)}
                          </div>
                        )}
                        <div
                          className={`font-semibold text-sm ${
                            getPlayerTotal(player) > 0
                              ? "text-green-600"
                              : getPlayerTotal(player) < 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {getPlayerTotal(player) > 0 ? "+" : ""}$
                          {getPlayerTotal(player).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {gameState.players.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No players yet</p>
                    <p className="text-xs">Share the link to invite others</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/join-group"
            className="inline-block bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Leave Group
          </Link>
        </div>
      </div>
    </div>
  );
}
