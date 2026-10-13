// Every PolyDan page reads the database and the login cookie per request.
// This boundary (applied to each page segment under /polydan) lets in-app
// navigation show a placeholder instantly while that data streams in.
export default function Loading() {
  return <p className="py-16 text-center text-sm text-pd-muted">Loading…</p>
}
