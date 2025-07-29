import { PropsWithChildren } from 'react'
import { AuthDialog } from '@/modules/auth/components/auth-dialog'
import { SupabaseClient } from '@supabase/supabase-js'

interface PageContainerProps extends PropsWithChildren {
  showAuthDialog: boolean
  onAuthDialogChange: (open: boolean) => void
  authView: 'sign_in' | 'sign_up'
  supabase: SupabaseClient | null
}

export function PageContainer({
  children,
  showAuthDialog,
  onAuthDialogChange,
  authView,
  supabase
}: PageContainerProps) {
  return (
    <>
      {supabase && (
        <AuthDialog
          open={showAuthDialog}
          setOpen={onAuthDialogChange}
          view={authView}
          supabase={supabase}
        />
      )}
      {children}
    </>
  )
}