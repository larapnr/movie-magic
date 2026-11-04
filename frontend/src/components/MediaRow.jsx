import MediaCard from "./MediaCard";

export default function MediaRow({ title, items = [], mediaType }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {items.slice(0, 12).map((item) => (
          <MediaCard key={item.id} item={item} mediaType={mediaType} />
        ))}
      </div>
    </section>
  );
}
