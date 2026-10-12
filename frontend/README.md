# Frontend

The frontend is the website people see and interact with.

## Planned technology
React with JavaScript, HTML, and CSS.

## Pages
- Home: trending content, popular shows, and upcoming movies.
- Search: title search, filters, and result cards.
- Title details: summary, cast, crew, trailer, ratings, and reviews.
- Sign-up and sign-in.
- Profile: favorites and the user's reviews.

## Ratings and reviews
- Signed-in users can rate a title from 1 to 5 stars.
- Review text is optional.
- Each user can have one review/rating per title.
- Users can edit or delete their own reviews.
- Everyone can read published reviews.
- Label TMDb ratings and our community ratings separately.

## Connecting to the backend
- Request movie data from our backend.
- Use the agreed JSON formats in docs/README.md.
- Use sample JSON while backend features are unfinished.
- Handle loading, empty results, and errors.
- Use Firebase Authentication for sign-up and sign-in.

## Favorites
Signed-in users can add and remove favorite movies and TV shows.

## Optional Scene Finder
Add a text search box to a title's detail page.
Show the matching trailer timestamp and play that moment.

## Testing
Check search, filters, detail pages, login, reviews, and favorites.
Check that saved information remains after reloading.
Check the layout on desktop and mobile.