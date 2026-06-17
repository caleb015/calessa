import RsvpEntryPage from '@/components/public/RsvpEntryPage';

export default async function RsvpPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <RsvpEntryPage initialCode={code ?? ''} />;
}
