import { prisma } from '@/lib/prisma'
import dynamic from 'next/dynamic'

const MyBagClient = dynamic(() => import('./MyBagClient'), { ssr: false })

export default async function MyBagPage() {
  const members = await prisma.member.findMany({
    where:   { is_active: true },
    select:  { id: true, full_name: true },
    orderBy: { full_name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎒 My Bag</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Save your club distances — the rangefinder will recommend a club when you drop a pin.
        </p>
      </div>
      <MyBagClient members={members} />
    </div>
  )
}
