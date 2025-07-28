import { ShopifyAIChat } from "@/components/ui/v0-ai-chat"

export function ShopifyAIChatDemo() {
    const handleSendMessage = (message: string) => {
        console.log("Message sent:", message);
        // Handle message sending logic here
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            <ShopifyAIChat onSendMessage={handleSendMessage} />
        </div>
    );
}
