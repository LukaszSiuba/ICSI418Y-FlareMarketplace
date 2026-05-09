import { createClient } from '@supabase/supabase-js'
//Supa credentials, no .env
const supabaseUrl = 'https://nqlnuefdwyilhlkgrtvy.supabase.co/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbG51ZWZkd3lpbGhsa2dydHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjE4NzgsImV4cCI6MjA4NTE5Nzg3OH0.urPSvk0UP0IBTDwLbZyMe7Ch5gViFvepUMnxUBe_gso'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
