// Re-mounts on every route change, giving each page a subtle entry transition.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
