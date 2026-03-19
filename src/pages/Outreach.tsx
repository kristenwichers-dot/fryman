import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MessageCircle } from "lucide-react";
import CallVotersTab from "@/components/outreach/CallVotersTab";
import TextCampaignsTab from "@/components/outreach/TextCampaignsTab";

export default function Outreach() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Phone className="h-6 w-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold">Voter Outreach</h1>
      </div>

      <Tabs defaultValue="calls" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Voters
          </TabsTrigger>
          <TabsTrigger value="texting" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Text Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls">
          <CallVotersTab />
        </TabsContent>

        <TabsContent value="texting">
          <TextCampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
