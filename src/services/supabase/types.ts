/**
 * Database types for the Anonym schema.
 * Hand-written to match supabase/migrations.
 */

export type AccountType = "regular" | "startup";
export type CampaignStatus = "draft" | "active" | "ended" | "completed";
export type CampaignVisibility = "public" | "private";
export type NotificationType =
  | "donation_received"
  | "campaign_completed"
  | "transfer_received"
  | "goal_reached"
  | "private_view_unlocked";

export type TeamMemberJson = {
  name: string;
  role: string;
  avatar_url?: string | null;
  social_url?: string | null;
};

export type ProtectedStatus =
  | "pending"
  | "claimable"
  | "claimed"
  | "withdrawn"
  | "cancelled";

export type ProtectedKind = "transfer" | "donation" | "campaign_withdraw";

type Timestamp = string;
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: TableDef<
        {
          id: string;
          wallet_address: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          cover_image: string | null;
          account_type: AccountType;
          monad_receiving_address: string | null;
          country: string | null;
          website: string | null;
          created_at: Timestamp;
        },
        {
          id?: string;
          wallet_address: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          cover_image?: string | null;
          account_type?: AccountType;
          monad_receiving_address?: string | null;
          country?: string | null;
          website?: string | null;
          created_at?: Timestamp;
        }
      >;
      startups: TableDef<
        {
          id: string;
          user_id: string;
          startup_name: string;
          logo: string | null;
          description: string | null;
          mission: string | null;
          category: string | null;
          website: string | null;
          whitepaper_url: string | null;
          pitch_deck_url: string | null;
          team_members: TeamMemberJson[];
          created_at: Timestamp;
        },
        {
          id?: string;
          user_id: string;
          startup_name: string;
          logo?: string | null;
          description?: string | null;
          mission?: string | null;
          category?: string | null;
          website?: string | null;
          whitepaper_url?: string | null;
          pitch_deck_url?: string | null;
          team_members?: TeamMemberJson[];
          created_at?: Timestamp;
        }
      >;
      socials: TableDef<
        {
          id: string;
          user_id: string;
          platform: string;
          url: string;
        },
        {
          id?: string;
          user_id: string;
          platform: string;
          url: string;
        }
      >;
      campaigns: TableDef<
        {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          reason: string | null;
          category: string | null;
          goal_amount: number;
          amount_raised: number;
          deadline: Timestamp | null;
          monad_receiving_address: string | null;
          banner_image: string | null;
          featured_image: string | null;
          status: CampaignStatus;
          visibility: CampaignVisibility;
          vault_address: string | null;
          protocol_mode: boolean;
          created_at: Timestamp;
        },
        {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          reason?: string | null;
          category?: string | null;
          goal_amount: number;
          amount_raised?: number;
          deadline?: Timestamp | null;
          monad_receiving_address?: string | null;
          banner_image?: string | null;
          featured_image?: string | null;
          status?: CampaignStatus;
          visibility?: CampaignVisibility;
          vault_address?: string | null;
          protocol_mode?: boolean;
          created_at?: Timestamp;
        }
      >;
      donations: TableDef<
        {
          id: string;
          campaign_id: string;
          sender_wallet: string | null;
          recipient_wallet: string | null;
          amount: number;
          message: string | null;
          anonymous: boolean;
          tx_hash: string | null;
          created_at: Timestamp;
        },
        {
          id?: string;
          campaign_id: string;
          sender_wallet?: string | null;
          recipient_wallet?: string | null;
          amount: number;
          message?: string | null;
          anonymous?: boolean;
          tx_hash?: string | null;
          created_at?: Timestamp;
        }
      >;
      transfers: TableDef<
        {
          id: string;
          sender_wallet: string;
          receiver_wallet: string;
          amount: number;
          token: string;
          note: string | null;
          tx_hash: string | null;
          created_at: Timestamp;
        },
        {
          id?: string;
          sender_wallet: string;
          receiver_wallet: string;
          amount: number;
          token?: string;
          note?: string | null;
          tx_hash?: string | null;
          created_at?: Timestamp;
        }
      >;
      notifications: TableDef<
        {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          read: boolean;
          created_at: Timestamp;
        },
        {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body?: string | null;
          read?: boolean;
          created_at?: Timestamp;
        }
      >;
      private_views: TableDef<
        {
          id: string;
          wallet: string;
          tx_hash: string | null;
          unlocked_at: Timestamp;
          expires_at: Timestamp | null;
        },
        {
          id?: string;
          wallet: string;
          tx_hash?: string | null;
          unlocked_at?: Timestamp;
          expires_at?: Timestamp | null;
        }
      >;
      auth_nonces: TableDef<
        {
          address: string;
          nonce: string;
          expires_at: Timestamp;
          created_at: Timestamp;
        },
        {
          address: string;
          nonce: string;
          expires_at: Timestamp;
          created_at?: Timestamp;
        }
      >;
      commitments: TableDef<
        {
          id: string;
          commitment_hash: string;
          nullifier_placeholder: string | null;
          vault_address: string | null;
          amount: number;
          token: string;
          status: ProtectedStatus;
          created_at: Timestamp;
        },
        {
          id?: string;
          commitment_hash: string;
          nullifier_placeholder?: string | null;
          vault_address?: string | null;
          amount: number;
          token?: string;
          status?: ProtectedStatus;
          created_at?: Timestamp;
        }
      >;
      protected_deposits: TableDef<
        {
          id: string;
          kind: ProtectedKind;
          commitment_id: string | null;
          commitment_hash: string;
          salt: string;
          vault_address: string | null;
          on_chain_deposit_id: string | null;
          tx_hash: string | null;
          claim_tx_hash: string | null;
          campaign_id: string | null;
          sender_user_id: string | null;
          sender_wallet: string | null;
          recipient_user_id: string | null;
          recipient_wallet: string;
          anonymous: boolean;
          amount: number;
          token: string;
          message: string | null;
          status: ProtectedStatus;
          created_at: Timestamp;
          claimed_at: Timestamp | null;
          unlock_at: Timestamp | null;
          condition_type: string | null;
          condition_payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
          split_group_id: string | null;
          parent_request_id: string | null;
          claim_token: string | null;
        },
        {
          id?: string;
          kind: ProtectedKind;
          commitment_id?: string | null;
          commitment_hash: string;
          salt: string;
          vault_address?: string | null;
          on_chain_deposit_id?: string | null;
          tx_hash?: string | null;
          claim_tx_hash?: string | null;
          campaign_id?: string | null;
          sender_user_id?: string | null;
          sender_wallet?: string | null;
          recipient_user_id?: string | null;
          recipient_wallet: string;
          anonymous?: boolean;
          amount: number;
          token?: string;
          message?: string | null;
          status?: ProtectedStatus;
          created_at?: Timestamp;
          claimed_at?: Timestamp | null;
          unlock_at?: Timestamp | null;
          condition_type?: string | null;
          condition_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          split_group_id?: string | null;
          parent_request_id?: string | null;
          claim_token?: string | null;
        }
      >;
      payment_requests: TableDef<
        {
          id: string;
          requester_user_id: string | null;
          requester_wallet: string;
          requester_username: string | null;
          payer_user_id: string | null;
          payer_wallet: string | null;
          payer_username: string | null;
          amount: number;
          token: string;
          message: string | null;
          metadata: Record<string, unknown>;
          status: string;
          deposit_id: string | null;
          expires_at: Timestamp | null;
          created_at: Timestamp;
          paid_at: Timestamp | null;
        },
        {
          id?: string;
          requester_user_id?: string | null;
          requester_wallet: string;
          requester_username?: string | null;
          payer_user_id?: string | null;
          payer_wallet?: string | null;
          payer_username?: string | null;
          amount: number;
          token?: string;
          message?: string | null;
          metadata?: Record<string, unknown>;
          status?: string;
          deposit_id?: string | null;
          expires_at?: Timestamp | null;
          created_at?: Timestamp;
          paid_at?: Timestamp | null;
        }
      >;
      recurring_sends: TableDef<
        {
          id: string;
          sender_user_id: string | null;
          sender_wallet: string;
          recipient_wallet: string;
          recipient_user_id: string | null;
          recipient_username: string | null;
          amount: number;
          token: string;
          interval_days: number;
          next_run_at: Timestamp;
          active: boolean;
          message: string | null;
          metadata: Record<string, unknown>;
          last_deposit_id: string | null;
          created_at: Timestamp;
        },
        {
          id?: string;
          sender_user_id?: string | null;
          sender_wallet: string;
          recipient_wallet: string;
          recipient_user_id?: string | null;
          recipient_username?: string | null;
          amount: number;
          token?: string;
          interval_days?: number;
          next_run_at?: Timestamp;
          active?: boolean;
          message?: string | null;
          metadata?: Record<string, unknown>;
          last_deposit_id?: string | null;
          created_at?: Timestamp;
        }
      >;
      campaign_vaults: TableDef<
        {
          id: string;
          campaign_id: string;
          vault_address: string;
          owner_wallet: string;
          created_tx_hash: string | null;
          created_at: Timestamp;
        },
        {
          id?: string;
          campaign_id: string;
          vault_address: string;
          owner_wallet: string;
          created_tx_hash?: string | null;
          created_at?: Timestamp;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_wallet: {
        Args: Record<string, never>;
        Returns: string;
      };
      close_expired_campaigns: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      notify_user: {
        Args: {
          p_user_id: string;
          p_type: NotificationType;
          p_title: string;
          p_body?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_type: AccountType;
      campaign_status: CampaignStatus;
      campaign_visibility: CampaignVisibility;
      notification_type: NotificationType;
      protected_status: ProtectedStatus;
      protected_kind: ProtectedKind;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
