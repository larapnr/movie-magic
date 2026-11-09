import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicProfile } from "../api/client";
import { useGenres } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { sendFriendRequest } from "../api/client";

export default function PublicProfile() {
  const { uid } = useParams();
  const { user } = useAuth();
  const { genres } = useGenres("movie");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendStatus, setFriendStatus] = useState("none");
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getPublicProfile(uid);
        setProfile(data);
      } catch (err) {
        setError("Could not find this profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [uid]);

  if (loading) {
    return <p>Loading profile...</p>;
  }

  if (error || !profile) {
    return <p>{error || "Profile not found."}</p>;
  }

  const favoriteGenres = genres.filter((genre) =>
    profile.favorite_genres.includes(genre.id)
  );

  const initial = (profile.display_name || "?")[0].toUpperCase();

  async function handleAddFriend() {
    try {
        setFriendLoading(true);

        await sendFriendRequest(uid);

        setFriendStatus("pending");
    } catch (err) {
        console.error("Could not send friend request:", err);
        alert(err.response?.data?.detail || "Could not send friend request.");
    } finally {
        setFriendLoading(false);
    }
    }

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* Profile header */}
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-3xl font-bold text-black">
          {initial}
        </div>

        <div className="flex-1">
            <h1 className="text-3xl font-bold">
                {profile.display_name || "Movie Magic User"}
            </h1>
            <p className="text-sm text-neutral-400">
                Movie Magic member
            </p>
            </div>

            {user && user.uid !== uid && (
            <button
                onClick={handleAddFriend}
                disabled={friendLoading || friendStatus !== "none"}
                className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
                {friendLoading
                ? "Sending..."
                : friendStatus === "pending"
                ? "Request Sent"
                : friendStatus === "friends"
                ? "Friends"
                : "Add Friend"}
            </button>
        )}
    </div>
    
      {/* About me */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">About Me</h2>
        <p className="text-neutral-300">
          {profile.bio || "This user hasn't added a bio yet."}
        </p>
      </section>

      {/* Favorite genres */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Favorite Genres
        </h2>

        {favoriteGenres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {favoriteGenres.map((genre) => (
              <span
                key={genre.id}
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
              >
                {genre.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-neutral-400">
            No favorite genres selected yet.
          </p>
        )}
      </section>

    </div>
  );
}