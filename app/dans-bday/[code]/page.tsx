import GroupDashboard from './GroupDashboard'

interface Props { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  return { title: `${code.toUpperCase()} — Dan's Birthday Tournament` }
}

export default async function GroupPage({ params }: Props) {
  const { code } = await params
  return <GroupDashboard groupCode={code} />
}
