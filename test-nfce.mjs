import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hhzvjsrsoyhjzeiuxpep.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0');

async function test() {
  console.log('Testando status SEFAZ...');
  const { data, error } = await supabase.functions.invoke('nota-fiscal', {
    body: { acao: 'status_sefaz' }
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
