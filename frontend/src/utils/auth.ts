import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

export const authStateFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId, sessionClaims } = await auth()

  if (!isAuthenticated) {
    throw redirect({
      to: '/sign-in/$',
    })
  }
  const role = sessionClaims.metadata.role;

  return { userId, role }
})
