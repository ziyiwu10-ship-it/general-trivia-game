import PixelHeading from "@/components/ui/PixelHeading";
import JoinCreateForm from "@/components/JoinCreateForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <PixelHeading color="pink">Trivia Battle Royale</PixelHeading>
        <p className="mt-3 font-terminal text-xl text-neon-purple">
          Real-time trivia for you and your crew.
        </p>
      </div>
      <JoinCreateForm />
    </main>
  );
}
