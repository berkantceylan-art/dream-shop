import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env. yettfpgrxhqvrwgsmyqe|| '';
const supabaseAnonKey = process.env. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldHRmcGdyeGhxdnJ3Z3NteXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDg2NDUsImV4cCI6MjEwNTQ4NDY0NX0.FoOSzG7mR8mkbRTUX4NFxKsgX249MGf9xOUYDkvx5y8|| '';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
