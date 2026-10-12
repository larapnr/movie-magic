# Project Plan and Data Formats

## Timeline
- Weeks 1–2: explore TMDb, set up GitHub and Firebase,
  plan the database and agree on JSON formats.
- Week 3: build and test backend search and filters.
- Week 4: demonstrate backend search and movie details.
- Weeks 5–6: build the frontend, connect it, and add login and reviews.
- Week 7: finish ratings, reviews, and favorites; test complete flows.
- Week 8: deploy, test, and prepare a backup demo recording.
- Week 9: final presentation.

Scene Finder is optional after the core features work.

## Proposed responsibilities
Add each person's name before starting.

- Member 1: TMDb integration and backend search.
- Member 2: search interface and browsing sections.
- Member 3: title detail page and rating/review form.
- Member 4: Firebase login and saved user data.
- Member 5: integration, deployment, and optional Scene Finder.

Before frontend development, members can help explore endpoints,
plan pages, document formats, and test the backend.

## Shared data rules
- Exchange data as JSON.
- Use the same field names in frontend and backend.
- mediaType must be "movie" or "tv".
- Always identify a title using both its ID and mediaType.
- Use YYYY-MM-DD for release dates.
- Use null for missing values.
- User ratings are whole numbers from 1 to 5.
- Agree on format changes before implementing them.

## Example search response
Illustrative data only.

```json
{
  "page": 1,
  "totalPages": 1,
  "results": [
    {
      "id": 123,
      "mediaType": "movie",
      "title": "Example Movie",
      "releaseDate": "2020-07-16",
      "posterUrl": null,
      "tmdbRating": 8.2
    }
  ]
}
```

## Example title details
Illustrative data only.

```json
{
  "id": 123,
  "mediaType": "movie",
  "title": "Example Movie",
  "releaseDate": "2020-07-16",
  "genres": ["Action", "Drama"],
  "overview": "Example summary.",
  "posterUrl": null,
  "tmdbRating": 8.2,
  "communityRating": null,
  "communityRatingCount": 0,
  "cast": [],
  "crew": [],
  "trailerKey": null
}
```

## Example rating/review submission

```json
{
  "titleId": 123,
  "mediaType": "movie",
  "rating": 4,
  "reviewText": "Great story and visuals."
}
```

The verified login determines the author.
The storage layer adds the creation timestamp.
An empty reviewText is allowed for a rating without a written review.

## Saved information
- Profiles: Firebase user ID and display name.
- Favorites: user ID, title ID, media type.
- Reviews: user ID, title ID, media type, rating, text, timestamps.
- Optional saved moments: title ID, media type, trailer key,
  start/end seconds, query, and description.

Only the owner can change their profile, favorites, and reviews.
Published reviews are readable by others.

## Shared testing checklist
- Search finds movies and TV shows.
- Genre and date filters work.
- Detail pages display the correct title.
- Missing posters or trailers do not break the page.
- Sign-up, sign-in, and sign-out work.
- Ratings and reviews save and remain after reloading.
- Users cannot edit another person's review.
- Favorites can be added and removed.
- The deployed website works on another person's computer.