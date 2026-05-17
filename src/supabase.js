// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// Grab these credentials from your Supabase Dashboard -> Settings (Gear Icon) -> API
const SUPABASE_URL = 'https://crozojqctwkhbelwfxdl.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_lPLcgZSyR2UOPN2LHn-APw_Y0JV6VbM'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

