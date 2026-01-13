"use client";
type Props = {
  onAction: (prompt: string) => void;
};

const actions = [
  { label: "Create Product", prompt: "Create a product named 'Black Anchor Tee' price 25 USD. Show preview only." },
  { label: "Manage Orders", prompt: "List today's orders and flag any that need attention." },
  { label: "Inventory", prompt: "Check low-stock products under 5 units and suggest restock quantities." },
  { label: "Upload Image", prompt: "I will upload an image next; prepare to generate product details from the image." },
];

export default function QuickActionsBar({ onAction }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(a => (
        <button
          key={a.label}
          onClick={() => onAction(a.prompt)}
          className="cf-chip px-3 py-2 text-sm hover:border-[#5BBF46] hover:text-[#5BBF46] transition text-slate-700"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
