'use client'

import dynamic from 'next/dynamic'

// Browser-only (localStorage, geolocation) — skip SSR. `ssr: false` must live in a Client Component.
const MyBagClient = dynamic(() => import('./MyBagClient'), { ssr: false })

export default MyBagClient
