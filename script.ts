import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
const lines = envFile.split('\n');
const supabaseUrl = lines.find(l => l.startsWith('VITE_SUPABASE_URL='))?.split('=')[1].trim() || '';
const supabaseAnonKey = lines.find(l => l.startsWith('VITE_SUPABASE_ANON_KEY='))?.split('=')[1].trim() || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: workspaces, error: wErr } = await supabase.from('workspaces').select('*');
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  const { data: members, error: mErr } = await supabase.from('workspace_members').select('*');
    
  console.log('Workspaces:', workspaces?.length);
  console.log('Users:', users?.length);
  console.log('Members:', members?.length);
  console.log('Member Error:', mErr);
}

check();
