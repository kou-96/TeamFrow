export type TaskStatus = "todo" | "in_progress" | "done";
export type WorkspaceRole = "owner" | "admin" | "member";
export type NotificationType = "mentioned" | "assigned" | "commented";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          theme: "light" | "dark" | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          theme?: "light" | "dark" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          theme?: "light" | "dark" | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string; created_at?: string };
        Update: { id?: string; name?: string; slug?: string; created_at?: string };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          joined_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string | null;
          role: WorkspaceRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email?: string | null;
          role?: WorkspaceRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string | null;
          role?: WorkspaceRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          position: number;
          assignee_id: string | null;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          position?: number;
          assignee_id?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          position?: number;
          assignee_id?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      labels: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      task_labels: {
        Row: {
          task_id: string;
          label_id: string;
        };
        Insert: {
          task_id: string;
          label_id: string;
        };
        Update: {
          task_id?: string;
          label_id?: string;
        };
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          workspace_id: string | null;
          task_id: string | null;
          comment_id: string | null;
          actor_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          workspace_id?: string | null;
          task_id?: string | null;
          comment_id?: string | null;
          actor_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          workspace_id?: string | null;
          task_id?: string | null;
          comment_id?: string | null;
          actor_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      invitation_info: {
        Args: { _token: string };
        Returns: {
          workspace_id: string;
          workspace_name: string;
          workspace_slug: string;
          role: WorkspaceRole;
          expires_at: string;
          accepted_at: string | null;
        }[];
      };
      accept_invitation: {
        Args: { _token: string };
        Returns: { workspace_slug: string }[];
      };
      create_workspace_for_user: {
        Args: { _name: string };
        Returns: { workspace_id: string; workspace_slug: string }[];
      };
      is_workspace_member: {
        Args: { _workspace: string };
        Returns: boolean;
      };
      is_workspace_admin: {
        Args: { _workspace: string };
        Returns: boolean;
      };
      workspace_role_of: {
        Args: { _workspace: string };
        Returns: WorkspaceRole;
      };
    };
    Enums: {
      task_status: TaskStatus;
      workspace_role: WorkspaceRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
