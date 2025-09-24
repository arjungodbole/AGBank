"use client";

import { useState, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface PageProps {
  params: Promise<{
    groupId: string;
  }>;
}

export default function GroupDetailPage({ params }: PageProps) {
  const { groupId } = use(params); // ← Use React.use() to unwrap the Promise
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [buyIn, setBuyIn] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [playerBuyIn, setPlayerBuyIn] = useState("");
  const [isHost, setIsHost] = useState(true); // TODO: Determine if current user is the host
  const [sessionEnded, setSessionEnded] = useState(false);
  const [playerHistory, setPlayerHistory] = useState<
    Array<{
      round: number;
      buyIn: string;
      cashOut?: string;
      isActive: boolean;
    }>
  >([]); // Track all rounds
  const [groupName, setGroupName] = useState(""); // Track group name
  const [loadingGroupName, setLoadingGroupName] = useState(true);

  // Simple group name function - just returns one name for all groups
  const getGroupName = async (groupId: string): Promise<string> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Just return a single name for all groups
    return "Poker Game";
  };

  // Get group name - simplified version
  useEffect(() => {
    const fetchGroupName = async () => {
      setLoadingGroupName(true);

      try {
        // Just use the simulated group lookup
        const name = await getGroupName(groupId);
        setGroupName(name);
        document.title = `${name} - Poker Session`;
      } catch (error) {
        console.error("Failed to fetch group name:", error);
        setGroupName("Poker Game");
        document.title = "Poker Game - Poker Session";
      } finally {
        setLoadingGroupName(false);
      }
    };

    if (groupId) {
      fetchGroupName();
    }
  }, [groupId]);

  const handleJoinGame = () => {
    if (sessionEnded) {
      alert("This session has ended and is no longer accepting players.");
      return;
    }

    if (!buyIn || buyIn.trim() === "") {
      alert("Please enter a buy-in amount");
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setHasJoined(true);
      setPlayerBuyIn(buyIn.trim());

      // Add new round to history
      setPlayerHistory((prev) => [
        ...prev,
        {
          round: prev.length + 1,
          buyIn: buyIn.trim(),
          isActive: true,
        },
      ]);

      setLoading(false);
    }, 1000);
  };

  const handleCashOut = () => {
    const cashOutValue = prompt("How much are you cashing out for?");

    if (cashOutValue === null) return; // User cancelled

    if (
      !cashOutValue ||
      isNaN(Number(cashOutValue)) ||
      Number(cashOutValue) < 0
    ) {
      alert("Please enter a valid cash out amount");
      return;
    }

    setLoading(true);
    // Simulate cash out process
    setTimeout(() => {
      setHasJoined(false);

      // Update the current active round with cash out info
      setPlayerHistory((prev) =>
        prev.map((round) =>
          round.isActive
            ? {
                ...round,
                cashOut: cashOutValue,
                isActive: false,
              }
            : round
        )
      );

      setLoading(false);
    }, 1000);
  };

  const getTotalProfit = () => {
    return playerHistory.reduce((total, round) => {
      if (round.cashOut) {
        return total + (Number(round.cashOut) - Number(round.buyIn));
      }
      return total;
    }, 0);
  };

  const handleEndSession = () => {
    if (
      window.confirm(
        "Are you sure you want to end this session? This will prevent new players from joining and cannot be undone."
      )
    ) {
      setLoading(true);
      // Simulate ending session
      setTimeout(() => {
        setSessionEnded(true);
        setLoading(false);
      }, 1000);
    }
  };

  // If session is ended, show different UI
  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Session Ended Header */}
            <div className="bg-red-50 rounded-2xl border-red-200 p-6 mb-6 text-center">
              <h1 className="text-3xl font-bold text-red-900 mb-2">
                {loadingGroupName ? "Loading..." : groupName}
              </h1>
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Session Ended 🔒
              </h2>
              <p className="text-red-700">
                This poker session has been ended by the host and is no longer
                accepting new players.
              </p>
            </div>

            {/* Final Results */}
            {playerHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Final Results
                </h2>

                {/* Show all rounds */}
                {playerHistory.map((round, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          round.isActive ? "bg-blue-600" : "bg-gray-600"
                        }`}
                      >
                        <span className="text-white font-semibold text-sm">
                          U
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        You - Round {round.round}{" "}
                        {round.isActive ? "(Still Active)" : "(Cashed Out)"}
                      </span>
                    </div>
                    <div className="text-right">
                      {round.isActive ? (
                        <span className="font-semibold text-gray-900">
                          ${round.buyIn}
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-gray-600">
                            ${round.buyIn} → ${round.cashOut}
                          </span>
                          {(() => {
                            const profit =
                              Number(round.cashOut) - Number(round.buyIn);
                            return (
                              <span
                                className={`font-semibold ${
                                  profit > 0
                                    ? "text-green-600"
                                    : profit < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {profit > 0 ? "+" : ""}${profit.toFixed(2)}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Session Total */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">
                      Session Total:
                    </span>
                    <span
                      className={`font-bold text-2xl ${
                        getTotalProfit() > 0
                          ? "text-green-600"
                          : getTotalProfit() < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {getTotalProfit() > 0 ? "+" : ""}$
                      {getTotalProfit().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="text-center">
              <a
                href="/join-group"
                className="inline-block bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors mr-3"
              >
                Create New Session
              </a>
              <a
                href="/"
                className="inline-block bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl border-gray-200 p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {loadingGroupName ? "Loading..." : groupName || "Poker Game"}
            </h1>
            <p className="text-lg text-gray-600 mb-3">
              Group created successfully!
            </p>
            <p className="text-sm text-gray-500">
              Group ID:{" "}
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {groupId}
              </span>
            </p>
            {/* Simple debug without hydration issues */}
          </div>

          {/* Group Details Card */}
          <div className="bg-white rounded-2xl border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Group Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group ID
                </label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <code className="text-sm text-gray-800">{groupId}</code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Share this group
                </label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <code className="text-sm text-gray-800">
                    {typeof window !== "undefined" && groupName
                      ? `${
                          window.location.origin
                        }/groups/${groupId}?name=${encodeURIComponent(
                          groupName
                        )}`
                      : `http://localhost:3000/groups/${groupId}${
                          groupName
                            ? `?name=${encodeURIComponent(groupName)}`
                            : ""
                        }`}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Host Controls - Show before buy-in section */}
          {isHost && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                🏠 Host Controls
              </h3>
              <p className="text-sm text-yellow-700 mb-4">
                As the host of <strong>{groupName || "this group"}</strong>, you
                can end this session to prevent new players from joining.
              </p>
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Ending Session..." : "End Session"}
              </button>
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold">
            Buy In{" "}
            {isHost && (
              <span className="text-sm text-blue-600 font-normal">
                (You are the host)
              </span>
            )}
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            How much are you buying in for?
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="buyIn"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2 uppercase tracking-wider outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-black px-5 py-2 text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Group"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={hasJoined ? handleCashOut : handleJoinGame}
              disabled={loading}
              className={`flex-1 text-white text-center py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                hasJoined
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading
                ? hasJoined
                  ? "Cashing Out..."
                  : "Joining..."
                : hasJoined
                ? "Cash Out"
                : "Join Game"}
            </button>
            <a
              href="/"
              className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Leave Group
            </a>
          </div>

          {/* User Buy-In Display - Show all rounds */}
          {playerHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Players
              </h3>

              {/* Show each round as separate entry */}
              {playerHistory.map((round, index) => (
                <div
                  key={index}
                  className={`rounded-xl border p-4 mb-3 ${
                    round.isActive
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          round.isActive ? "bg-blue-600" : "bg-gray-600"
                        }`}
                      >
                        <span className="text-white font-semibold text-sm">
                          U
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">
                          You (Round {round.round})
                        </span>
                        <span
                          className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            round.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {round.isActive ? "Active" : "Cashed Out"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {round.isActive ? (
                        <span className="font-semibold text-gray-900">
                          ${round.buyIn}
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500">
                            ${round.buyIn} → ${round.cashOut}
                          </span>
                          {(() => {
                            const profit =
                              Number(round.cashOut) - Number(round.buyIn);
                            return (
                              <span
                                className={`font-semibold ${
                                  profit > 0
                                    ? "text-green-600"
                                    : profit < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {profit > 0 ? "+" : ""}${profit.toFixed(2)}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Summary */}
              {playerHistory.length > 1 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-900">
                      Session Total:
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        getTotalProfit() > 0
                          ? "text-green-600"
                          : getTotalProfit() < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {getTotalProfit() > 0 ? "+" : ""}$
                      {getTotalProfit().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-3 text-right">
                <p className="text-sm text-gray-600">
                  Total Pool:{" "}
                  <span className="font-semibold text-gray-900">
                    ${hasJoined ? playerBuyIn : "0.00"}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
