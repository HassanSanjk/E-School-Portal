// admin-reset-pin
//
// Admin-only. Resets any user's login PIN (Supabase Auth password) by their
// login_id. This must run server-side with elevated privileges — a client
// can never reset another user's password directly, by design.
//
// Auth model (two independent checks, not just one):
//   1. Platform-level: this function is deployed with verify_jwt = true, so
//      Supabase rejects any request without a valid session JWT before this
//      code even runs. Confirms "is a real logged-in user."
//   2. In code below: the caller's own profiles.role must be 'admin'.
//      verify_jwt only proves *a* session is valid — it says nothing about
//      role, so this check is required on every call, not optional.
//
// Key choice, worth being explicit about: the caller-identity client below
// uses the modern SUPABASE_PUBLISHABLE_KEYS. The elevated admin client
// deliberately uses the legacy SUPABASE_SERVICE_ROLE_KEY instead of the new
// SUPABASE_SECRET_KEYS, specifically because auth.admin.updateUserById (the
// exact call this function makes) has an open, unresolved upstream issue as
// of Sep 2026 where the new secret-key format intermittently fails Admin
// API calls with "bad_jwt: unrecognized JWT kid" at a meaningful failure
// rate. service_role remains fully supported through end of 2026 per
// Supabase's own migration guide. This is not something to build a
// can-lock-someone-out-of-their-account path on. Revisit this once that
// upstream issue is confirmed resolved.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PUBLISHABLE_KEY = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')!)['default']

// Safe sanity check (lengths only, never the actual secret values) so a
// missing/empty env var shows up clearly in logs instead of masquerading
// as a confusing downstream auth failure.
console.log(
  'admin-reset-pin boot: SUPABASE_URL set:', !!SUPABASE_URL,
  '| SERVICE_ROLE_KEY length:', SERVICE_ROLE_KEY?.length ?? 0,
  '| PUBLISHABLE_KEY length:', PUBLISHABLE_KEY?.length ?? 0,
)

const MIN_PIN_LENGTH = 6

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      // Shouldn't be reachable with verify_jwt = true, but never trust that
      // alone — check explicitly regardless.
      return json({ error: 'Missing Authorization header' }, 401)
    }

    // Scoped to the CALLER's own session — used only to confirm identity.
    // Never used for the actual password update.
    const callerClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    // Elevated client — only reached after the caller's identity is
    // confirmed above, and only used for the two admin-only operations
    // below (role check, then the actual password update).
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfileError) {
      console.error(
        'admin-reset-pin: role-check query failed for caller',
        user.id,
        JSON.stringify(callerProfileError),
      )
      return json({ error: 'Forbidden: could not verify admin role' }, 403)
    }
    if (callerProfile?.role !== 'admin') {
      console.error(
        'admin-reset-pin: caller is not admin, role was:',
        callerProfile?.role ?? '(no profile row)',
      )
      return json({ error: 'Forbidden: admin role required' }, 403)
    }

    const body = await req.json().catch(() => null)
    const loginId = typeof body?.loginId === 'string' ? body.loginId.trim() : ''
    const newPin = typeof body?.newPin === 'string' ? body.newPin : ''

    if (!loginId) {
      return json({ error: 'loginId is required' }, 400)
    }
    if (newPin.length < MIN_PIN_LENGTH) {
      return json({ error: `newPin must be at least ${MIN_PIN_LENGTH} characters` }, 400)
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, login_id, full_name, role')
      .eq('login_id', loginId)
      .maybeSingle()

    if (targetError) {
      console.error('admin-reset-pin: target lookup failed', targetError)
      return json({ error: 'Lookup failed' }, 500)
    }
    if (!targetProfile) {
      return json({ error: 'No user found with that login ID' }, 404)
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetProfile.id,
      { password: newPin },
    )

    if (updateError) {
      console.error('admin-reset-pin: updateUserById failed', updateError)
      return json({ error: updateError.message }, 500)
    }

    return json({
      success: true,
      resetFor: {
        loginId: targetProfile.login_id,
        fullName: targetProfile.full_name,
        role: targetProfile.role,
      },
    })
  } catch (e) {
    console.error('admin-reset-pin: unexpected error', e)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
