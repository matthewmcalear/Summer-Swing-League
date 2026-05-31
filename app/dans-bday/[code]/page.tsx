import GroupDashboard from './GroupDashboard'

interface Props { params: { code: string } }

export function generateMetadata({ params }: Props) {
  return { title: `${params.code.toUpperCase()} — Dan's Birthday Tournament` }
}

export default function GroupPage({ params }: Props) {
  return <GroupDashboard groupCode={params.code} />
}
