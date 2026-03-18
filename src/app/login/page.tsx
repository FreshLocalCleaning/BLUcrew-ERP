import { Zap } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-xl">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">BLU Crew</h1>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Commercial ERP
            </p>
          </div>
        </div>

        {/* Entra SSO button placeholder */}
        <div className="space-y-4">
          <button className="flex w-full items-center justify-center gap-3 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Sign in with Microsoft
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Authentication via Microsoft Entra (Azure AD) SSO.
            <br />
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}
