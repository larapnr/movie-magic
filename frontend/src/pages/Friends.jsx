
import { useEffect, useState } from "react";
import {
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getFriends,
  respondToFriendRequest,
  removeFriend,
} from "../api/client";

import { Link } from "react-router-dom";

export default function Friends() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load all friendship data when the page opens
  useEffect(() => {
    async function loadFriendsData() {
      try {
        const [incomingData, outgoingData, friendsData] =
          await Promise.all([
            getIncomingFriendRequests(),
            getOutgoingFriendRequests(),
            getFriends(),
          ]);

        setIncoming(incomingData.requests);
        setOutgoing(outgoingData.requests);
        setFriends(friendsData.friends);
      } catch (err) {
        console.error("Could not load friends:", err);
        setError("Could not load your friends.");
      } finally {
        setLoading(false);
      }
    }

    loadFriendsData();
  }, []);

  // Accept or decline an incoming friend request
  async function handleRespond(uid, accept) {
    try {
      await respondToFriendRequest(uid, accept);

      setIncoming((current) =>
        current.filter((request) => request.requester_uid !== uid)
      );

      if (accept) {
        const data = await getFriends();
        setFriends(data.friends);
      }
    } catch (err) {
      console.error("Could not respond to friend request:", err);
      setError("Could not update friend request.");
    }
  }

  // Remove an existing friend
  async function handleRemoveFriend(uid) {
    try {
      await removeFriend(uid);

      setFriends((current) =>
        current.filter(
          (friend) =>
            friend.requester_uid !== uid &&
            friend.receiver_uid !== uid
        )
      );
    } catch (err) {
      console.error("Could not remove friend:", err);
      setError("Could not remove friend.");
    }
  }

  if (loading) {
    return <p>Loading friends...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold">Friends</h1>

      {/* Incoming requests */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Friend Requests ({incoming.length})
        </h2>

        {incoming.length === 0 ? (
          <p className="text-neutral-400">
            You don't have any incoming friend requests.
          </p>
        ) : (
          <div className="space-y-3">
            {incoming.map((request) => (
              <div
                key={request.requester_uid}
                className="flex items-center justify-between rounded-lg border border-neutral-700 p-4"
              >
                <p className="font-medium">
                  {request.display_name}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleRespond(request.requester_uid, true)
                    }
                    className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() =>
                      handleRespond(request.requester_uid, false)
                    }
                    className="rounded-lg border border-neutral-600 px-3 py-2 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing requests */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Sent Requests ({outgoing.length})
        </h2>

        {outgoing.length === 0 ? (
          <p className="text-neutral-400">
            You haven't sent any friend requests.
          </p>
        ) : (
          <div className="space-y-3">
            {outgoing.map((request) => (
              <div
                key={request.receiver_uid}
                className="rounded-lg border border-neutral-700 p-4"
              >
                <p className="font-medium">
                  {request.display_name}
                </p>
                <p className="text-sm text-neutral-400">
                  Request pending
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

    {/* Friends list */}
    <section className="space-y-4">
    <h2 className="text-xl font-semibold">
        My Friends ({friends.length})
    </h2>

    {friends.length === 0 ? (
        <p className="text-neutral-400">
        You haven't added any friends yet.
        </p>
    ) : (
        <div className="space-y-3">
        {friends.map((friend) => (
            <div
            key={`${friend.requester_uid}-${friend.receiver_uid}`}
            className="flex items-center justify-between rounded-lg border border-neutral-700 p-4"
            >
            <Link
                to={`/users/${friend.friend_uid}`}
                className="font-medium hover:text-amber-400"
            >
                {friend.display_name}
            </Link>

            <button
                onClick={() => handleRemoveFriend(friend.friend_uid)}
                className="rounded-lg border border-neutral-600 px-3 py-2 text-sm hover:bg-neutral-800"
            >
                Remove
            </button>
            </div>
        ))}
        </div>
    )}
    </section> 
    </div>
  );
}
