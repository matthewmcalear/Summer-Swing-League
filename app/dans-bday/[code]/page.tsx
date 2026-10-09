import GroupDashboard from './GroupDashboard'

interface Props { params: Promise<{ code: string }> }

// Archived event sub-app keyed by a group code: render on request (no static shell)
// rather than streaming the site-wide nav behind Suspense on every page.
export const instant = false

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  return { title: `${code.toUpperCase()} — Dan's Birthday Tournament` }
}

export default async function GroupPage({ params }: Props) {
  const { code } = await params
  return <GroupDashboard groupCode={code} />
}
