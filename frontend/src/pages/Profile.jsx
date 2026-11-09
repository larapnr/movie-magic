import { useEffect, useState } from "react";
import { useGenres } from "../hooks";
import { getProfile, updateProfile } from "../api/client";

export default function Profile() {
  const { genres } = useGenres("movie");  
  const [profile, setProfile] = useState({
    bio: "",
    favorite_genres: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (error) {
        setMessage("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const updated = await updateProfile(profile);
      setProfile(updated);
      setMessage("Profile saved successfully!");
    } catch (error) {
      setMessage("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <div className="space-y-2">
        <label className="block font-medium">About me</label>

        <textarea
          value={profile.bio}
          onChange={(e) =>
            setProfile({ ...profile, bio: e.target.value })
          }
          maxLength={300}
          placeholder="Tell us a little about yourself..."
          className="w-full rounded-lg border p-3"
          rows={4}
        />

        <p className="text-sm text-gray-500">
          {profile.bio.length}/300 characters
        </p>
      </div>
        
                <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Favorite movie genres
        </h2>

        <p className="text-sm text-gray-500">
          Choose up to 10 genres you enjoy.
        </p>

        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => {
            const selected = profile.favorite_genres.includes(genre.id);

            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => {
                  setProfile((prev) => {
                    const alreadySelected =
                      prev.favorite_genres.includes(genre.id);

                    if (alreadySelected) {
                      return {
                        ...prev,
                        favorite_genres: prev.favorite_genres.filter(
                          (id) => id !== genre.id
                        ),
                      };
                    }

                    if (prev.favorite_genres.length >= 10) {
                      return prev;
                    }

                    return {
                      ...prev,
                      favorite_genres: [
                        ...prev.favorite_genres,
                        genre.id,
                      ],
                    };
                  });
                }}
                className={`rounded-full border px-4 py-2 text-sm ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 hover:border-blue-500"
                }`}
              >
                {genre.name}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-gray-500">
          {profile.favorite_genres.length}/10 selected
        </p>
      </div>
      
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save profile"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}