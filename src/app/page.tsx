import CommandCenter from "@/components/CommandCenter";

// Never statically prerender — requires Supabase auth at runtime
export const dynamic = "force-dynamic";

export default function Home() {
  return <CommandCenter />;
}
