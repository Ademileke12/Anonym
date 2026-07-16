import type { Database, TeamMemberJson } from "@/services/supabase/types";

export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type Startup = Database["public"]["Tables"]["startups"]["Row"];
export type TeamMember = TeamMemberJson;
export type Social = Database["public"]["Tables"]["socials"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
export type Donation = Database["public"]["Tables"]["donations"]["Row"];
export type Transfer = Database["public"]["Tables"]["transfers"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type PrivateView = Database["public"]["Tables"]["private_views"]["Row"];
