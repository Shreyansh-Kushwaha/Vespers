import { Footnote } from "@/components/marketing/Footnote";
import { MovementAnatomy } from "@/components/marketing/MovementAnatomy";
import { MovementClose } from "@/components/marketing/MovementClose";
import { MovementCompanion } from "@/components/marketing/MovementCompanion";
import { MovementIndex } from "@/components/marketing/MovementIndex";
import { MovementLetter } from "@/components/marketing/MovementLetter";
import { MovementOpen } from "@/components/marketing/MovementOpen";
import { MovementPractice } from "@/components/marketing/MovementPractice";
import { MovementUnsigned } from "@/components/marketing/MovementUnsigned";
import { MovementWhisper } from "@/components/marketing/MovementWhisper";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { SmoothScroll } from "@/components/marketing/SmoothScroll";

export default function LandingPage() {
  return (
    <main className="relative bg-paper text-ink overflow-x-hidden">
      <PaperSurface />
      <SmoothScroll />

      <MovementOpen />
      <MovementWhisper />
      <MovementLetter />
      <MovementAnatomy />
      <MovementCompanion />
      <MovementIndex />
      <MovementPractice />
      <MovementUnsigned />
      <MovementClose />
      <Footnote />
    </main>
  );
}
