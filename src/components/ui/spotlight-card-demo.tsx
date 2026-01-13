import { GlowCard } from "@/components/ui/spotlight-card";

export function SpotlightCardDemo(){
  return(
    <div className="w-screen h-screen flex flex-row items-center justify-center gap-10 bg-black">
      <GlowCard glowColor="green">
        <div className="text-white p-4">
          <h3 className="text-lg font-bold">Card 1</h3>
          <p className="text-sm opacity-70">Sample content</p>
        </div>
      </GlowCard>
      <GlowCard glowColor="blue">
        <div className="text-white p-4">
          <h3 className="text-lg font-bold">Card 2</h3>
          <p className="text-sm opacity-70">Sample content</p>
        </div>
      </GlowCard>
      <GlowCard glowColor="green">
        <div className="text-white p-4">
          <h3 className="text-lg font-bold">Card 3</h3>
          <p className="text-sm opacity-70">Sample content</p>
        </div>
      </GlowCard>
    </div>
  );
};
