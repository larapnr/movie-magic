import { useQuery } from "@tanstack/react-query";
import MediaRow from "../components/MediaRow";
import { getTrending, getPopular, getUpcoming } from "../api/client";

export default function Home() {
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => getTrending("week") });
  const popularTv = useQuery({ queryKey: ["popular", "tv"], queryFn: () => getPopular("tv") });
  const upcoming = useQuery({ queryKey: ["upcoming"], queryFn: getUpcoming });

  if (trending.isError) return <p className="text-red-400">Could not load titles. Is the backend running?</p>;

  return (
    <>
      <MediaRow title="Trending this week" items={trending.data?.results} />
      <MediaRow title="Popular shows" items={popularTv.data?.results} mediaType="tv" />
      <MediaRow title="Upcoming movies" items={upcoming.data?.results} mediaType="movie" />
    </>
  );
}
