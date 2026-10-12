import EntryDetail from "@/components/EntryDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryDetail id={id} />;
}
