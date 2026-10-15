import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isAdmin as isLeagueAdmin } from '@/lib/auth'
import { currentUser } from '@/lib/polydan/auth'
import Link from 'next/link'
import { AccessForms, SetupForm } from './LoginForm'

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function LoginPage(props: PageProps<'/polydan/login'>) {
  return (
    <Suspense fallback={<Loading />}>
      <LoginPageContent {...props} />
    </Suspense>
  )
}

async function LoginPageContent({ searchParams }: PageProps<'/polydan/login'>) {
  const sp = await searchParams
  const me = await currentUser()
  // ?switch: someone else picks up a shared phone and logs in over the top.
  const switching = sp.switch != null && me != null
  if (me && !switching) redirect('/polydan')
  const users = await prisma.pdUser.findMany({ select: { name: true }, orderBy: { name: 'asc' } })
  return (
    <div className="mx-auto mt-[12vh] max-w-sm">
      <div className="mb-8 text-center">
        <p className="pd-eyebrow">⚜ Iron Man ⚜</p>
        <h1 className="mt-1 font-pd-display text-5xl font-bold uppercase tracking-wide text-pd-gold">PolyDan</h1>
        <p className="mt-2 text-sm text-pd-muted">The family market for the last one standing.</p>
      </div>
      {switching && (
        <p className="mb-3 rounded-lg bg-pd-surface-2 p-3 text-center text-sm">
          You&apos;re logged in as <span className="font-semibold">{me.name}</span>. Pick who&apos;s using this phone.{' '}
          <Link href="/polydan" className="text-pd-gold underline">
            Cancel
          </Link>
        </p>
      )}
      {users.length > 0 ? (
        <AccessForms names={users.map((u) => u.name)} startOnJoin={sp.join != null} />
      ) : (await isLeagueAdmin()) ? (
        <SetupForm />
      ) : (
        <p className="pd-card p-5 text-center text-sm text-pd-muted">
          PolyDan isn&apos;t set up yet. Matt: log in to the{' '}
          <a href="/admin" className="text-pd-gold underline">
            SSL admin page
          </a>{' '}
          first, then come back here.
        </p>
      )}
    </div>
  )
}
